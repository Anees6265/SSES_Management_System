// routes/otpRoutes.js
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { sendOtpToEmail, verifyEmailOtp } = require('../controllers/user/otpController.js');

const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5,
  message: { message: 'Too many OTP requests from this IP. Please try again after 10 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/send', otpLimiter, sendOtpToEmail);
router.post('/verify', otpLimiter, verifyEmailOtp);

module.exports = router;
