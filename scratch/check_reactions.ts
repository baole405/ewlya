import { Client, GatewayIntentBits, Partials } from 'discord.js';
import * as dotenv from 'dotenv';

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Reaction, Partials.User],
});

client.on('ready', async () => {
  console.log(`🤖 Logged in as ${client.user?.tag}`);

  try {
    const channelId = process.env.HOF_CHANNEL_ID || '1202984856812781608';
    const channel = await client.channels.fetch(channelId);

    if (channel && channel.isTextBased()) {
      console.log(`Fetching last 20 messages from HOF channel...`);
      const messages = await (channel as any).messages.fetch({ limit: 20 });
      
      for (const [id, msg] of messages) {
        const reactions = Array.from(msg.reactions.cache.keys());
        if (reactions.length > 0) {
          console.log(`Message ${id} by ${msg.author.username} at ${msg.createdAt}:`);
          console.log(`- Reactions cache keys:`, reactions);
          for (const [emojiName, reaction] of msg.reactions.cache) {
            console.log(`  - Reaction: "${emojiName}" (Name: "${reaction.emoji.name}", Identifier: "${reaction.emoji.identifier}")`);
          }
        }
      }
    } else {
      console.log('Channel is not text based or cannot fetch.');
    }
  } catch (err) {
    console.error('Error fetching reactions:', err);
  } finally {
    process.exit(0);
  }
});

client.login(process.env.DISCORD_TOKEN);
