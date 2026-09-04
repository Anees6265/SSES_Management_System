const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config();

// Function to get appropriate client URL based on environment
function getClientBaseUrl() {
    const urls = process.env.CLIENT_BASE_URL.split(',').map(url => url.trim());
    
    // Priority 1: Custom domain for AWS production
    if (process.env.CUSTOM_DOMAIN) {
        return process.env.CUSTOM_DOMAIN.endsWith('/') ? 
               process.env.CUSTOM_DOMAIN + 'reset-password/' : 
               process.env.CUSTOM_DOMAIN + '/reset-password/';
    }
    
    // Priority 2: Development environment (localhost)
    if (process.env.NODE_ENV === 'development') {
        const localhostUrl = urls.find(url => url.includes('localhost'));
        if (localhostUrl) {
            console.log('🏠 Using localhost URL for development');
            return localhostUrl;
        }
    }
    
    // Priority 3: Production Vercel URL
    const vercelUrl = urls.find(url => url.includes('vercel.app'));
    if (vercelUrl) {
        console.log('☁️ Using Vercel URL for production');
        return vercelUrl;
    }
    
    // Fallback to first URL
    console.log('⚠️ Using fallback URL');
    return urls[0];
}

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendEmailOtp(email, otp) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { 
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        }
    });

    const logoPath = path.join(__dirname, '..', process.env.EMAIL_LOGO_PATH);

    const mailOptions = {
        from: `"ITEG Management System" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: '🔐 Your OTP for Email Verification - SSISM',
        html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 400px; margin: auto; padding: 30px; border-radius: 12px; background: #ffffff; border: 0.5px solid rgb(184, 182, 182); box-shadow: 0 0 10px rgba(0,0,0,0.05);">
                
                <div style="text-align: center;">
                    <img src="cid:ssismLogo" alt="SSISM Logo" width="80" style="margin-bottom: 10px;" />
                    <h2 style="color: #f57c00; margin: 10px 0 5px;">SSISM - ITEG Management System</h2>
                    <p style="color: #666; font-size: 14px;">Secure One-Time Password (OTP) for verification</p>
                </div>

                <hr style="border: none; border-top: 1px solid #f2a365; margin: 20px 0;" />

                <p>Hello,</p>
                <p>You have requested to verify your email address for accessing <strong>ITEG Management System</strong>.</p>

                <div style="background: #fff7ed; padding: 14px; border-radius: 8px; text-align: center; margin: 14px 0; border: 0.5px solid rgb(184, 182, 182);">
                    <p style="font-size: 16px; margin-bottom: 10px; color: #555;">Your OTP is:</p>
                    <div style="font-size: 20px; font-weight: bold; color: #e65100; letter-spacing: 4px;">${otp}</div>
                    <p style="font-size: 12px; color: #999; font-weight: bold;">(Valid for 5 minutes)</p>
                </div>

                <p style="color: #444;">⚠️ <strong>Please do not share this OTP with anyone.</strong> If you did not request this OTP, you can ignore this message or contact our support.</p>

                <br />
                <p style="color: #555;">Regards,</p>
                <p style="font-weight: bold; color: #e65100; font-size: 16px;">Team ITEG | SSISM </p>
                <p style="font-size: 13px; color: #999; color: #e65100;">ssism.org | support@santsingaji.org</p>
            </div>
        `,
        attachments: [{
            path: logoPath,
            cid: 'ssismLogo'
        }],
        text: `Your OTP is: ${otp} (Valid for 5 minutes)`
    };

    await transporter.sendMail(mailOptions);
}

async function sendResetLinkEmail(email, token) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const logoPath = path.join(__dirname, '..', process.env.EMAIL_LOGO_PATH);
    const baseUrl = getClientBaseUrl();
    const resetLink = `${baseUrl}${token}`;
    
    console.log('🔗 Reset link generated:', resetLink);
    console.log('🌍 Environment:', process.env.NODE_ENV);
    console.log('🎯 Base URL used:', baseUrl);

    const mailOptions = {
        from: `"ITEG Management System" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: '🔐 Reset Your Password - SSISM ITEG System',
        html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 400px; margin: auto; padding: 30px; border-radius: 12px; background: #ffffff; border: 0.5px solid rgb(184, 182, 182); box-shadow: 0 0 10px rgba(0,0,0,0.05);">
                
                <div style="text-align: center;">
                    <img src="cid:ssismLogo" alt="SSISM Logo" width="80" style="margin-bottom: 10px;" />
                    <h2 style="color: #f57c00; margin: 10px 0 5px;">SSISM - ITEG Management System</h2>
                    <p style="color: #666; font-size: 14px;">Reset your password securely</p>
                </div>

                <hr style="border: none; border-top: 1px solid #f2a365; margin: 20px 0;" />

                <p>Hello,</p>
                <p>You have requested to reset your password for accessing <strong>ITEG Management System</strong>.</p>

                <div style="background: #fff7ed; padding: 14px; border-radius: 8px; text-align: center; margin: 19px 0; border: 0.5px solid rgb(184, 182, 182);">
                    <p style="font-size: 16px; color: #555;">Click the button below to reset your password:</p>
                    <a href="${resetLink}" target="_blank" style="display: inline-block; background-color: #f57c00; color: #fff; padding: 10px 20px; border-radius: 5px; text-decoration: none; font-weight: bold; margin-top: 10px;">Reset Password</a>
                    <p style="font-size: 12px; color: #999; margin-top: 10px;">(This link is valid for 15 minutes)</p>
                </div>

                <p style="color: #444;">⚠️ <strong>If you did not request this reset, you can ignore this email.</strong></p>

                <br />
                <p style="color: #555;">Regards,</p>
                <p style="font-weight: bold; color: #e65100;">Team SSISM | ITEG Management</p>
                <p style="font-size: 12px; color: #999;">ssism.org | support@santsingaji.org</p>
            </div>
        `,
        attachments: [{
            path: logoPath,
            cid: 'ssismLogo'
        }],
        text: `Reset your password here: ${resetLink} (valid for 15 minutes)`
    };

    await transporter.sendMail(mailOptions);
}


module.exports = {
    generateOTP,
    sendEmailOtp,
    sendResetLinkEmail // ✅ Add this new export
};
