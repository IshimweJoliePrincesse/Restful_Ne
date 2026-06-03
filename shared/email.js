const nodemailer = require('nodemailer');
const logger = require('./logger');

let transporter = null;

// SMTP configuration check keeps local development from failing without email credentials.
function isSmtpConfigured() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) return false;
  if (user.includes('your-email') || pass.includes('your-app-password')) return false;
  return true;
}

// Transporter creation is lazy so services only connect to SMTP when email is sent.
function getTransporter() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: (process.env.SMTP_PASS || '').replace(/\s/g, ''),
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });

  return transporter;
}

// Generic sender centralizes logging, SMTP fallback, and error reporting.
async function sendEmail({ to, subject, html }) {
  if (!isSmtpConfigured()) {
    logger.warn(`Email not sent (SMTP not configured). To: ${to}, Subject: ${subject}`);
    logger.info(`Email content preview: ${html.replace(/<[^>]*>/g, '').slice(0, 200)}`);
    return { messageId: 'dev-mode-no-smtp' };
  }

  try {
    const info = await getTransporter().sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      html,
    });

    logger.info(`Email sent to ${to}: ${subject}`);
    return info;
  } catch (err) {
    logger.error(`Email failed for ${to}: ${err.message}`);
    logger.info(`Email content preview: ${html.replace(/<[^>]*>/g, '').slice(0, 200)}`);
    throw err;
  }
}

// Registration OTP email sends the account verification code.
async function sendOtpEmail(email, name, otp) {
  return sendEmail({
    to: email,
    subject: 'Verify Your Account - Fire Extinguisher System',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Fire Extinguisher Management System</h2>
        <p>Hello ${name},</p>
        <p>Your OTP verification code is:</p>
        <h1 style="color: #dc2626; letter-spacing: 8px;">${otp}</h1>
        <p>This code expires in 10 minutes.</p>
        <p>If you did not register, please ignore this email.</p>
      </div>
    `,
  });
}

// Password reset OTP email sends the reset code for account recovery.
async function sendPasswordResetOtpEmail(email, name, otp) {
  return sendEmail({
    to: email,
    subject: 'Reset Your Password - Fire Extinguisher System',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Password Reset Request</h2>
        <p>Hello ${name},</p>
        <p>Use this OTP code to reset your password:</p>
        <h1 style="color: #dc2626; letter-spacing: 8px;">${otp}</h1>
        <p>This code expires in 10 minutes.</p>
        <p>If you did not request a password reset, please ignore this email.</p>
      </div>
    `,
  });
}

// Inspector upgrade email notifies users when an admin changes their role.
async function sendInspectorUpgradeEmail(email, name) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  return sendEmail({
    to: email,
    subject: 'Your Account Was Upgraded to Inspector',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Inspector Access Enabled</h2>
        <p>Hello ${name},</p>
        <p>Your Fire Extinguisher Management System account has been upgraded to the <strong>INSPECTOR</strong> role by an administrator.</p>
        <p>You can now view assigned inspections, complete inspection work, and log maintenance activities.</p>
        <a href="${frontendUrl}/login" style="display:inline-block;padding:12px 24px;background:#dc2626;color:white;text-decoration:none;border-radius:6px;">Open Dashboard</a>
        <p style="font-size: 12px; color: #6b7280; margin-top: 24px;">If you believe this change was made by mistake, please contact the system administrator.</p>
      </div>
    `,
  });
}

// Expiry notification email alerts assigned users about upcoming extinguisher expiry.
async function sendExpiryNotificationEmail(email, name, extinguisherCode, expiryDate, notificationId) {
  const apiUrl = process.env.GATEWAY_URL || 'http://localhost:3000';
  return sendEmail({
    to: email,
    subject: `Fire Extinguisher Expiry Alert - ${extinguisherCode}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">⚠️ Expiry Alert</h2>
        <p>Hello ${name},</p>
        <p>Your fire extinguisher <strong>${extinguisherCode}</strong> is expiring on <strong>${new Date(expiryDate).toLocaleDateString()}</strong>.</p>
        <p>Please respond within 7 days to confirm you will replace or service it.</p>
        <p>Notification ID: ${notificationId}</p>
        <p>Log in to the system to respond to this alert.</p>
        <a href="${apiUrl.replace(':3000', ':5173')}/notifications" style="display:inline-block;padding:12px 24px;background:#dc2626;color:white;text-decoration:none;border-radius:6px;">Respond Now</a>
      </div>
    `,
  });
}

// Email module exports all templates through one shared interface.
module.exports = { sendEmail, sendOtpEmail, sendPasswordResetOtpEmail, sendInspectorUpgradeEmail, sendExpiryNotificationEmail };
