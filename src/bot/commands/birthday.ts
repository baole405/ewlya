import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  User,
} from 'discord.js';
import { prisma } from '../../database/prisma';
import { BirthdayService } from '../services/birthday.service';

export const data = new SlashCommandBuilder()
  .setName('birthday')
  .setDescription('Manage clan birthdays and celebration announcements')
  .addSubcommand(sub =>
    sub
      .setName('set')
      .setDescription('Set or update your birthday')
      .addStringOption(opt =>
        opt
          .setName('date')
          .setDescription('Your birth date in DD/MM format (e.g., 15/08 or 5/7)')
          .setRequired(true)
      )
      .addIntegerOption(opt =>
        opt
          .setName('year')
          .setDescription('Your birth year (optional, e.g., 2000)')
          .setMinValue(1950)
          .setMaxValue(new Date().getFullYear())
          .setRequired(false)
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('view')
      .setDescription('View a member\'s birthday and countdown')
      .addUserOption(opt =>
        opt
          .setName('user')
          .setDescription('Member to check (defaults to you)')
          .setRequired(false)
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('upcoming')
      .setDescription('View upcoming birthdays in the clan')
  )
  .addSubcommand(sub =>
    sub
      .setName('clear')
      .setDescription('Remove your birthday from the announcement list')
  )
  .addSubcommand(sub =>
    sub
      .setName('test')
      .setDescription('Preview the celebration card in this channel (Admin only)')
      .addUserOption(opt =>
        opt
          .setName('user')
          .setDescription('Member to feature (defaults to you)')
          .setRequired(false)
      )
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const subcommand = interaction.options.getSubcommand();

  // -------------------------------------------------------------
  // 1. SUBCOMMAND: SET
  // -------------------------------------------------------------
  if (subcommand === 'set') {
    const rawDate = interaction.options.getString('date', true);
    const rawYear = interaction.options.getInteger('year');

    const parsed = BirthdayService.parseBirthdate(rawDate, rawYear);
    if (!parsed) {
      return interaction.reply({
        content: '❌ Invalid date. Please use **DD/MM** format (e.g. `15/08` or `5/7`).',
        ephemeral: true,
      });
    }

    // Ensure member exists
    let member = await prisma.member.findUnique({
      where: { discordId: interaction.user.id },
    });

    if (!member) {
      member = await prisma.member.create({
        data: {
          discordId: interaction.user.id,
          ign: interaction.user.username,
          nickname: interaction.user.displayName || interaction.user.username,
          status: 'OFFICIAL',
        },
      });
    }

    await BirthdayService.setBirthday(interaction.user.id, parsed.day, parsed.month, parsed.year);

    const yearText = parsed.year ? `/${parsed.year}` : '';
    return interaction.reply({
      content: `✅ Birthday updated to **${String(parsed.day).padStart(2, '0')}/${String(parsed.month).padStart(2, '0')}${yearText}**.\nYou'll receive an announcement on your special day!`,
      ephemeral: true,
    });
  }

  // -------------------------------------------------------------
  // 2. SUBCOMMAND: CLEAR
  // -------------------------------------------------------------
  if (subcommand === 'clear') {
    await BirthdayService.clearBirthday(interaction.user.id);
    return interaction.reply({
      content: '✅ Birthday removed. You will not receive automated announcements.',
      ephemeral: true,
    });
  }

  // -------------------------------------------------------------
  // 3. SUBCOMMAND: VIEW
  // -------------------------------------------------------------
  if (subcommand === 'view') {
    const targetUser: User = interaction.options.getUser('user') || interaction.user;
    const member = await prisma.member.findUnique({
      where: { discordId: targetUser.id },
    });

    if (!member || !member.birthdate) {
      return interaction.reply({
        content: targetUser.id === interaction.user.id
          ? 'ℹ️ You haven\'t set your birthday yet. Use `/birthday set` to register.'
          : `ℹ️ **${targetUser.username}** has not registered their birthday yet.`,
        ephemeral: true,
      });
    }

    const parsed = BirthdayService.parseBirthdate(member.birthdate);
    if (!parsed) {
      return interaction.reply({
        content: '⚠️ Birthday record is invalid or not specified.',
        ephemeral: true,
      });
    }

    const upcomingList = await BirthdayService.getUpcomingBirthdays(100);
    const item = upcomingList.find(u => u.member.discordId === targetUser.id);
    const daysLeft = item ? item.daysLeft : null;

    let countdownStr = '';
    if (daysLeft === 0) {
      countdownStr = '🎉 **Today is their birthday!**';
    } else if (daysLeft === 1) {
      countdownStr = '⏳ **Tomorrow!**';
    } else if (daysLeft !== null) {
      countdownStr = `⏳ In **${daysLeft}** days`;
    }

    const embed = new EmbedBuilder()
      .setTitle(`🎂 ${member.nickname || targetUser.username}'s Birthday`)
      .setColor(0xf472b6)
      .setThumbnail(targetUser.displayAvatarURL())
      .addFields(
        { name: 'Date', value: `\`${parsed.displayDate}\``, inline: true },
        { name: 'Countdown', value: countdownStr || '—', inline: true }
      )
      .setFooter({ text: 'DarkStar Clan' });

    return interaction.reply({ embeds: [embed] });
  }

  // -------------------------------------------------------------
  // 4. SUBCOMMAND: UPCOMING
  // -------------------------------------------------------------
  if (subcommand === 'upcoming') {
    await interaction.deferReply();

    const upcoming = await BirthdayService.getUpcomingBirthdays(10);
    if (upcoming.length === 0) {
      return interaction.editReply('ℹ️ No upcoming birthdays registered in the clan.');
    }

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const lines = upcoming.map((item, idx) => {
      const { member, parsed, daysLeft } = item;
      const mention = member.discordId ? `<@${member.discordId}>` : `**${member.nickname}**`;
      const dateLabel = `${monthNames[parsed.month - 1]} ${parsed.day}`;

      let badge = '';
      if (daysLeft === 0) badge = ' ➔ 🎉 **Today!**';
      else if (daysLeft === 1) badge = ' ➔ ⏳ **Tomorrow**';
      else badge = ` ➔ in ${daysLeft} days`;

      return `\`${String(idx + 1).padStart(2, ' ')}.\` **${dateLabel}** — ${mention}${badge}`;
    });

    const embed = new EmbedBuilder()
      .setTitle('🎂 Upcoming Clan Birthdays')
      .setColor(0xf472b6)
      .setDescription(lines.join('\n\n'))
      .setFooter({ text: 'DarkStar Clan' })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }

  // -------------------------------------------------------------
  // 5. SUBCOMMAND: TEST (Admin only preview)
  // -------------------------------------------------------------
  if (subcommand === 'test') {
    const adminIds = (process.env['ADMIN_IDS'] || '').split(',').map(id => id.trim()).filter(Boolean);
    if (!adminIds.includes(interaction.user.id)) {
      return interaction.reply({
        content: '❌ Only Administrators can run birthday tests.',
        ephemeral: true,
      });
    }

    const targetUser: User = interaction.options.getUser('user') || interaction.user;
    const member = await prisma.member.findUnique({
      where: { discordId: targetUser.id },
    });

    const embed = BirthdayService.createBirthdayEmbed({
      nickname: member?.nickname || targetUser.displayName || targetUser.username,
      discordId: targetUser.id,
      avatarUrl: targetUser.displayAvatarURL(),
      birthdate: member?.birthdate || '15/08',
    });

    return interaction.reply({
      content: `🎉 Happy Birthday, <@${targetUser.id}>! 🎈\n*(Preview triggered by Admin)*`,
      embeds: [embed],
    });
  }
}
