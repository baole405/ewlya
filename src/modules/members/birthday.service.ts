import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaClient } from '@prisma/client';
import { DiscordBotService } from '../../bot/discord-bot.service';
import { EmbedBuilder } from 'discord.js';

const prisma = new PrismaClient();

@Injectable()
export class BirthdayService {
  private readonly logger = new Logger(BirthdayService.name);

  constructor(private readonly discordBotService: DiscordBotService) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkBirthdays() {
    this.logger.log('🎂 Running daily birthday check...');
    try {
      const today = new Date();
      const currentDay = today.getDate();
      const currentMonth = today.getMonth() + 1; // 1-12

      // Fetch all OFFICIAL members who have a birthdate
      const members = await prisma.member.findMany({
        where: {
          status: 'OFFICIAL',
          birthdate: { not: null },
        },
      });

      const birthdayMembers = members.filter((member) => {
        if (!member.birthdate || member.birthdate === 'ND') return false;

        // Parse birthdate which could be "DD/MM/YYYY" or "D/M/YYYY"
        const parts = member.birthdate.split('/');
        if (parts.length >= 2) {
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10);
          return day === currentDay && month === currentMonth;
        }
        return false;
      });

      if (birthdayMembers.length === 0) {
        this.logger.log('ℹ️ No birthdays today.');
        return;
      }

      this.logger.log(`🎉 Found ${birthdayMembers.length} birthdays today!`);

      const channelId = process.env['BIRTHDAY_CHANNEL_ID'] || '1370483716362731630';

      for (const member of birthdayMembers) {
        await this.sendBirthdayWish(channelId, member.nickname, member.discordId);
      }
    } catch (error) {
      this.logger.error('❌ Error checking birthdays:', error);
    }
  }

  async sendBirthdayWish(channelId: string, nickname: string, discordId: string | null) {
    const mention = discordId ? `<@${discordId}>` : `**${nickname}**`;
    
    const embed = new EmbedBuilder()
      .setTitle('🎉 Happy Birthday! 🎂')
      .setDescription(
        `Wishing a fantastic birthday to ${mention}!\n\n` +
        `May your day be filled with joy, loot, and amazing adventures! 🌟\n` +
        `Enjoy your special day, from everyone at DarkStar!`
      )
      .setColor(0xff69b4) // Hot pink / Birthday color
      .setThumbnail('https://cdn.discordapp.com/attachments/1370483716362731630/1370483716362731630/birthday_cake.png') // Replace with an actual cake image url if you have one, or remove thumbnail. Using a generic emoji-like color.
      .setFooter({ text: 'Liza & The DarkStar Team ❤️' });

    await this.discordBotService.sendMessage(channelId, {
      content: `🎉 Happy Birthday, ${mention}! 🥳`,
      embeds: [embed],
    });
    
    this.logger.log(`✅ Sent birthday wish to ${nickname}`);
  }
}
