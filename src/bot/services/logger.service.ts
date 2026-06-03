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

  static async logPoints(
    client: Client,
    options: {
      memberNickname: string;
      memberDiscordId?: string;
      missionText: string;
      points: number;
      seasonName: string;
      adminUsername: string;
    }
  ) {
    const logChannelId = process.env['LOG_OF_LB_POINTS_ID'];
    if (!logChannelId) {
      console.warn('⚠️ LOG_OF_LB_POINTS_ID is not set in .env');
      return;
    }

    try {
      const channel = await client.channels.fetch(logChannelId) as TextChannel;
      if (!channel) {
        console.warn(`⚠️ Could not find log of lb points channel with ID: ${logChannelId}`);
        return;
      }

      let avatarURL: string | null = null;
      if (options.memberDiscordId) {
        try {
          const user = await client.users.fetch(options.memberDiscordId);
          avatarURL = user.displayAvatarURL({ size: 128 });
        } catch {}
      }

      const isNegative = options.points < 0;
      const pointsFormatted = isNegative ? `${options.points}` : `+${options.points}`;

      const embed = new EmbedBuilder()
        .setTitle('📊 Point Log Entry')
        .setColor(isNegative ? 0xef4444 : 0x8b5cf6) // Red for deduction, Purple for grant
        .addFields(
          { name: 'Member', value: options.memberNickname, inline: true },
          { name: 'Mission/Stage', value: options.missionText, inline: true },
          { name: 'Points', value: pointsFormatted, inline: true },
          { name: 'Season', value: options.seasonName, inline: false }
        );

      if (avatarURL) {
        embed.setAuthor({ name: options.memberNickname, iconURL: avatarURL });
      } else {
        embed.setAuthor({ name: options.memberNickname });
      }

      const now = new Date();
      const formattedDate = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()} ${now.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
      embed.setFooter({ text: `Verified by ${options.adminUsername} • ${formattedDate}` });

      await channel.send({ embeds: [embed] });
    } catch (error) {
      console.error('❌ Failed to send points log to Discord:', error);
    }
  }
}
