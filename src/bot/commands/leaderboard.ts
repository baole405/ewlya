import { SlashCommandBuilder, ChatInputCommandInteraction, AutocompleteInteraction } from 'discord.js';
import { SeasonService } from '../services/season.service';
import { prisma } from '../../database/prisma';

export const data = new SlashCommandBuilder()
  .setName('leaderboard')
  .setDescription('View live or past DarkStar Clan leaderboard & scoreboard UI')
  .addStringOption(opt =>
    opt.setName('season')
       .setDescription('Select a season to view (leave empty for current active season)')
       .setRequired(false)
       .setAutocomplete(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();
  const seasonId = interaction.options.getString('season');
  if (seasonId) {
    return SeasonService.viewPastSeason(interaction);
  }
  return SeasonService.generateLeaderboard(interaction);
}

export async function autocomplete(interaction: AutocompleteInteraction) {
  const focusedValue = interaction.options.getFocused().toLowerCase();
  const seasons = await prisma.season.findMany({
    orderBy: { startDate: 'desc' },
    take: 25,
  });

  const filtered = seasons.filter(s => s.name.toLowerCase().includes(focusedValue));
  await interaction.respond(
    filtered.map(s => ({ name: `${s.name}${s.isActive ? ' (Active)' : ''}`, value: s.id }))
  );
}
