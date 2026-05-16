import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { prisma } from '../../database/prisma';

export const data = new SlashCommandBuilder()
  .setName('postpone-check')
  .setDescription('Postpone the active progression check (Admin Only)')
  .addStringOption(option => 
    option.setName('reason')
      .setDescription('Reason for postponement (e.g., Game Patch)')
      .setRequired(true)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction) {
  const adminIds = (process.env['ADMIN_IDS'] || '').split(',');
  if (!adminIds.includes(interaction.user.id)) {
    return interaction.reply({ content: '❌ Permission denied.', ephemeral: true });
  }

  const reason = interaction.options.getString('reason', true);

  await interaction.deferReply({ ephemeral: true });

  try {
    const check = await prisma.progressionCheck.findFirst({
      where: { deletedAt: null, status: 'ACTIVE' }
    });

    if (!check) {
      return interaction.editReply('❌ No active progression check found to postpone.');
    }

    const updated = await (prisma.progressionCheck as any).update({
      where: { id: check.id },
      data: { status: 'POSTPONED' }
    });

    const embed = new EmbedBuilder()
      .setTitle('🟠 Progression Check Postponed')
      .setColor(0xf97316)
      .setDescription(`The progression check **${updated.title}** has been postponed.`)
      .addFields(
        { name: 'Reason', value: reason },
        { name: 'ID', value: `\`${updated.id}\`` }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error(error);
    await interaction.editReply('❌ Failed to postpone check.');
  }
}
