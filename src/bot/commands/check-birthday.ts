import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { BirthdayService } from '../../modules/members/birthday.service';

export const data = new SlashCommandBuilder()
  .setName('check-birthday')
  .setDescription('Cheat command to check birthdays for today (Dev only)')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction) {
  // Only allow in TEST_CHANNEL_ID: 1424269975698407454
  if (interaction.channelId !== '1424269975698407454') {
    return interaction.reply({ content: '❌ This command can only be used in the designated test channel.', ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: false });

  try {
    // Because this is outside the NestJS DI container, we'll instantiate it directly.
    // We pass null for discordBotService because we only use checkBirthdays(false),
    // which does not call discordBotService.sendMessage.
    const birthdayService = new BirthdayService(null as any);
    
    // Pass false to not actually spam the real channel during a check
    const birthdayMembers = await birthdayService.checkBirthdays(false);

    if (birthdayMembers.length === 0) {
      return interaction.editReply('ℹ️ No birthdays found for today based on the database records.');
    }

    const mentions = birthdayMembers.map(m => `<@${m.discordId || 'N/A'}> (${m.nickname || m.ign})`).join('\n- ');
    
    const embed = new EmbedBuilder()
      .setTitle('🎂 Birthday Check Result (TEST)')
      .setColor(0xeab308)
      .setDescription(`Found **${birthdayMembers.length}** birthday(s) today:\n\n- ${mentions}\n\n*Note: Real cron job runs at 9:00 AM and posts to the designated birthday channel.*`)
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('Error in /check-birthday command:', error);
    await interaction.editReply({ content: '❌ An error occurred while checking birthdays.' });
  }
}
