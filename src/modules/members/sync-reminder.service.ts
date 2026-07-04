import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaClient } from '@prisma/client';
import { DiscordBotService } from '../../bot/discord-bot.service';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';

import { performMemberSync, generateConfirmationBoard } from '../../bot/utils/sync-helper';

const prisma = new PrismaClient();

@Injectable()
export class SyncReminderService {
  private readonly logger = new Logger(SyncReminderService.name);

  constructor(private readonly discordBotService: DiscordBotService) {}

  // Run on the 1st of every month at 9:00 AM
  @Cron('0 9 1 * *')
  async monthlySyncReminder() {
    this.logger.log('🔄 Running monthly sync reminder...');
    try {
      const channelId = process.env['ANNOUCEMENTS_ADMIN_CHANNELS_ID'] || '1499036697353261126';
      
      let roleMention = '@mod';
      const adminIds = (process.env['ADMIN_IDS'] || '').split(',').map(id => id.trim()).filter(id => id);

      let guild: any = null;
      try {
        const client = this.discordBotService.getClient();
        if (client) {
          const channel = await client.channels.fetch(channelId).catch(() => null);
          if (channel && channel.isTextBased()) {
            guild = (channel as any).guild;
            if (guild) {
              const modRole = guild.roles.cache.find((r: any) => r.name.toLowerCase() === 'mod');
              if (modRole) roleMention = `<@&${modRole.id}>`;
            }
          }
        }
      } catch (e) {
        this.logger.error('Error fetching role mention:', e);
      }

      if (guild) {
        try {
          await performMemberSync(guild, adminIds);
        } catch (e) {
          this.logger.error('Error auto-syncing members:', e);
          // If sync fails (e.g. rate limit), we still show the board with previous DB data
        }
      }

      const currentMonthName = new Date().toLocaleString('en-US', { month: 'long' });
      const { embed, components } = await generateConfirmationBoard(adminIds, roleMention, currentMonthName);

      await this.discordBotService.sendMessage(channelId, {
        content: `🔔 ALERT ${roleMention}`,
        embeds: [embed],
        components
      });

      this.logger.log(`✅ Sent monthly sync reminder to channel ${channelId}`);
    } catch (error) {
      this.logger.error('❌ Error sending monthly sync reminder:', error);
    }
  }
}
