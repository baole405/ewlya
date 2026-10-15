import { Client, EmbedBuilder, TextChannel } from 'discord.js';
import { prisma } from '../../database/prisma';

export interface ParsedBirthday {
  day: number;
  month: number;
  year?: number;
  displayDate: string; // "DD/MM" or "DD/MM/YYYY"
}

export class BirthdayService {
  private static announcedDates = new Set<string>(); // Tracks "YYYY-MM-DD:discordId" to prevent double announcements

  /**
   * Parse a raw birthdate string (DD/MM or DD/MM/YYYY)
   */
  public static parseBirthdate(input: string, yearInput?: number | null): ParsedBirthday | null {
    if (!input || input.trim() === '' || input === 'ND') return null;

    const parts = input.split(/[\/\-\.\s]+/).map(p => p.trim()).filter(Boolean);
    if (parts.length < 2) return null;

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);

    let year = yearInput || undefined;
    if (parts.length >= 3 && /^\d{4}$/.test(parts[2])) {
      year = parseInt(parts[2], 10);
    }

    if (isNaN(day) || isNaN(month) || month < 1 || month > 12 || day < 1 || day > 31) {
      return null;
    }

    // Days per month check
    const daysInMonth = [31, (year && year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (day > daysInMonth[month - 1]) {
      return null;
    }

    const dd = String(day).padStart(2, '0');
    const mm = String(month).padStart(2, '0');
    const displayDate = year ? `${dd}/${mm}/${year}` : `${dd}/${mm}`;

    return { day, month, year, displayDate };
  }

  /**
   * Get current date in UTC+7 (Vietnam Time)
   */
  public static getNowUTC7(): { now: Date; day: number; month: number; year: number; hour: number; minute: number; dateKey: string } {
    const now = new Date();
    // UTC+7 offset
    const utc7Time = new Date(now.getTime() + (7 * 60 + now.getTimezoneOffset()) * 60000);
    const day = utc7Time.getDate();
    const month = utc7Time.getMonth() + 1;
    const year = utc7Time.getFullYear();
    const hour = utc7Time.getHours();
    const minute = utc7Time.getMinutes();
    const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return { now: utc7Time, day, month, year, hour, minute, dateKey };
  }

  /**
   * Set or update birthday for a member
   */
  public static async setBirthday(discordId: string, day: number, month: number, year?: number) {
    const dd = String(day).padStart(2, '0');
    const mm = String(month).padStart(2, '0');
    const dbValue = year ? `${dd}/${mm}/${year}` : `${dd}/${mm}`;

    return prisma.member.update({
      where: { discordId },
      data: { birthdate: dbValue },
    });
  }

  /**
   * Clear birthday for a member
   */
  public static async clearBirthday(discordId: string) {
    return prisma.member.update({
      where: { discordId },
      data: { birthdate: null },
    });
  }

  /**
   * Find all official members whose birthday is today (UTC+7)
   */
  public static async getTodayBirthdays() {
    const { day: currentDay, month: currentMonth } = this.getNowUTC7();

    const members = await prisma.member.findMany({
      where: {
        status: 'OFFICIAL',
        birthdate: { not: null },
      },
    });

    return members.filter(m => {
      const parsed = this.parseBirthdate(m.birthdate || '');
      if (!parsed) return false;
      return parsed.day === currentDay && parsed.month === currentMonth;
    });
  }

  /**
   * Calculate upcoming birthdays sorted by days remaining
   */
  public static async getUpcomingBirthdays(limit: number = 10) {
    const { now, day: curDay, month: curMonth, year: curYear } = this.getNowUTC7();

    const members = await prisma.member.findMany({
      where: {
        status: 'OFFICIAL',
        birthdate: { not: null },
      },
    });

    const list: Array<{
      member: typeof members[0];
      parsed: ParsedBirthday;
      daysLeft: number;
      targetDate: Date;
      turningAge?: number;
    }> = [];

    for (const m of members) {
      const parsed = this.parseBirthdate(m.birthdate || '');
      if (!parsed) continue;

      let bdayThisYear = new Date(curYear, parsed.month - 1, parsed.day);
      let targetYear = curYear;

      // If already passed this year, next one is next year
      const todayStart = new Date(curYear, curMonth - 1, curDay);
      if (bdayThisYear.getTime() < todayStart.getTime()) {
        targetYear = curYear + 1;
        bdayThisYear = new Date(targetYear, parsed.month - 1, parsed.day);
      }

      const diffTime = bdayThisYear.getTime() - todayStart.getTime();
      const daysLeft = Math.round(diffTime / (1000 * 60 * 60 * 24));
      const turningAge = parsed.year ? targetYear - parsed.year : undefined;

      list.push({
        member: m,
        parsed,
        daysLeft,
        targetDate: bdayThisYear,
        turningAge,
      });
    }

    list.sort((a, b) => a.daysLeft - b.daysLeft);
    return list.slice(0, limit);
  }

  /**
   * Create a clean, elegant birthday card embed
   */
  public static createBirthdayEmbed(member: {
    nickname: string;
    discordId?: string | null;
    avatarUrl?: string | null;
    birthdate?: string | null;
  }) {
    const mention = member.discordId ? `<@${member.discordId}>` : `**${member.nickname}**`;
    const bannerUrl = process.env['BIRTHDAY_IMAGE_URL'] || 'https://media.giphy.com/media/g5R6Ix5ix2lUY/giphy.gif';

    const embed = new EmbedBuilder()
      .setTitle('🎂 Happy Birthday!')
      .setDescription(
        `Wishing a fantastic Happy Birthday to ${mention}!\nMay your year ahead be filled with great health, joy, and success.`
      )
      .setColor(0xf472b6) // Rose pink
      .setThumbnail(member.avatarUrl || null)
      .setImage(bannerUrl)
      .setFooter({ text: 'DarkStar Clan' })
      .setTimestamp();

    return embed;
  }

  /**
   * Announce today's birthdays to designated channel
   */
  public static async announceTodaysBirthdays(client: Client, targetChannelId?: string): Promise<number> {
    const { dateKey } = this.getNowUTC7();
    const birthdays = await this.getTodayBirthdays();

    if (birthdays.length === 0) return 0;

    const channelId = targetChannelId || process.env['BIRTHDAY_CHANNEL_ID'] || process.env['ANNOUCEMENTS_CHANNELS_ID'];
    if (!channelId) {
      console.warn('⚠️ No BIRTHDAY_CHANNEL_ID or ANNOUCEMENTS_CHANNELS_ID configured.');
      return 0;
    }

    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) {
      console.warn(`⚠️ Birthday channel ${channelId} not found or not text-based.`);
      return 0;
    }

    let announcedCount = 0;

    for (const member of birthdays) {
      const key = `${dateKey}:${member.discordId || member.id}`;
      // Prevent duplicate announcement today
      if (this.announcedDates.has(key)) {
        continue;
      }

      // Try fetching Discord avatar if member avatar is null
      let avatar = member.avatarUrl;
      if (!avatar && member.discordId) {
        try {
          const user = await client.users.fetch(member.discordId);
          avatar = user.displayAvatarURL();
        } catch {}
      }

      const embed = this.createBirthdayEmbed({
        nickname: member.nickname,
        discordId: member.discordId,
        avatarUrl: avatar,
        birthdate: member.birthdate,
      });

      const mention = member.discordId ? `<@${member.discordId}>` : `**${member.nickname}**`;
      await (channel as TextChannel).send({
        content: `🎉 Happy Birthday, ${mention}! 🎈`,
        embeds: [embed],
      });

      this.announcedDates.add(key);
      announcedCount++;
      console.log(`🎂 [BirthdayService] Announced birthday for ${member.nickname} (${member.discordId})`);
    }

    return announcedCount;
  }
}
