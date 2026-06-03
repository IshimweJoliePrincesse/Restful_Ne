const bcrypt = require('bcryptjs');
const { prisma } = require('database');
const { logger } = require('shared');

async function seedAdminUser() {
  const email = (process.env.ADMIN_EMAIL || 'admin@gmail.com').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'Admin@123';
  const name = process.env.ADMIN_NAME || 'System Admin';
  const [firstName, ...lastNameParts] = name.split(' ');
  const lastName = lastNameParts.join(' ') || 'Admin';

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    if (existing.role !== 'ADMIN' || !existing.isVerified) {
      const hashedPassword = await bcrypt.hash(password, 12);
      await prisma.user.update({
        where: { email },
        data: {
          name,
          firstName,
          lastName,
          password: hashedPassword,
          role: 'ADMIN',
          isVerified: true,
          otp: null,
          otpExpiresAt: null,
        },
      });
      logger.info(`Default admin account restored: ${email}`);
    }
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: {
      name,
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role: 'ADMIN',
      isVerified: true,
    },
  });

  logger.info(`Default admin account created: ${email}`);
}

module.exports = { seedAdminUser };
