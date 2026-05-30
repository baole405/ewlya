import { Client, GatewayIntentBits, Partials } from 'discord.js';
import 'dotenv/config';

async function main() {
  const token = process.env['DISCORD_TOKEN'];
  if (!token) {
    console.error('❌ DISCORD_TOKEN is missing in environment.');
    return;
  }

  console.log('🤖 Logging in to Discord to clear bot messages...');
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
    ],
    partials: [Partials.Message, Partials.Channel],
  });

  client.once('ready', async () => {
    console.log(`✅ Logged in as ${client.user?.tag}`);
    const channelId = '1370483716362731630';

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

      let deletedCount = 0;
      for (const [id, msg] of messages) {
        if (msg.author.bot) {
          console.log(`🗑️ Deleting message from ${msg.author.tag} (ID: ${msg.id})...`);
          await msg.delete();
          deletedCount++;
          // Add a small delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      console.log(`✅ Cleared ${deletedCount} bot messages.`);

    } catch (err) {
      console.error('❌ Error clearing bot messages:', err);
    } finally {
      client.destroy();
    }
  });

  await client.login(token);
}

main().catch(console.error);
