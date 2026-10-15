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
  async checkBirthdaysCron() {
    this.logger.log('🎂 Running daily birthday check...');
    await this.checkBirthdays(true);
  }

  async checkBirthdays(sendMessages: boolean = true) {
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
          const day = parseInt(parts[0].trim(), 10);
          const month = parseInt(parts[1].trim(), 10);
          return day === currentDay && month === currentMonth;
        }
        return false;
      });

      if (birthdayMembers.length === 0) {
        this.logger.log('ℹ️ No birthdays today.');
        return [];
      }

      this.logger.log(`🎉 Found ${birthdayMembers.length} birthdays today!`);

      if (sendMessages) {
        const channelId = process.env['BIRTHDAY_CHANNEL_ID'] || '1370483716362731630';
        for (const member of birthdayMembers) {
          await this.sendBirthdayWish(channelId, member.nickname, member.discordId);
        }
      }
      
      return birthdayMembers;
    } catch (error) {
      this.logger.error('❌ Error checking birthdays:', error);
      throw error;
    }
  }

  async sendBirthdayWish(channelId: string, nickname: string, discordId: string | null) {
    const mention = discordId ? `<@${discordId}>` : `**${nickname}**`;
    const bannerUrl = process.env['BIRTHDAY_IMAGE_URL'] || 'https://media.giphy.com/media/g5R6Ix5ix2lUY/giphy.gif';
    const stickerId = process.env['BIRTHDAY_STICKER_ID']?.trim();
    
    const embed = new EmbedBuilder()
      .setTitle('🎂 Happy Birthday!')
      .setDescription(
        `Wishing a fantastic Happy Birthday to ${mention}!\nMay your year ahead be filled with great health, joy, and success.`
      )
      .setColor(0xf472b6) // Rose pink
      .setImage(bannerUrl)
      .setFooter({ text: 'DarkStar Clan' })
      .setTimestamp();

    const messageOptions: any = {
      content: `🎉 **Happy Birthday, ${mention}!** 🥳🎈`,
      embeds: [embed],
    };

    if (stickerId) {
      messageOptions.stickers = [stickerId];
    }

    await this.discordBotService.sendMessage(channelId, messageOptions);
    this.logger.log(`✅ Sent birthday wish to ${nickname}`);
  }
}
