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
      // Fetch all guilds
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

      // Get DB members
      const dbMembers = await prisma.member.findMany();
      console.log(`📋 DB members count: ${dbMembers.length}`);

      const leftMembers = [];
      const formerMembersInDb = [];

      for (const dbMember of dbMembers) {
        if (!dbMember.discordId) {
          // Former member seeded without discordId
          formerMembersInDb.push(dbMember);
          continue;
        }

        const existsInGuild = guildMembers.has(dbMember.discordId);
        if (!existsInGuild) {
          leftMembers.push(dbMember);
        }
      }

      console.log('\n--- Members in DB but NOT in the Discord Guild (Left Server) ---');
      for (const m of leftMembers) {
        console.log(`- ${m.nickname} (IGN: ${m.ign}) | Status: ${m.status} | Discord ID: ${m.discordId}`);
      }

      console.log('\n--- Former Members seeded in DB without Discord ID ---');
      for (const m of formerMembersInDb) {
        console.log(`- ${m.nickname} (IGN: ${m.ign}) | Status: ${m.status}`);
      }

    } catch (err) {
      console.error('❌ Error comparing members:', err);
    } finally {
      await prisma.$disconnect();
      client.destroy();
    }
  });

  await client.login(token);
}

main().catch(console.error);
