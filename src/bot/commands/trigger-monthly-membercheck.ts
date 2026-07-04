import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { prisma } from '../../database/prisma';

export const data = new SlashCommandBuilder()
  .setName('trigger-monthly-membercheck')
  .setDescription('Cheat command to trigger the monthly member check (Dev only)')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction) {
  // Only allow in TEST_CHANNEL_ID: 1424269975698407454
  if (interaction.channelId !== '1424269975698407454') {
    return interaction.reply({ content: '❌ This command can only be used in the designated test channel.', ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: false });

  try {
    const count = await prisma.member.count({
      where: { status: 'OFFICIAL' },
    });

    const currentMonthName = new Date().toLocaleString('en-US', { month: 'long' });

    let roleMention = '@mod';
    if (interaction.guild) {
      const modRole = interaction.guild.roles.cache.find((r: any) => r.name.toLowerCase() === 'mod');
      if (modRole) roleMention = `<@&${modRole.id}>`;
    }

    const embed = new EmbedBuilder()
      .setTitle('🚨 MONTHLY MEMBER SYNC ALERT')
      .setColor(0xff0000)
      .setDescription(
        `Hey ${roleMention}, it's time for our monthly member list check for **${currentMonthName}**!\n\n` +
        `We currently have **${count} OFFICIAL members** in the database.\n\n` +
        `Please check if there are any changes to the roster. If there are changes, click **Update Members**. If everything is correct, click **Normal**.`
      )
      .setFooter({ text: 'Liza & The DarkStar Team (TEST TRIGGER)' })
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

    await interaction.editReply({
      content: `🔔 ALERT ${roleMention}`,
      embeds: [embed],
      components: [row]
    });

  } catch (error) {
    console.error(error);
    await interaction.editReply('❌ Failed to trigger monthly member check.');
  }
}
