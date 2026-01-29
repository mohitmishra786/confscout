import { getCachedConferences } from '../src/lib/cache';
import { ConferenceData } from '../src/types/conference';
import { cacheLogger } from '../src/lib/logger';

async function testCache() {
  try {
    cacheLogger.info('Testing getCachedConferences');
    const start = Date.now();
    const data = await Promise.race([
      getCachedConferences(),
      new Promise<ConferenceData>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout after 20 seconds')), 20000)
      )
    ]);
    const duration = Date.now() - start;
    
    cacheLogger.info('Successfully fetched data', { 
      duration: `${duration}ms`,
      total: data.stats.total,
      months: Object.keys(data.months).length,
      openCfps: data.stats.withOpenCFP
    });
    
    cacheLogger.info('Cache test passed');
  } catch (error: any) {
    cacheLogger.error('Cache test failed', error);
    process.exit(1);
  }
}

testCache();
