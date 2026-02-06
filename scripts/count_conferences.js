const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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