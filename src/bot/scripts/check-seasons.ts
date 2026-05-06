import { prisma } from '../../database/prisma';

async function checkSeasons() {
  try {
    const seasons = await prisma.season.findMany({
      orderBy: { startDate: 'asc' }
    });
    console.log('--- Current Seasons in Database ---');
    seasons.forEach(s => {
      console.log(`Name: ${s.name}`);
      console.log(`  ID: ${s.id}`);
      console.log(`  Start: ${s.startDate.toISOString()}`);
      console.log(`  End: ${s.endDate ? s.endDate.toISOString() : 'Active (null)'}`);
      console.log(`  Active: ${s.isActive}`);
      console.log('-----------------------------------');
    });
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

checkSeasons();
