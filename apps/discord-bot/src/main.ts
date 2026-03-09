import { Client, GatewayIntentBits, Partials } from 'discord.js';
import 'dotenv/config';
import * as interactionCreate from './events/interactionCreate';
import * as messageReactionAdd from './events/messageReactionAdd';
import * as ready from './events/ready';

console.log('🤖 DarkStar Bot is initializing (Modular Mode)...');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Reaction, Partials.User],
});

// Simple Event Registration
const events = [ready, messageReactionAdd, interactionCreate];

console.log(`📂 Registering ${events.length} event handlers...`);

for (const event of events) {
  const handler = async (...args: any[]) => {
    try {
      await (event as any).execute(...args);
    } catch (err) {
      console.error(`❌ Error in event ${event.name}:`, err);
    }
  };

  if ((event as any).once) {
    client.once(event.name, handler);
  } else {
    client.on(event.name, handler);
  }
}

console.log('🔑 Attempting Discord login...');
client.login(process.env['DISCORD_TOKEN']).catch((err) => {
  console.error('Login Failed:', err);
});
