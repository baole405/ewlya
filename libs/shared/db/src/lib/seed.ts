import { PrismaClient, Role } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

/**
 * Script to seed clan member data from docs/data-user.md
 * Handles "ND" as null and maps nickname/IGN correctly even with spaces.
 */
async function main() {
  console.log('🌱 Starting seed process...');

  // Clear existing data to ensure a clean slate
  console.log('🧹 Clearing existing data...');
  await prisma.box.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.user.deleteMany();
  await prisma.member.deleteMany();
  await prisma.season.deleteMany();

  const filePath = path.join(process.cwd(), 'docs', 'data-user.md');
  if (!fs.existsSync(filePath)) {
    console.error('❌ Data file not found at:', filePath);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter((line) => line.trim() !== '');

  // Skip the header line
  const dataLines = lines.slice(1);

  for (const line of dataLines) {
    try {
      // Regex to find Discord ID (17-20 digits) and GS Code (7-10 digits)
      const discordIdMatch = line.match(/\b\d{17,20}\b/);
      if (!discordIdMatch) {
        console.warn('⚠️ Missing Discord ID in line:', line);
        continue;
      }

      const discordId = discordIdMatch[0];
      const discordIdIndex = line.indexOf(discordId);

      // Everything before Discord ID is Nickname and IGN
      const beforeDiscord = line.substring(0, discordIdIndex).trim();
      // Heuristic: First word is Nickname, the rest is IGN
      const nameParts = beforeDiscord.split(/\s+/);
      const nickname = nameParts[0];
      const ign = nameParts.slice(1).join(' ') || nickname;

      // Everything after Discord ID contains GS Code, Gender, Age, Birthdate
      const afterDiscord = line.substring(discordIdIndex + discordId.length).trim();
      const partsAfter = afterDiscord.split(/\s+/);

      // GS Code is the first block of digits in partsAfter
      const gsCode = partsAfter[0] && partsAfter[0].match(/^\d+$/) ? partsAfter[0] : null;

      // Shift indices if gsCode was present
      const shift = gsCode ? 1 : 0;

      const gender = partsAfter[0 + shift] === 'ND' ? null : partsAfter[0 + shift] || null;
      const age = partsAfter[1 + shift] === 'ND' ? null : partsAfter[1 + shift] || null;
      const birthdate = partsAfter[2 + shift] === 'ND' ? null : partsAfter[2 + shift] || null;

      console.log(`👤 Upserting: ${nickname} (${ign}) - ID: ${discordId}`);

      await prisma.member.upsert({
        where: { nickname: nickname },
        update: {
          ign,
          discordId,
          gsCode,
          gender,
          age,
          birthdate,
        },
        create: {
          nickname,
          ign,
          discordId,
          gsCode,
          gender,
          age,
          birthdate,
          role: Role.MEMBER,
        },
      });
    } catch (error) {
      console.error('❌ Error processing line:', line, error);
    }
  }

  // --- Process Former Members (Archived) ---
  console.log('📦 Processing former members...');
  const formerMembers = [
    {
      nickname: 'White Hero',
      ign: 'ヒーロー',
      discordId: null,
      gender: 'M',
      age: '22',
      birthdate: '22/8/2001',
      country: 'Spain',
    },
    {
      nickname: 'batter',
      ign: 'Nel batter.',
      discordId: null,
      gender: 'F',
      age: '23',
      birthdate: null,
      country: 'Japan',
    },
    {
      nickname: 'Lust',
      ign: 'ki_rito',
      discordId: null,
      gsCode: '122523925',
      gender: 'M',
      age: null,
      birthdate: null,
      country: 'France',
    },
    {
      nickname: 'Miyubi',
      ign: 'Miyubi',
      discordId: '277609281304395788',
      gender: 'M',
      age: null,
      birthdate: '9/2/2004',
      country: 'USA',
    },
    {
      nickname: 'Sora',
      ign: 'SorA devilsora0512',
      discordId: null,
      gender: 'M',
      age: '24',
      birthdate: '5/12/2000',
      country: 'Vietnam',
    },
    {
      nickname: 'Mangagirl',
      ign: 'H16',
      discordId: '198578775280189440',
      gsCode: '151988668',
      gender: 'M',
      age: '22',
      birthdate: null,
      country: 'USA',
    },
    {
      nickname: 'Filo',
      ign: 'FL FILO',
      discordId: '591972758443917317',
      gender: 'M',
      age: '24',
      birthdate: '14/04/2004',
      country: 'Vietnam',
    },
    {
      nickname: 'Astolfo',
      ign: 'CesSimp',
      discordId: '636901503579193346',
      gender: 'M',
      age: '19',
      birthdate: '31/01/2005',
      country: 'Vietnam',
    },
    {
      nickname: 'Jviper',
      ign: 'Jviper',
      discordId: null,
      gender: null,
      age: null,
      birthdate: null,
      country: null,
    },
    {
      nickname: 'Forte???',
      ign: 'Forte??? my_lil_forte Fortesimp',
      discordId: null,
      gender: null,
      age: null,
      birthdate: null,
      country: null,
    },
    {
      nickname: 'Haoleaves',
      ign: 'Haoleaves',
      discordId: '482063999710527488',
      gsCode: '722069910',
      gender: 'M',
      age: null,
      birthdate: null,
      country: 'Vietnam',
    },
  ];

  for (const m of formerMembers) {
    try {
      console.log(`👤 Upserting (Archived): ${m.nickname}`);
      await prisma.member.upsert({
        where: { nickname: m.nickname },
        update: {
          ign: m.ign,
          discordId: m.discordId,
          gsCode: m.gsCode || null,
          gender: m.gender,
          age: m.age,
          birthdate: m.birthdate,
          country: m.country,
          status: 'FORMER',
        },
        create: {
          nickname: m.nickname,
          ign: m.ign,
          discordId: m.discordId,
          gsCode: m.gsCode || null,
          gender: m.gender,
          age: m.age,
          birthdate: m.birthdate,
          country: m.country,
          role: Role.MEMBER,
          status: 'FORMER',
        },
      });
    } catch (error) {
      console.error('❌ Error processing former member:', m.nickname, error);
    }
  }

  console.log('✅ Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
