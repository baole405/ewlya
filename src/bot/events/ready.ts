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

  // --------------------------------------------------
  // AUTOMATED END-OF-MONTH REMINDER
  // --------------------------------------------------
  let lastNotifiedMonth = -1;

  const checkEndOfMonth = async () => {
    const now = new Date();
    // Check if it's the 28th of the month and we haven't notified yet this month
    if (now.getDate() === 28 && lastNotifiedMonth !== now.getMonth()) {
      lastNotifiedMonth = now.getMonth();
      
      const adminAnnounceId = process.env['ANNOUCEMENTS_ADMIN_CHANNELS_ID'];
      if (!adminAnnounceId) return;

      try {
        const channel = await client.channels.fetch(adminAnnounceId);
        if (channel && channel.isTextBased()) {
          // Send the reminder
          await (channel as any).send(
            `⚠️ **Attention Admins!**\nThe month is ending soon! Please remember to run \`/season close\` in the next few days to tally all points, post the final leaderboard to the Hall of Fame, and close out the month.`
          );
          console.log('[CRON] Sent end-of-month reminder to admins.');
        }
      } catch (err) {
        console.error('[CRON] Failed to send end-of-month reminder:', err);
      }
    }
  };

  // Run once on startup, then every hour
  checkEndOfMonth();
  setInterval(checkEndOfMonth, 1000 * 60 * 60);
}
