const { PrismaClient } = require('@prisma/client');

// Shared Prisma client keeps all services using the same database connection API.
const prisma = new PrismaClient();

// Database package exports both the singleton client and PrismaClient constructor.
module.exports = { prisma, PrismaClient };
