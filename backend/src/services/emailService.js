const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Function to get appropriate client URL based on environment
function getClientBaseUrl(origin = null) {
    // Priority 1: If request comes from a browser, dynamically use that exact origin
    // (e.g. http://localhost:5173 when testing locally, https://iteg.ssism.org on production)
    if (origin && typeof origin === 'string' && origin.startsWith('http')) {
        return origin.replace(/\/+$/, '');
    }

    // Priority 2: Custom domain if explicitly set in .env
    if (process.env.CUSTOM_DOMAIN) {
        return process.env.CUSTOM_DOMAIN.replace(/\/+$/, '');
    }

    const rawUrls = process.env.CLIENT_BASE_URL || 'http://localhost:5173';
    const urls = rawUrls.split(',').map(url => url.trim()).filter(Boolean);

    // Priority 3: On production, prioritize official domain (ssism.org)
    const officialDomain = urls.find(url => url.includes('ssism.org'));
    if (officialDomain && process.env.NODE_ENV === 'production') {
        return officialDomain.replace(/\/reset-password\/?$/, '').replace(/\/+$/, '');
    }

    // Priority 4: Development environment (localhost)
    if (process.env.NODE_ENV === 'development') {
        const localhostUrl = urls.find(url => url.includes('localhost'));
        if (localhostUrl) {
            return localhostUrl.replace(/\/reset-password\/?$/, '').replace(/\/+$/, '');
        }
    }

    // Priority 5: Fallback to first URL or localhost
    const fallback = urls[0] || 'http://localhost:5173';
    return fallback.replace(/\/reset-password\/?$/, '').replace(/\/+$/, '');
}

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendEmailOtp(email, otp) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { 
            user: process.env.EMAIL_USER,
            pass: (process.env.EMAIL_PASS || '').replace(/\s+/g, ''),
        }
    });

    const logoRelative = process.env.EMAIL_LOGO_PATH || 'assets/Ssism_Logo.png';
    const logoPath = path.join(__dirname, '..', logoRelative);
    const hasLogo = fs.existsSync(logoPath);

    const mailOptions = {
        from: `"ITEG Management System" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: '🔐 Your OTP for Email Verification - SSISM',
        html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 400px; margin: auto; padding: 30px; border-radius: 12px; background: #ffffff; border: 0.5px solid rgb(184, 182, 182); box-shadow: 0 0 10px rgba(0,0,0,0.05);">
                
                <div style="text-align: center;">
                    ${hasLogo ? '<img src="cid:ssismLogo" alt="SSISM Logo" width="80" style="margin-bottom: 10px;" />' : ''}
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
        attachments: hasLogo ? [{
            path: logoPath,
            cid: 'ssismLogo'
        }] : [],
        text: `Your OTP is: ${otp} (Valid for 5 minutes)`
    };

    await transporter.sendMail(mailOptions);
}

async function sendResetLinkEmail(email, token, origin = null) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: (process.env.EMAIL_PASS || '').replace(/\s+/g, '')
        }
    });

    const logoRelative = process.env.EMAIL_LOGO_PATH || 'assets/Ssism_Logo.png';
    const logoPath = path.join(__dirname, '..', logoRelative);
    const hasLogo = fs.existsSync(logoPath);

    const clientBase = getClientBaseUrl(origin);
    const resetLink = `${clientBase}/reset-password/${token}`;
    
    console.log(`🔗 Password reset link generated for ${email}: ${resetLink}`);

    const mailOptions = {
        from: `"ITEG Management System" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: '🔐 Reset Your Password - SSISM ITEG System',
        html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 400px; margin: auto; padding: 30px; border-radius: 12px; background: #ffffff; border: 0.5px solid rgb(184, 182, 182); box-shadow: 0 0 10px rgba(0,0,0,0.05);">
                
                <div style="text-align: center;">
                    ${hasLogo ? '<img src="cid:ssismLogo" alt="SSISM Logo" width="80" style="margin-bottom: 10px;" />' : ''}
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

                <p style="color: #444; font-size: 12px; word-break: break-all;">Or copy and paste this link in your browser:<br/><a href="${resetLink}" style="color: #f57c00;">${resetLink}</a></p>

                <p style="color: #444; margin-top: 12px;">⚠️ <strong>If you did not request this reset, you can ignore this email.</strong></p>

                <br />
                <p style="color: #555;">Regards,</p>
                <p style="font-weight: bold; color: #e65100;">Team SSISM | ITEG Management</p>
                <p style="font-size: 12px; color: #999;">ssism.org | support@santsingaji.org</p>
            </div>
        `,
        attachments: hasLogo ? [{
            path: logoPath,
            cid: 'ssismLogo'
        }] : [],
        text: `Reset your password here: ${resetLink} (valid for 15 minutes)`
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Reset email successfully sent to ${email}`);
        return { success: true, resetLink, emailSent: true };
    } catch (mailError) {
        console.warn(`⚠️ Nodemailer SMTP failed to deliver to ${email}:`, mailError.message);
        console.log(`🔗 Fallback Reset Link: ${resetLink}`);
        return { success: true, resetLink, emailSent: false, error: mailError.message };
    }
}

