import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaClient } from '@prisma/client';
import { DiscordBotService } from '../../bot/discord-bot.service';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';

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
      try {
        const client = this.discordBotService.getClient();
        if (client) {
          const channel = await client.channels.fetch(channelId).catch(() => null);
          if (channel && channel.isTextBased()) {
            const guild = (channel as any).guild;
            if (guild) {
              const modRole = guild.roles.cache.find((r: any) => r.name.toLowerCase() === 'mod');
              if (modRole) roleMention = `<@&${modRole.id}>`;
            }
          }
        }
      } catch (e) {
        this.logger.error('Error fetching role mention:', e);
      }

      const count = await prisma.member.count({
        where: { status: 'OFFICIAL' },
      });

      const currentMonthName = new Date().toLocaleString('en-US', { month: 'long' });


      const embed = new EmbedBuilder()
        .setTitle('🚨 MONTHLY MEMBER SYNC ALERT')
        .setColor(0xff0000)
        .setDescription(
          `Hey ${roleMention}, it's time for our monthly member list check for **${currentMonthName}**!\n\n` +
          `We currently have **${count} OFFICIAL members** in the database.\n\n` +
          `Please check if there are any changes to the roster. If there are changes, click **Update Members**. If everything is correct, click **Normal**.`
        )
        .setFooter({ text: 'Liza & The DarkStar Team' })
        .setTimestamp();

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('sync_reminder_update')
          .setLabel('Update Members')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('sync_reminder_normal')
          .setLabel('Normal (No Change)')
          .setStyle(ButtonStyle.Secondary)
      );

      await this.discordBotService.sendMessage(channelId, {
        content: `🔔 ALERT ${roleMention}`,
        embeds: [embed],
        components: [row as any]
      });

      this.logger.log(`✅ Sent monthly sync reminder to channel ${channelId}`);
    } catch (error) {
      this.logger.error('❌ Error sending monthly sync reminder:', error);
    }
  }
}
