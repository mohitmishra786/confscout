const { createPrismaClient } = require('./utils/prisma');

// Prisma v7 requires a driver adapter — see scripts/utils/prisma.js
const prisma = createPrismaClient();

async function countConferences() {
  try {
    const count = await prisma.conference.count();
    console.log(`Total conferences in DB: ${count}`);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

countConferences();
