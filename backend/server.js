require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const helmet = require("helmet");
const setupSwagger = require("./src/swagger/swagger");

const app = express();

// Trust reverse proxies (Nginx, AWS ALB, Cloudflare, Render, etc.) to accurately detect client IP (1 hop)
app.set("trust proxy", 1);

// Security HTTP headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false,
  })
);

// Whitelist of allowed origins for secure CORS
const defaultAllowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  "http://localhost:5000",
  "http://localhost:5001",
  "https://sp-central.ssism.org",
  "http://sp-central.ssism.org",
  "https://iteg.ssism.org",
  "https://iteg-management-system.vercel.app",
  "https://iteg-management-system-nth9.vercel.app",
  "https://sses-management-system.vercel.app",
];

const envOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map(u => u.trim().replace(/\/api\/?$/, ""))
  .filter(Boolean);

const clientOrigins = (process.env.CLIENT_BASE_URL || "")
  .split(",")
  .map(u => {
    try {
      return new URL(u.trim()).origin;
    } catch {
      return u.trim();
    }
  })
  .filter(Boolean);

const extraOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map(u => u.trim().replace(/\/api\/?$/, ""))
  .filter(Boolean);

const allowedOriginsSet = new Set([
  ...defaultAllowedOrigins,
  ...envOrigins,
  ...clientOrigins,
  ...extraOrigins
]);

const isAllowedOrigin = (origin) => {
  if (!origin) return true; // Allow non-browser agents, tools, curl, mobile, or same-origin requests
  if (process.env.CORS_ALLOW_ALL === "true") return true;
  if (allowedOriginsSet.has(origin)) return true;
  if (/^https?:\/\/iteg-management-system.*\.vercel\.app$/.test(origin)) return true;
  if (/^https?:\/\/sses-management-system.*\.vercel\.app$/.test(origin)) return true;
  if (/^https?:\/\/.*\.ssism\.org(:[0-9]+)?$/.test(origin)) return true;
  if (/^https?:\/\/.*\.elb\.amazonaws\.com(:[0-9]+)?$/.test(origin)) return true;
  if (/^https?:\/\/.*\.compute\.amazonaws\.com(:[0-9]+)?$/.test(origin)) return true;
  // Match direct IP addresses (e.g. EC2 public IP http://1.2.3.4 or http://1.2.3.4:5002)
  if (/^https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:[0-9]+)?$/.test(origin)) return true;
  return false;
};

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked for unauthorized origin: ${origin}`));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "X-Client-Public-IP"]
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// SSES Security Shield & Activity Watchdog Middleware
const securityWatchdogMiddleware = require("./src/middlewares/securityWatchdogMiddleware");
app.use(securityWatchdogMiddleware);


// Import Routes
const routes = require("./src/routes");
const departmentRoutes = require("./src/routes/departmentRoutes");
const subDepartmentRoutes = require("./src/routes/subDepartmentRoutes");
const levelRoutes = require("./src/routes/levelRoutes");
const subLevelRoutes = require("./src/routes/subLevelRoutes");
const passport = require("./src/config/passport.js");

// Swagger setup
setupSwagger(app);

// Health Check Route (supports root, /health, and /api/health-check for AWS load balancers & container checks)
app.get(['/', '/health', '/api/health-check'], (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Backend is alive',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api', routes);
app.use('/api/departments', departmentRoutes);
app.use('/api/subdepartments', subDepartmentRoutes);
app.use('/api/levels', levelRoutes);
app.use('/api/sublevels', subLevelRoutes);


// Passport initialization
app.use(passport.initialize());

// Error handling middleware
app.use((err, req, res, next) => {
  res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// MongoDB Connection
module.exports = app;

// Start Server only if this is the main module (not when testing)
if (require.main === module) {
  let dnsSwitched = false;
  const tryDnsFallback = () => {
    if (!dnsSwitched) {
      dnsSwitched = true;
      try {
        const dns = require('dns');
        dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
        console.log("Switched DNS resolver to Google/Cloudflare DNS fallback");
      } catch (dnsErr) {
        console.warn("DNS fallback error:", dnsErr.message);
      }
    }
  };

  if (process.env.USE_CUSTOM_DNS === "true") {
    tryDnsFallback();
  }
  
  const mongoOptions = {
    serverSelectionTimeoutMS: 15000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 15000,
    maxPoolSize: 20,
    minPoolSize: 2,
  };

  let isConnecting = false;
  const connectWithRetry = async () => {
    if (isConnecting || mongoose.connection.readyState === 1) return;
    isConnecting = true;
    try {
      await mongoose.connect(process.env.MONGO_URI, mongoOptions);
      console.log("MongoDB Connected Successfully");
      try {
        await mongoose.connection.collection("syllabusversions").dropIndex("sessionId_1_levelId_1_subLevelId_1_version_1");
      } catch (_) {}
      try {
        const { seedInitialNotificationsIfNeeded } = require("./src/services/notificationService");
        seedInitialNotificationsIfNeeded().catch(() => {});
      } catch (_) {}
    } catch (err) {
      console.error("MongoDB Connection Error:", err.message || err);
      if (err.message && (err.message.includes("querySrv") || err.message.includes("ENOTFOUND") || err.message.includes("ETIMEDOUT") || err.message.includes("queryTxt"))) {
        tryDnsFallback();
      }
      console.warn("⚠️  Retrying MongoDB connection in 5 seconds... (App will NOT crash)");
      setTimeout(connectWithRetry, 5000);
    } finally {
      isConnecting = false;
    }
  };

  mongoose.connection.on("disconnected", () => {
    console.warn("MongoDB disconnected. Attempting reconnect...");
    setTimeout(connectWithRetry, 3000);
  });

  connectWithRetry();

  const PORT = parseInt(process.env.PORT, 10) || 5000;
  const HOST = '0.0.0.0';

  const server = app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      const fallbackPort = PORT + 1;
      console.warn(`Port ${PORT} is in use, falling back to port ${fallbackPort}`);
      app.listen(fallbackPort, HOST, () => {
        console.log(`Server running on fallback port ${fallbackPort}`);
      });
    }
  });

  // Graceful shutdown for Docker and AWS container orchestrators (SIGTERM, SIGINT)
  const handleShutdown = (signal) => {
    console.log(`\nReceived ${signal}. Gracefully stopping server...`);
    server.close(async () => {
      console.log('HTTP server closed.');
      try {
        await mongoose.connection.close(false);
        console.log('MongoDB connection closed.');
        process.exit(0);
      } catch (err) {
        console.error('Error closing MongoDB connection:', err);
        process.exit(1);
      }
    });

    setTimeout(() => {
      console.error('Graceful shutdown timeout exceeded. Force quitting.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}

