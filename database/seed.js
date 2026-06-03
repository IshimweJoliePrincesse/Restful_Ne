const bcrypt = require('bcryptjs');
const { prisma } = require('./index');

// Seed script creates baseline roles and the default administrator account.
async function main() {
  // Role descriptions populate the physical roles table required by the brief.
  const roleDescriptions = {
    ADMIN: 'Manages users, inventory, reports, and system-wide settings.',
    INSPECTOR: 'Conducts inspections and records maintenance activities.',
    USER: 'Views extinguisher status, notifications, and inspection history.',
  };

  // Role upserts make the seed safe to rerun without duplicating records.
  for (const [name, description] of Object.entries(roleDescriptions)) {
    await prisma.roleRecord.upsert({
      where: { name },
      update: { description, deletedAt: null },
      create: { name, description },
    });
  }

  // Admin seed values come from environment variables with development defaults.
  const email = (process.env.ADMIN_EMAIL || 'admin@gmail.com').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'Admin@123';
  const name = process.env.ADMIN_NAME || 'System Admin';
  const [firstName, ...rest] = name.split(' ');

  // Admin upsert guarantees one verified admin exists for first login.
  await prisma.user.upsert({
    where: { email },
    update: { role: 'ADMIN', isVerified: true, deletedAt: null },
    create: {
      email,
      firstName,
      lastName: rest.join(' ') || 'Admin',
      name,
      password: await bcrypt.hash(password, 12),
      role: 'ADMIN',
      isVerified: true,
    },
  });
}

// Script lifecycle always disconnects Prisma before exiting.
main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
