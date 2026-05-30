import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
  const token = process.env['DISCORD_TOKEN'];
  if (!token) {
    console.error('❌ DISCORD_TOKEN is missing in environment.');
    return;
  }

  const args = process.argv.slice(2);
  const isDeleteAll = args.includes('--delete-all');
  const isDeleteActiveLeft = args.includes('--delete-active-left');
  const isDryRun = !isDeleteAll && !isDeleteActiveLeft;

  if (isDryRun) {
    console.log('🔍 Running in DRY-RUN mode. No deletions will be made.');
    console.log('👉 To delete active members who left: npm run db:cleanup -- --delete-active-left');
    console.log('👉 To delete ALL former and left members: npm run db:cleanup -- --delete-all\n');
  } else {
    console.log(`⚠️ EXECUTION MODE ACTIVE: Deleting records... (${isDeleteAll ? 'ALL' : 'ACTIVE LEFT ONLY'})\n`);
  }

  console.log('🤖 Logging in to Discord...');
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
    ],
    partials: [Partials.User, Partials.GuildMember],
  });

  client.once('ready', async () => {
    console.log(`✅ Logged in as ${client.user?.tag}`);

    try {
      const guilds = await client.guilds.fetch();
      const firstGuildId = guilds.first()?.id;
      if (!firstGuildId) {
        console.error('❌ No guilds found for this bot.');
        client.destroy();
        return;
      }

      console.log(`📡 Fetching members for Guild ID: ${firstGuildId}...`);
      const guild = await client.guilds.fetch(firstGuildId);
      const guildMembers = await guild.members.fetch();
      console.log(`📥 Guild members fetched: ${guildMembers.size}`);

      // Query database members
      const dbMembers = await prisma.member.findMany();
      
      const activeLeft: typeof dbMembers = [];
      const legacyFormer: typeof dbMembers = [];

      for (const m of dbMembers) {
        if (!m.discordId) {
          legacyFormer.push(m);
          continue;
        }

        if (m.discordId === '000000000000000000') {
          legacyFormer.push(m);
          continue;
        }

        const exists = guildMembers.has(m.discordId);
        if (!exists) {
          if (m.status === 'FORMER') {
            legacyFormer.push(m);
          } else {
            activeLeft.push(m);
          }
        }
      }

      console.log('\n--- Group A: Active Members Who Left Server (OFFICIAL/TRIAL in DB) ---');
      for (const m of activeLeft) {
        console.log(`- ${m.nickname} (IGN: ${m.ign}) | Status: ${m.status} | ID: ${m.discordId}`);
      }

      console.log('\n--- Group B: Legacy Former Members (FORMER in DB) ---');
      for (const m of legacyFormer) {
        console.log(`- ${m.nickname} (IGN: ${m.ign}) | Status: ${m.status} | ID: ${m.discordId || 'None'}`);
      }

      const toDelete: typeof dbMembers = [];
      if (isDeleteAll) {
        toDelete.push(...activeLeft, ...legacyFormer);
      } else if (isDeleteActiveLeft) {
        toDelete.push(...activeLeft);
      }

      if (toDelete.length > 0) {
        console.log(`\n🧹 Starting deletion of ${toDelete.length} member(s)...`);
        for (const m of toDelete) {
          console.log(`❌ Deleting member ${m.nickname} (${m.ign}) and related records...`);
          
          await prisma.$transaction(async (tx) => {
            // Delete associated boxes
            const boxes = await tx.box.deleteMany({ where: { memberId: m.id } });
            // Delete associated submissions
            const sub = await tx.submission.deleteMany({ where: { memberId: m.id } });
            // Delete associated progression statuses
            const prog = await tx.memberProgressionStatus.deleteMany({ where: { memberId: m.id } });
            // Delete associated requirement statuses
            const req = await tx.memberRequirementStatus.deleteMany({ where: { memberId: m.id } });
            // Delete linked user if any
            const user = await tx.user.deleteMany({ where: { memberId: m.id } });
            // Delete the member record itself
            await tx.member.delete({ where: { id: m.id } });
            
            console.log(`   Deleted: ${boxes.count} boxes, ${sub.count} submissions, ${prog.count} progression checks, ${req.count} requirements, ${user.count} user accounts.`);
          });
        }
        console.log('✅ Deletions completed successfully!');
      } else {
        console.log('\n📝 No deletions were executed (dry-run or empty target list).');
      }

    } catch (err) {
      console.error('❌ Error during cleanup process:', err);
    } finally {
      await prisma.$disconnect();
      client.destroy();
    }
  });

  await client.login(token);
}

main().catch(console.error);
