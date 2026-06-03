require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });

const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { prisma } = require('database');
const {
  logger,
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
  authMiddleware,
  sendOtpEmail,
  sendPasswordResetOtpEmail,
  errorHandler,
  notFoundHandler,
  applySecurity,
  registerSwagger,
} = require('shared');
const { seedAdminUser } = require('./seedAdmin');

const app = express();
const PORT = process.env.AUTH_PORT || 3001;

// Service middleware parses JSON and applies shared security controls.
app.use(express.json());
applySecurity(app, cors, helmet, logger, 'auth-service');

// Validation helper returns consistent 400 responses for invalid route inputs.
function sendValidationErrors(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    return true;
  }
  return false;
}

// OTP generator produces short numeric codes for email verification flows.
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// OTP creation stores a hashed code with purpose and expiration metadata.
async function createOtp({ email, userId, purpose }) {
  const code = generateOtp();
  const codeHash = await bcrypt.hash(code, 12);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.otp.create({
    data: { email, userId, purpose, code: codeHash, expiresAt },
  });

  return { code, expiresAt };
}

// OTP verification checks latest valid code and marks it consumed on success.
async function verifyOtpRecord({ email, purpose, code }) {
  const otpRecord = await prisma.otp.findFirst({
    where: { email, purpose, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });

  if (!otpRecord) return null;
  const valid = await bcrypt.compare(String(code).trim(), otpRecord.code);
  if (!valid) return null;

  await prisma.otp.update({
    where: { id: otpRecord.id },
    data: { consumedAt: new Date() },
  });

  return otpRecord;
}

// Refresh tokens are stored as hashes so raw token values are never persisted.
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Token issuer creates an access/refresh pair and stores the refresh-token allowlist entry.
async function issueTokenPair(user) {
  const tokenPayload = { id: user.id, email: user.email, role: user.role };
  const accessToken = generateToken(tokenPayload);
  const refreshToken = generateRefreshToken({ id: user.id, email: user.email });
  const decodedRefresh = verifyRefreshToken(refreshToken);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(decodedRefresh.exp * 1000),
    },
  });

  return {
    accessToken,
    refreshToken,
    token: accessToken,
  };
}

// Registration validation enforces the required account identity and password policy.
const registerValidation = [
  body('firstName').trim().isLength({ min: 2, max: 50 }).withMessage('First name must be 2-50 characters'),
  body('lastName').trim().isLength({ min: 2, max: 50 }).withMessage('Last name must be 2-50 characters'),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password')
    .isStrongPassword({ minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 1 })
    .withMessage('Password must include uppercase, lowercase, number, and symbol'),
];

// Login validation checks required credentials before authentication.
const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

// OTP validation is shared by registration verification and password reset.
const otpValidation = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('otp').trim().matches(/^\d{6}$/).withMessage('OTP must be exactly 6 digits'),
];