const escapeHtml = (str = '') =>
    String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

const createMailTransporter = () => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        return null;
    }
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: (process.env.EMAIL_PASS || '').replace(/\s+/g, ''),
        },
    });
};

const getLogoAttachment = () => {
    const logoRelative = process.env.EMAIL_LOGO_PATH || 'assets/Ssism_Logo.png';
    const logoPath = path.join(__dirname, '..', logoRelative);
    const hasLogo = fs.existsSync(logoPath);
    return {
        hasLogo,
        attachments: hasLogo ? [{ path: logoPath, cid: 'ssismLogo' }] : [],
    };
};

const SEVERITY_COLORS = {
    critical: { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' },
    high: { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
    medium: { bg: '#fefce8', text: '#a16207', border: '#fef08a' },
    low: { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' },
};

async function sendSupportTicketEmail({ ticket, recipients = [], origin = null }) {
    const recipientEmails = (recipients || [])
        .map((r) => (typeof r === 'string' ? r : r?.email))
        .filter(Boolean);

    if (recipientEmails.length === 0) {
        return { attempted: false, sent: false, recipients: [], error: 'No recipient emails configured' };
    }

    const transporter = createMailTransporter();
    if (!transporter) {
        return {
            attempted: false,
            sent: false,
            recipients: recipientEmails,
            error: 'Email SMTP credentials not configured on server',
        };
    }

    const { hasLogo, attachments } = getLogoAttachment();
    const portalUrl = `${getClientBaseUrl(origin)}/support`;
    const sevKey = String(ticket?.severity || 'medium').toLowerCase();
    const sevStyle = SEVERITY_COLORS[sevKey] || SEVERITY_COLORS.medium;
    const isDirect = ticket?.source === 'direct_mail';
    const reporter = ticket?.reportedBy || {};
    const env = ticket?.environmentInfo || {};
    const screenshots = Array.isArray(ticket?.screenshots) ? ticket.screenshots : [];

    const screenshotHtml = screenshots.length > 0
        ? `
          <div style="margin-top: 16px; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
            <p style="margin: 0 0 8px; font-size: 12px; font-weight: bold; color: #334155;">Attached Screenshots (${screenshots.length}):</p>
            ${screenshots
                .map((s, idx) => s?.url && s.url.startsWith('http')
                    ? `<div style="margin-bottom: 6px;"><a href="${escapeHtml(s.url)}" target="_blank" style="color: #ea580c; font-size: 12px; font-weight: bold;">View Screenshot #${idx + 1}</a></div>`
                    : `<div style="font-size: 11px; color: #64748b;">Screenshot #${idx + 1} attached in Portal Ticket</div>`
                )
                .join('')}
          </div>
        `
        : '';

    const mailOptions = {
        from: `"SSISM Portal Support Desk" <${process.env.EMAIL_USER}>`,
        to: recipientEmails.join(', '),
        ...(reporter.email ? { replyTo: `"${reporter.name || 'Portal User'}" <${reporter.email}>` } : {}),
        subject: `[${ticket.ticketCode}] [${sevKey.toUpperCase()}] ${isDirect ? 'Direct Developer Mail' : 'Bug / Support'}: ${ticket.subject}`,
        html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 24px; border-radius: 14px; background: #ffffff; border: 1px solid #e2e8f0;">
                <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #fb923c; padding-bottom: 14px; margin-bottom: 18px;">
                    <div>
                        ${hasLogo ? '<img src="cid:ssismLogo" alt="SSISM Logo" width="54" style="vertical-align: middle; margin-bottom: 6px;" />' : ''}
                        <h2 style="color: #ea580c; margin: 0; font-size: 18px;">SSES / ITEG Support &amp; Help Desk</h2>
                        <p style="color: #64748b; margin: 4px 0 0; font-size: 12px;">Ticket Reference: <strong>${escapeHtml(ticket.ticketCode)}</strong></p>
                    </div>
                </div>

                <div style="margin-bottom: 16px;">
                    <span style="display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: bold; text-transform: uppercase; background: ${sevStyle.bg}; color: ${sevStyle.text}; border: 1px solid ${sevStyle.border};">
                        ${escapeHtml(sevKey)} Severity
                    </span>
                    <span style="display: inline-block; margin-left: 6px; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: bold; background: #f1f5f9; color: #334155;">
                        ${escapeHtml(ticket.module || 'General')}
                    </span>
                </div>

                <h3 style="margin: 0 0 10px; color: #0f172a; font-size: 16px;">${escapeHtml(ticket.subject)}</h3>

                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; margin-bottom: 16px; white-space: pre-wrap; color: #1e293b; font-size: 13px; line-height: 1.6;">${escapeHtml(ticket.description)}</div>

                <table style="width: 100%; border-collapse: collapse; font-size: 12px; color: #334155; margin-bottom: 14px;">
                    <tr>
                        <td style="padding: 6px 8px; border-bottom: 1px solid #f1f5f9; color: #64748b; width: 32%;">Reported By</td>
                        <td style="padding: 6px 8px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">${escapeHtml(reporter.name || 'User')} (${escapeHtml((reporter.role || '').toUpperCase())})</td>
                    </tr>
                    <tr>
                        <td style="padding: 6px 8px; border-bottom: 1px solid #f1f5f9; color: #64748b;">Email / Mobile</td>
                        <td style="padding: 6px 8px; border-bottom: 1px solid #f1f5f9;">${escapeHtml(reporter.email || '—')}${reporter.mobileNo ? ` · ${escapeHtml(reporter.mobileNo)}` : ''}</td>
                    </tr>
                    <tr>
                        <td style="padding: 6px 8px; border-bottom: 1px solid #f1f5f9; color: #64748b;">Department</td>
                        <td style="padding: 6px 8px; border-bottom: 1px solid #f1f5f9;">${escapeHtml(reporter.department || '—')}</td>
                    </tr>
                    ${ticket.pageUrl ? `<tr><td style="padding: 6px 8px; border-bottom: 1px solid #f1f5f9; color: #64748b;">Affected Page</td><td style="padding: 6px 8px; border-bottom: 1px solid #f1f5f9;">${escapeHtml(ticket.pageUrl)}</td></tr>` : ''}
                    ${env.browser || env.platform ? `<tr><td style="padding: 6px 8px; border-bottom: 1px solid #f1f5f9; color: #64748b;">System Info</td><td style="padding: 6px 8px; border-bottom: 1px solid #f1f5f9;">${escapeHtml(env.browser || '')} · ${escapeHtml(env.platform || '')} ${env.screenResolution ? `(${escapeHtml(env.screenResolution)})` : ''}</td></tr>` : ''}
                </table>

                ${screenshotHtml}

                <div style="text-align: center; margin-top: 22px;">
                    <a href="${portalUrl}" target="_blank" style="display: inline-block; background: #ea580c; color: #ffffff; padding: 11px 22px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 13px;">
                        Open Support &amp; Help Desk
                    </a>
                </div>
            </div>
        `,
        attachments,
        text: `[${ticket.ticketCode}] ${ticket.subject}\n\n${ticket.description}\n\nReported By: ${reporter.name} (${reporter.email}, ${reporter.role})\nView in portal: ${portalUrl}`,
    };

    try {
        await transporter.sendMail(mailOptions);
        return { attempted: true, sent: true, recipients: recipientEmails, error: '', sentAt: new Date() };
    } catch (mailError) {
        console.warn('⚠️ Support ticket email delivery warning:', mailError.message);
        return { attempted: true, sent: false, recipients: recipientEmails, error: mailError.message };
    }
}

