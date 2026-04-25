import { Client, Events } from 'discord.js';

/**
 * Handle Client Ready Event
 * Triggered when the bot successfully logs in
 */
export const name = Events.ClientReady;
export const once = true;

export async function execute(client: Client) {
  if (!client.user) return;

  console.log('--------------------------------------------------');
  console.log(`✅ Logged in as: ${client.user.tag}`);
  console.log(`📡 Connected to ${client.guilds.cache.size} guilds`);
  console.log(`🚀 Bot ID: ${client.user.id}`);
  console.log(`✨ Mode: Standalone (Modular)`);
  console.log('--------------------------------------------------');

  // Specific IDs for logging
  const testChannelId = process.env['TEST_CHANNEL_ID'];
  if (testChannelId) console.log(`📡 Test Channel: ${testChannelId}`);
}
