const express = require('express');
const FaceAuthController = require('../controllers/helper/faceAuthController');
const router = express.Router();

// Register face for a user
router.post('/register-face', FaceAuthController.registerFace);

// Login with face recognition
router.post('/login-face', FaceAuthController.loginWithFace);

// Check if user has registered face
router.get('/check-face/:email', FaceAuthController.checkFaceRegistration);

module.exports = router;