async function sendSupportStatusUpdateEmail({ ticket, updatedBy = {}, comment = '', origin = null }) {
    const reporterEmail = ticket?.reportedBy?.email;
    if (!reporterEmail) return { attempted: false, sent: false };

    const transporter = createMailTransporter();
    if (!transporter) return { attempted: false, sent: false };

    const { hasLogo, attachments } = getLogoAttachment();
    const portalUrl = `${getClientBaseUrl(origin)}/support`;
    const statusLabel = String(ticket?.status || 'open').replace(/_/g, ' ').toUpperCase();

    const mailOptions = {
        from: `"SSISM Portal Support Desk" <${process.env.EMAIL_USER}>`,
        to: reporterEmail,
        subject: `[${ticket.ticketCode}] Status Updated to ${statusLabel} — ${ticket.subject}`,
        html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 560px; margin: auto; padding: 24px; border-radius: 14px; background: #ffffff; border: 1px solid #e2e8f0;">
                <div style="border-bottom: 2px solid #fb923c; padding-bottom: 12px; margin-bottom: 16px;">
                    ${hasLogo ? '<img src="cid:ssismLogo" alt="SSISM Logo" width="50" style="margin-bottom: 6px;" />' : ''}
                    <h2 style="color: #ea580c; margin: 0; font-size: 17px;">Support Ticket Update</h2>
                    <p style="color: #64748b; margin: 4px 0 0; font-size: 12px;">Ticket: <strong>${escapeHtml(ticket.ticketCode)}</strong></p>
                </div>

                <p style="font-size: 13px; color: #334155;">Hello <strong>${escapeHtml(ticket.reportedBy?.name || 'User')}</strong>,</p>
                <p style="font-size: 13px; color: #334155;">Your support ticket <strong>"${escapeHtml(ticket.subject)}"</strong> has been updated by <strong>${escapeHtml(updatedBy?.name || 'Support Team')}</strong>.</p>

                <div style="background: #fff7ed; border: 1px solid #fed7aa; padding: 12px 14px; border-radius: 10px; margin: 14px 0;">
                    <p style="margin: 0; font-size: 12px; color: #9a3412;">Current Status: <strong>${escapeHtml(statusLabel)}</strong></p>
                    ${(ticket.developerNote || comment) ? `<p style="margin: 8px 0 0; font-size: 13px; color: #1e293b; white-space: pre-wrap;"><strong>Note:</strong> ${escapeHtml(comment || ticket.developerNote)}</p>` : ''}
                </div>

                <div style="text-align: center; margin-top: 20px;">
                    <a href="${portalUrl}" target="_blank" style="display: inline-block; background: #ea580c; color: #ffffff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 13px;">
                        Track Ticket in Portal
                    </a>
                </div>
            </div>
        `,
        attachments,
        text: `Ticket ${ticket.ticketCode} (${ticket.subject}) status updated to ${statusLabel}. Note: ${comment || ticket.developerNote || '—'}`,
    };

    try {
        await transporter.sendMail(mailOptions);
        return { attempted: true, sent: true };
    } catch (err) {
        console.warn('⚠️ Support status update email warning:', err.message);
        return { attempted: true, sent: false, error: err.message };
    }
}

module.exports = {
    generateOTP,
    sendEmailOtp,
    sendResetLinkEmail,
    sendSupportTicketEmail,
    sendSupportStatusUpdateEmail,
};
