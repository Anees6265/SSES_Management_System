require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const helmet = require("helmet");
const setupSwagger = require("./src/swagger/swagger");

const app = express();

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
  "https://iteg.ssism.org",
  "https://iteg-management-system.vercel.app",
  "https://iteg-management-system-nth9.vercel.app",
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

const allowedOriginsSet = new Set([...defaultAllowedOrigins, ...envOrigins, ...clientOrigins]);

const isAllowedOrigin = (origin) => {
  if (!origin) return true; // Allow non-browser agents, tools, or mobile requests
  if (allowedOriginsSet.has(origin)) return true;
  if (/^https:\/\/iteg-management-system.*\.vercel\.app$/.test(origin)) return true;
  if (/^https:\/\/.*\.ssism\.org$/.test(origin)) return true;
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
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Import Routes
const routes = require("./src/routes");
const departmentRoutes = require("./src/routes/departmentRoutes");
const subDepartmentRoutes = require("./src/routes/subDepartmentRoutes");
const levelRoutes = require("./src/routes/levelRoutes");
const subLevelRoutes = require("./src/routes/subLevelRoutes");
const passport = require("./src/config/passport.js");

// Swagger setup
setupSwagger(app);

// Health Check Route
app.get('/api/health-check', (req, res) => {
  res.status(200).send("Backend is alive");
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
  const dns = require('dns');
  dns.setServers(['8.8.8.8', '8.8.4.4']);
  
  const mongoOptions = {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  };

  mongoose
    .connect(process.env.MONGO_URI, mongoOptions)
    .then(async () => {
      console.log("MongoDB Connected Successfully");
      try {
        await mongoose.connection.collection("syllabusversions").dropIndex("sessionId_1_levelId_1_subLevelId_1_version_1");
      } catch (_) {}
    })
    .catch((err) => {
      console.error("MongoDB Connection Error:", err);
      process.exit(1);
    });

  const PORT = parseInt(process.env.PORT, 10) || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      const fallbackPort = PORT + 1;
      console.warn(`Port ${PORT} is in use, falling back to port ${fallbackPort}`);
      app.listen(fallbackPort, () => {
        console.log(`Server running on fallback port ${fallbackPort}`);
      });
    }
  });
}

