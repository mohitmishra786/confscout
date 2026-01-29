const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function migrateData() {
  try {
    const dataPath = path.join(process.cwd(), 'public/data/conferences.json');
    const fileContents = fs.readFileSync(dataPath, 'utf8');
    const data = JSON.parse(fileContents);
    
    let conferences = [];
    if (data.months) {
      conferences = Object.values(data.months).flat();
    } else if (data.conferences) {
      conferences = data.conferences;
    }

    console.log(`Found ${conferences.length} conferences to migrate.`);

    const BATCH_SIZE = 50;
    
    for (let i = 0; i < conferences.length; i += BATCH_SIZE) {
      const batch = conferences.slice(i, i + BATCH_SIZE);
      
      await Promise.all(batch.map(conf => 
        prisma.conference.upsert({
          where: { id: conf.id },
          update: {
            name: conf.name,
            url: conf.url,
            startDate: conf.startDate ? new Date(conf.startDate) : null,
            endDate: conf.endDate ? new Date(conf.endDate) : null,
            city: conf.location?.city || null,
            country: conf.location?.country || null,
            lat: conf.location?.lat || null,
            lng: conf.location?.lng || null,
            locationRaw: conf.location?.raw || null,
            online: conf.online || false,
            cfpUrl: conf.cfp?.url || null,
            cfpEndDate: conf.cfp?.endDate ? new Date(conf.cfp.endDate) : null,
            cfpStatus: conf.cfp?.status || null,
            domain: conf.domain,
            description: conf.description || null,
            source: conf.source,
            tags: conf.tags || [],
            financialAid: conf.financialAid || undefined,
          },
          create: {
            id: conf.id,
            name: conf.name,
            url: conf.url,
            startDate: conf.startDate ? new Date(conf.startDate) : null,
            endDate: conf.endDate ? new Date(conf.endDate) : null,
            city: conf.location?.city || null,
            country: conf.location?.country || null,
            lat: conf.location?.lat || null,
            lng: conf.location?.lng || null,
            locationRaw: conf.location?.raw || null,
            online: conf.online || false,
            cfpUrl: conf.cfp?.url || null,
            cfpEndDate: conf.cfp?.endDate ? new Date(conf.cfp.endDate) : null,
            cfpStatus: conf.cfp?.status || null,
            domain: conf.domain,
            description: conf.description || null,
            source: conf.source,
            tags: conf.tags || [],
            financialAid: conf.financialAid || undefined,
          }
        })
      ));
      
      console.log(`Processed ${Math.min(i + BATCH_SIZE, conferences.length)}/${conferences.length}`);
    }
    
    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migrateData();