// Registration route creates or refreshes an unverified USER account and emails an OTP.
app.post('/auth/register', registerValidation, async (req, res, next) => {
  try {
    if (sendValidationErrors(req, res)) return;

    const { firstName, lastName, email, password } = req.body;
    const reservedAdminEmail = (process.env.ADMIN_EMAIL || 'admin@gmail.com').toLowerCase();
    if (email.toLowerCase() === reservedAdminEmail) {
      return res.status(403).json({ success: false, message: 'This email is reserved for the system administrator.' });
    }

    const name = `${firstName} ${lastName}`;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing?.isVerified && !existing.deletedAt) {
      return res.status(409).json({ success: false, message: 'Email already registered. Please log in.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = existing
      ? await prisma.user.update({
          where: { email },
          data: { firstName, lastName, name, password: hashedPassword, role: 'USER', isVerified: false },
        })
      : await prisma.user.create({
          data: { firstName, lastName, name, email, password: hashedPassword, role: 'USER', isVerified: false },
        });

    const { code } = await createOtp({ email, userId: user.id, purpose: 'REGISTRATION' });
    await sendOtpEmail(email, name, code).catch((err) => logger.error(`Registration OTP email failed: ${err.message}`));

    logger.info(`User registered pending OTP verification: ${email}`);
    res.status(201).json({
      success: true,
      message: 'Registration successful. Please verify your email with the OTP sent.',
      data: { id: user.id, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
});

// Verification route consumes the registration OTP and activates the account.
app.post('/auth/verify-otp', otpValidation, async (req, res, next) => {
  try {
    if (sendValidationErrors(req, res)) return;

    const { email, otp } = req.body;
    const user = await prisma.user.findFirst({ where: { email, deletedAt: null } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.isVerified) return res.status(400).json({ success: false, message: 'Email already verified. Please log in.' });

    const otpRecord = await verifyOtpRecord({ email, purpose: 'REGISTRATION', code: otp });
    if (!otpRecord) return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });

    const verifiedUser = await prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true, otp: null, otpExpiresAt: null },
      select: { id: true, name: true, firstName: true, lastName: true, email: true, role: true },
    });
    const tokens = await issueTokenPair(verifiedUser);

    logger.info(`OTP verified for: ${email}`);
    res.json({ success: true, message: 'OTP verified', data: { user: verifiedUser, ...tokens } });
  } catch (err) {
    next(err);
  }
});

// Resend route issues a fresh registration OTP for unverified accounts.
app.post('/auth/resend-otp', [body('email').isEmail().normalizeEmail()], async (req, res, next) => {
  try {
    if (sendValidationErrors(req, res)) return;

    const user = await prisma.user.findFirst({ where: { email: req.body.email, deletedAt: null } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.isVerified) return res.status(400).json({ success: false, message: 'Email already verified. Please log in.' });

    const { code } = await createOtp({ email: user.email, userId: user.id, purpose: 'REGISTRATION' });
    await sendOtpEmail(user.email, user.name, code).catch((err) => logger.error(`Resend OTP email failed: ${err.message}`));
    res.json({ success: true, message: 'A new OTP has been sent.' });
  } catch (err) {
    next(err);
  }
});

// Login route verifies credentials and returns a new token pair.
app.post('/auth/login', loginValidation, async (req, res, next) => {
  try {
    if (sendValidationErrors(req, res)) return;

    const user = await prisma.user.findFirst({ where: { email: req.body.email, deletedAt: null } });
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    if (!user.isVerified) return res.status(403).json({ success: false, message: 'Please verify your email before logging in' });

    const validPassword = await bcrypt.compare(req.body.password, user.password);
    if (!validPassword) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const safeUser = { id: user.id, name: user.name, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role };
    const tokens = await issueTokenPair(user);

    logger.info(`User logged in: ${user.email}`);
    res.json({ success: true, message: 'Login successful', data: { user: safeUser, ...tokens } });
  } catch (err) {
    next(err);
  }
});

// Refresh route rotates refresh tokens and rejects revoked or expired tokens.
app.post('/auth/refresh', [body('refreshToken').notEmpty().withMessage('Refresh token is required')], async (req, res, next) => {
  try {
    if (sendValidationErrors(req, res)) return;

    const decoded = verifyRefreshToken(req.body.refreshToken);
    const existing = await prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(req.body.refreshToken) },
      include: { user: true },
    });
    if (!existing || existing.revokedAt || existing.expiresAt < new Date() || existing.userId !== decoded.id) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    await prisma.refreshToken.update({ where: { id: existing.id }, data: { revokedAt: new Date() } });
    const tokens = await issueTokenPair(existing.user);
    res.json({ success: true, message: 'Token refreshed', data: tokens });
  } catch (err) {
    next(err);
  }
});

// Logout route revokes active refresh tokens for the authenticated user.
app.post('/auth/logout', authMiddleware, async (req, res, next) => {
  try {
    const tokenHash = req.body.refreshToken ? hashToken(req.body.refreshToken) : null;
    await prisma.refreshToken.updateMany({
      where: { userId: req.user.id, revokedAt: null, ...(tokenHash && { tokenHash }) },
      data: { revokedAt: new Date() },
    });
    logger.info(`User logged out: ${req.user.email}`);
    res.json({ success: true, message: 'Logout successful' });
  } catch (err) {
    next(err);
  }
});

// Forgot-password route sends reset OTPs without exposing account existence.
app.post('/auth/forgot-password', [body('email').isEmail().normalizeEmail()], async (req, res, next) => {
  try {
    if (sendValidationErrors(req, res)) return;

    const user = await prisma.user.findFirst({ where: { email: req.body.email, deletedAt: null } });
    if (user) {
      const { code } = await createOtp({ email: user.email, userId: user.id, purpose: 'PASSWORD_RESET' });
      await sendPasswordResetOtpEmail(user.email, user.name, code).catch((err) => logger.error(`Password reset email failed: ${err.message}`));
      logger.info(`Password reset OTP requested: ${user.email}`);
    }

    res.json({ success: true, message: 'If the email exists, a password reset OTP has been sent.' });
  } catch (err) {
    next(err);
  }
});

