const express = require('express');
const FaceAuthController = require('../controllers/helper/faceAuthController');
const { verifyToken } = require('../middlewares/authMiddleware');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const faceLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { success: false, message: 'Too many face recognition attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Register face for a user (Requires authentication)
router.post('/register-face', verifyToken, FaceAuthController.registerFace);

// Login with face recognition (Protected by rate limiter)
router.post('/login-face', faceLoginLimiter, FaceAuthController.loginWithFace);

// Check if user has registered face
router.get('/check-face/:email', FaceAuthController.checkFaceRegistration);

module.exports = router;