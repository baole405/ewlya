import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { prisma } from '../../database/prisma';

export const data = new SlashCommandBuilder()
  .setName('postpone-mines')
  .setDescription('Postpone an active Mines check (Admin Only)')
  .addStringOption(option => 
    option.setName('id')
      .setDescription('The ID of the check to postpone')
      .setRequired(true)
  )
  .addStringOption(option => 
    option.setName('reason')
      .setDescription('Reason for postponement (e.g., Game Patch)')
      .setRequired(false)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction) {
  const adminIds = (process.env['ADMIN_IDS'] || '').split(',');
  if (!adminIds.includes(interaction.user.id)) {
    return interaction.reply({ content: '❌ Permission denied.', ephemeral: true });
  }

  const id = interaction.options.getString('id', true);
  const reason = interaction.options.getString('reason') || 'No reason provided';

  await interaction.deferReply({ ephemeral: true });

  try {
    const check = await prisma.progressionCheck.findUnique({ where: { id } });
    if (!check) return interaction.editReply('❌ Check not found.');

    const updated = await (prisma.progressionCheck as any).update({
      where: { id },
      data: { status: 'POSTPONED' }
    });

    const embed = new EmbedBuilder()
      .setTitle('🟠 Mines Check Postponed')
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
