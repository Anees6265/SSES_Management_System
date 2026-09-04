// routes/otpRoutes.js

const express = require('express');
const router = express.Router();
const { sendOtpToEmail, verifyEmailOtp } = require('../controllers/user/otpController.js');

router.post('/send', sendOtpToEmail);
router.post('/verify', verifyEmailOtp);

module.exports = router;
