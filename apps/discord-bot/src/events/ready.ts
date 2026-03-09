import { Client, Events } from 'discord.js';

export const name = Events.ClientReady;
export const once = true;

export async function execute(client: Client) {
  console.log(`✅ Logged in as ${client.user?.tag}!`);
  console.log(`📡 HOF Channel: ${process.env['HOF_CHANNEL_ID']}`);
  console.log(`📡 Test Channel: ${process.env['TEST_CHANNEL_ID']}`);
  console.log('🚀 Bot is fully operational and ready for use.');
}
