import { Client, GatewayIntentBits, Partials } from 'discord.js';
import 'dotenv/config';

async function main() {
  const token = process.env['DISCORD_TOKEN'];
  if (!token) {
    console.error('❌ DISCORD_TOKEN is missing in environment.');
    return;
  }

  console.log('🤖 Logging in to Discord to inspect channel...');
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Message, Partials.Channel],
  });

  client.once('ready', async () => {
    console.log(`✅ Logged in as ${client.user?.tag}`);
    const channelId = '1505244602318454904';

    try {
      const channel = await client.channels.fetch(channelId);
      if (!channel) {
        console.error(`❌ Channel ${channelId} not found.`);
        client.destroy();
        return;
      }

      if (!channel.isTextBased()) {
        console.error('❌ Channel is not text-based.');
        client.destroy();
        return;
      }

      console.log(`📡 Fetching messages from channel: ${(channel as any).name || channelId}...`);
      const messages = await channel.messages.fetch({ limit: 100 });
      console.log(`📥 Fetched ${messages.size} messages.`);

      for (const [id, msg] of messages) {
        console.log(`[${msg.createdAt.toISOString()}] ${msg.author.bot ? '🤖 BOT' : '👤 USER'} ${msg.author.tag} (${msg.author.id}):`);
        console.log(`   Content: ${msg.content}`);
        if (msg.embeds.length > 0) {
          console.log(`   Embeds count: ${msg.embeds.length}`);
          msg.embeds.forEach((emb, i) => {
            console.log(`     Embed ${i + 1} Title: ${emb.title}`);
            console.log(`     Embed ${i + 1} Description: ${emb.description}`);
            if (emb.fields.length > 0) {
              console.log(`     Embed ${i + 1} Fields:`, emb.fields.map(f => `${f.name}: ${f.value}`));
            }
          });
        }
        console.log('---');
      }

    } catch (err) {
      console.error('❌ Error inspecting channel:', err);
    } finally {
      client.destroy();
    }
  });

  await client.login(token);
}

main().catch(console.error);
