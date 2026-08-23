const { createPrismaClient } = require('./utils/prisma');

// Prisma v7 requires a driver adapter — see scripts/utils/prisma.js
const prisma = createPrismaClient();

async function checkTables() {
  try {
    const result = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';`;
    console.log('Tables:', result);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

checkTables();
