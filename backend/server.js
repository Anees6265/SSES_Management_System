require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const setupSwagger = require("./src/swagger/swagger");

const app = express();

// CORS configuration
app.use(cors({
  origin: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}));

app.options("*", cors());

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
// Update Google users role function
const updateGoogleUsersRole = async () => {
  try {
    const User = require("./src/models/user/user");
    await User.updateMany(
      { googleId: { $exists: true } },
      { $set: { role: "superadmin" } }
    );
  } catch (_) {}
};

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
      await updateGoogleUsersRole();
    })
    .catch((err) => {
      console.error("MongoDB Connection Error:", err);
      process.exit(1);
    });

  const PORT = process.env.PORT || 5000;
  app.listen(PORT)
    .on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        app.listen(PORT + 1);
      }
    });
}

