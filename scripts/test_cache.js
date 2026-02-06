const { getCachedConferences } = require('./src/lib/cache');

async function testCache() {
  try {
    const data = await getCachedConferences();
    console.log('Conferences fetched:', data.stats.total);
    console.log('Sample months:', Object.keys(data.months).slice(0, 3));
  } catch (e) {
    console.error(e);
  }
}

testCache();