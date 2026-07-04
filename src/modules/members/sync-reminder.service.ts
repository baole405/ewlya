import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaClient } from '@prisma/client';
import { DiscordBotService } from '../../bot/discord-bot.service';
import { EmbedBuilder } from 'discord.js';

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
      
      const count = await prisma.member.count({
        where: { status: 'OFFICIAL' },
      });

      const embed = new EmbedBuilder()
        .setTitle('📊 Monthly Member Sync Reminder')
        .setColor(0x0099ff)
        .setDescription(
          `Hey <@&mod>, it's time for our monthly member list check!\n\n` +
          `We currently have **${count} OFFICIAL members** in the database.\n\n` +
          `Please run the \`/sync-members\` command to manually check and update the members list from the server to ensure our database is accurate.`
        )
        .setFooter({ text: 'Liza & The DarkStar Team' })
        .setTimestamp();

      await this.discordBotService.sendMessage(channelId, {
        content: `Attention @mod! Time to sync members.`,
        embeds: [embed],
      });

      this.logger.log(`✅ Sent monthly sync reminder to channel ${channelId}`);
    } catch (error) {
      this.logger.error('❌ Error sending monthly sync reminder:', error);
    }
  }
}
