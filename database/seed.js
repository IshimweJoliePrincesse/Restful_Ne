const bcrypt = require('bcryptjs');
const { prisma } = require('./index');

async function main() {
  const roleDescriptions = {
    ADMIN: 'Manages users, inventory, reports, and system-wide settings.',
    INSPECTOR: 'Conducts inspections and records maintenance activities.',
    USER: 'Views extinguisher status, notifications, and inspection history.',
  };

  for (const [name, description] of Object.entries(roleDescriptions)) {
    await prisma.roleRecord.upsert({
      where: { name },
      update: { description, deletedAt: null },
      create: { name, description },
    });
  }

  const email = (process.env.ADMIN_EMAIL || 'admin@gmail.com').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'Admin@123';
  const name = process.env.ADMIN_NAME || 'System Admin';
  const [firstName, ...rest] = name.split(' ');

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

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
