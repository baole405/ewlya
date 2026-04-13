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
