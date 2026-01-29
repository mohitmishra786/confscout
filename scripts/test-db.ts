import { PrismaClient } from '@prisma/client';
import { dbLogger } from '../src/lib/logger';

const prisma = new PrismaClient();

async function testDatabaseConnection() {
  try {
    dbLogger.info('Starting database connection tests');
    
    // Test 1: Simple connection
    await prisma.$connect();
    dbLogger.info('Database connected successfully');
    
    // Test 2: Count conferences
    const count = await Promise.race([
      prisma.conference.count(),
      new Promise<number>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout after 5 seconds')), 5000)
      )
    ]);
    dbLogger.info('Database count test passed', { count });
    
    // Test 3: Fetch first conference
    const first = await Promise.race([
      prisma.conference.findFirst(),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout after 5 seconds')), 5000)
      )
    ]);
    dbLogger.info('First conference test passed', { name: (first as any)?.name });
    
    // Test 4: Fetch all conferences
    const all = await Promise.race([
      prisma.conference.findMany(),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout after 10 seconds')), 10000)
      )
    ]);
    dbLogger.info('All conferences test passed', { count: (all as any).length });
    
    dbLogger.info('All database tests passed');
  } catch (error: any) {
    dbLogger.error('Database test failed', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabaseConnection();
