import { Client, EmbedBuilder, TextChannel } from 'discord.js';

export class LoggerService {
  static async logAction(client: Client, title: string, description: string, color: number = 0x64748b, fields: { name: string, value: string }[] = []) {
    const logChannelId = process.env['EWLYA_EDIT_LOGS_ID'];
    
    // Console log for debugging
    console.log(`[LOG] ${title}: ${description}`);
    
    if (!logChannelId) {
      console.warn('⚠️ EWLYA_EDIT_LOGS_ID is not set in .env');
      return;
    }

    try {
      const channel = await client.channels.fetch(logChannelId) as TextChannel;
      if (!channel) {
        console.warn(`⚠️ Could not find log channel with ID: ${logChannelId}`);
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .addFields(fields)
        .setTimestamp();

      await channel.send({ embeds: [embed] });
    } catch (error) {
      console.error('❌ Failed to send log to Discord:', error);
    }
  }
}