// Reset-password route consumes OTP, updates the password, and revokes sessions.
app.post('/auth/reset-password', [
  ...otpValidation,
  body('password')
    .isStrongPassword({ minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 1 })
    .withMessage('Password must include uppercase, lowercase, number, and symbol'),
], async (req, res, next) => {
  try {
    if (sendValidationErrors(req, res)) return;

    const user = await prisma.user.findFirst({ where: { email: req.body.email, deletedAt: null } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const otpRecord = await verifyOtpRecord({ email: req.body.email, purpose: 'PASSWORD_RESET', code: req.body.otp });
    if (!otpRecord) return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });

    await prisma.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash(req.body.password, 12) },
    });
    await prisma.refreshToken.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });

    logger.info(`Password reset completed: ${user.email}`);
    res.json({ success: true, message: 'Password reset successful' });
  } catch (err) {
    next(err);
  }
});

// Change-password route verifies the current password before replacing it.
app.post('/auth/change-password', authMiddleware, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isStrongPassword({ minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 1 })
    .withMessage('New password must include uppercase, lowercase, number, and symbol'),
], async (req, res, next) => {
  try {
    if (sendValidationErrors(req, res)) return;

    const user = await prisma.user.findFirst({ where: { id: req.user.id, deletedAt: null } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const validPassword = await bcrypt.compare(req.body.currentPassword, user.password);
    if (!validPassword) return res.status(400).json({ success: false, message: 'Current password is incorrect' });

    await prisma.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash(req.body.newPassword, 12) },
    });
    await prisma.refreshToken.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });

    logger.info(`Password changed by authenticated user: ${user.email}`);
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
});

// Profile route returns the authenticated user's safe account details.
app.get('/auth/me', authMiddleware, async (req, res, next) => {
  try {
    const user = await prisma.user.findFirst({
      where: { id: req.user.id, deletedAt: null },
      select: { id: true, name: true, firstName: true, lastName: true, email: true, role: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

// Health endpoint supports service availability checks.
app.get('/health', (_req, res) => {
  res.json({ success: true, service: 'auth-service', status: 'healthy' });
});

// Swagger metadata documents the public contract for authentication.
registerSwagger(app, {
  title: 'Authentication Service API',
  description: 'Registration, OTP verification, login, refresh token, logout, and password recovery APIs.',
  port: PORT,
  paths: {
    '/auth/register': { post: { tags: ['Auth'], summary: 'Register as USER and send registration OTP', responses: { 201: { description: 'OTP sent' } } } },
    '/auth/verify-otp': { post: { tags: ['Auth'], summary: 'Verify registration OTP and issue tokens', responses: { 200: { description: 'Verified' } } } },
    '/auth/login': { post: { tags: ['Auth'], summary: 'Login and issue access/refresh tokens', responses: { 200: { description: 'Logged in' } } } },
    '/auth/refresh': { post: { tags: ['Auth'], summary: 'Rotate refresh token and issue new access token', responses: { 200: { description: 'Token refreshed' } } } },
    '/auth/logout': { post: { tags: ['Auth'], summary: 'Invalidate refresh token', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Logged out' } } } },
    '/auth/forgot-password': { post: { tags: ['Auth'], summary: 'Send password reset OTP', responses: { 200: { description: 'OTP sent when email exists' } } } },
    '/auth/reset-password': { post: { tags: ['Auth'], summary: 'Reset password using OTP', responses: { 200: { description: 'Password reset' } } } },
    '/auth/change-password': { post: { tags: ['Auth'], summary: 'Change password while authenticated', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Password changed' } } } },
    '/auth/me': { get: { tags: ['Auth'], summary: 'Get current authenticated profile', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Profile' } } } },
  },
});

// Shared not-found and error handlers normalize API error responses.
app.use(notFoundHandler);
app.use(errorHandler);

// Service startup restores the default admin and logs readiness.
app.listen(PORT, async () => {
  try {
    await seedAdminUser();
  } catch (err) {
    logger.error(`Failed to seed admin user: ${err.message}`);
  }
  logger.info(`Auth Service running on port ${PORT}`);
});
