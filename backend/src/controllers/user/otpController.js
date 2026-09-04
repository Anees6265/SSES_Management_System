// controllers/otpController.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
require('dotenv').config();
const { generateOTP, sendEmailOtp } = require('../../services/emailService');
const User = require('../../models/user/user');
const mongoose = require('mongoose');

// Create a schema for storing OTPs in the database
const otpSchema = new mongoose.Schema({
    email: { type: String, required: true },
    otp: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    blockedUntil: { type: Date, default: null },
}, { timestamps: true });

otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const OtpModel = mongoose.model('Otp', otpSchema);

// Send OTP Controller (stores in DB instead of in-memory)
const sendOtpToEmail = async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    // Only allow organization email (e.g., ssism.org)
    const allowedDomain = "@ssism.org";
    if (!email.endsWith(allowedDomain)) {
        return res.status(403).json({ message: `Only ${allowedDomain} email addresses are allowed` });
    }

    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const existingRecord = await OtpModel.findOne({ email });
        if (existingRecord && existingRecord.blockedUntil && existingRecord.blockedUntil > new Date()) {
            const remaining = Math.ceil((existingRecord.blockedUntil - new Date()) / 60000);
            return res.status(429).json({ message: `Too many attempts. Try again in ${remaining} min` });
        }

        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

        // Save or update OTP in DB, resetting attempts when generating a new OTP (unless blocked)
        await OtpModel.findOneAndUpdate(
            { email },
            { otp, expiresAt, attempts: 0 },
            { upsert: true, new: true }
        );

        await sendEmailOtp(email, otp);
        res.status(200).json({ message: 'OTP sent to registered email' });
    } catch (err) {
        console.error('Error sending OTP:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

// Verify OTP Controller (checks OTP from DB)
const verifyEmailOtp = async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: 'Email and OTP required' });

    try {
        const otpRecord = await OtpModel.findOne({ email });
        if (!otpRecord) return res.status(400).json({ message: 'No OTP found' });

        if (otpRecord.blockedUntil && otpRecord.blockedUntil > new Date()) {
      const remaining = Math.ceil((otpRecord.blockedUntil - new Date()) / 60000);
      return res.status(429).json({ message: `Too many attempts. Try again in ${remaining} min` });
    }

        if (Date.now() > otpRecord.expiresAt.getTime()) {
            await OtpModel.deleteOne({ email });
            return res.status(400).json({ message: 'OTP expired' });
        }

        if (otpRecord.otp !== otp) {
      otpRecord.attempts += 1;

      if (otpRecord.attempts >= 5) {
        otpRecord.blockedUntil = new Date(Date.now() + 10 * 60 * 1000); // 10 min block
      }

      await otpRecord.save();
      return res.status(400).json({ message: 'Invalid OTP' });
    }

        if (otpRecord.otp !== otp) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'User not found' });

            // generate JWT token
        const token = jwt.sign(
            { 
                id: user._id, 
                role: user.role 
            }, process.env.JWT_SECRET, { expiresIn: '1h' });
        // Generate refresh token
        const refreshToken = jwt.sign(
            { 
                id: user._id, 
                role: user.role 
            }, process.env.JWT_SECRET, { expiresIn: '7d' });

        user.refreshToken = refreshToken;
        await user.save();

        await OtpModel.deleteOne({ email }); // Clear used OTP from DB

        res.status(200).json({
            message: 'OTP verified successfully. Login success.',
            token,
            refreshToken,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                position: user.position,
                department: user.department,
            },
        });
    } catch (error) {
        console.error('OTP verify error:', error.message);
        res.status(500).json({ message: 'OTP verification failed', error: error.message });
    }
};

module.exports = { sendOtpToEmail, verifyEmailOtp };
