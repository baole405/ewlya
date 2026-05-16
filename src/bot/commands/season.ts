import { SlashCommandBuilder, ChatInputCommandInteraction, AutocompleteInteraction } from 'discord.js';
import { SeasonService } from '../services/season.service';
import { PointService } from '../services/point.service';
import { prisma } from '../../database/prisma';

export const data = new SlashCommandBuilder()
  .setName('season')
  .setDescription('Manage monthly seasons and leaderboards (Admins only)')
  .addSubcommand(sub =>
    sub.setName('start')
       .setDescription('Start a new monthly season. Automatically names it based on current month/year.')
  )
  .addSubcommand(sub =>
    sub.setName('leaderboard')
       .setDescription('View the live leaderboard for the active season.')
  )
  .addSubcommand(sub =>
    sub.setName('close')
       .setDescription('Close the active season and post the final scoreboard.')
  )
  .addSubcommand(sub =>
    sub.setName('view')
       .setDescription('View results from a past season.')
       .addStringOption(opt => 
         opt.setName('name')
            .setDescription('The name of the season to view')
            .setRequired(true)
            .setAutocomplete(true)
       )
  )
  .addSubcommandGroup(group =>
    group.setName('edit')
         .setDescription('Edit season data')
         .addSubcommand(sub =>
           sub.setName('name')
              .setDescription('Rename a closed season.')
              .addStringOption(opt =>
                opt.setName('target_season')
                   .setDescription('The closed season to rename')
                   .setRequired(true)
                   .setAutocomplete(true)
              )
              .addStringOption(opt =>
                opt.setName('new_name')
                   .setDescription('The new name for the season')
                   .setRequired(true)
                   .setAutocomplete(true)
              )
         )
  )
  .addSubcommandGroup(group =>
    group.setName('fix')
         .setDescription('Fix points for past seasons')
         .addSubcommand(sub =>
           sub.setName('old-season')
              .setDescription('Retroactively add/subtract points for a member in a closed season.')
              .addStringOption(opt => 
                opt.setName('member')
                   .setDescription('The member to receive points')
                   .setRequired(true)
                   .setAutocomplete(true)
              )
              .addStringOption(opt =>
                opt.setName('season')
                   .setDescription('The closed season to modify')
                   .setRequired(true)
                   .setAutocomplete(true)
              )
              .addIntegerOption(opt => opt.setName('amount').setDescription('Amount of points to grant (use negative to subtract)').setRequired(true))
              .addStringOption(opt => opt.setName('reason').setDescription('Reason for the modification').setRequired(true))
         )
  )
  .addSubcommandGroup(group =>
    group.setName('add')
         .setDescription('Add points manually')
         .addSubcommand(sub =>
           sub.setName('point')
              .setDescription('Manually grant points to a member in the ACTIVE season.')
              .addStringOption(opt => 
                opt.setName('member')
                   .setDescription('The member to receive points')
                   .setRequired(true)
                   .setAutocomplete(true)
              )
              .addIntegerOption(opt => opt.setName('amount').setDescription('Amount of points to grant').setRequired(true))
              .addStringOption(opt => opt.setName('reason').setDescription('Reason for granting points').setRequired(true))
         )
  );

export async function autocomplete(interaction: AutocompleteInteraction) {
  const focusedOption = interaction.options.getFocused(true);
  
  if (focusedOption.name === 'member') {
    const members = await prisma.member.findMany({
      where: {
        status: 'OFFICIAL',
        OR: [
          { nickname: { contains: focusedOption.value, mode: 'insensitive' } },
          { ign: { contains: focusedOption.value, mode: 'insensitive' } }
        ]
      },
      take: 25
    });

    await interaction.respond(
      members.map(m => ({ name: m.nickname, value: m.id }))
    );
  } else if (focusedOption.name === 'name') {
    const seasons = await prisma.season.findMany({
      where: {
        name: { contains: focusedOption.value, mode: 'insensitive' }
      },
      orderBy: { startDate: 'desc' },
      take: 25
    });

    await interaction.respond(
      seasons.map(s => ({ name: s.name, value: s.id }))
    );
  } else if (focusedOption.name === 'target_season' || focusedOption.name === 'season') {
    const closedSeasons = await prisma.season.findMany({
      where: {
        isActive: false,
        name: { contains: focusedOption.value, mode: 'insensitive' }
      },
      orderBy: { startDate: 'desc' },
      take: 25
    });

    await interaction.respond(
      closedSeasons.map(s => ({ name: s.name, value: s.id }))
    );
  } else if (focusedOption.name === 'new_name') {
    const targetSeasonId = interaction.options.getString('target_season');
    if (targetSeasonId) {
      const season = await prisma.season.findUnique({
        where: { id: targetSeasonId }
      });
      if (season) {
        await interaction.respond([
          { name: `Current: ${season.name}`, value: season.name }
        ]);
        return;
      }
    }
    await interaction.respond([]);
  }
}

export async function execute(interaction: ChatInputCommandInteraction) {
  // Security Check
  const adminIds = (process.env['ADMIN_IDS'] || '').split(',').map(id => id.trim());
  if (!adminIds.includes(interaction.user.id)) {
    return interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
  }

  const subcommandGroup = interaction.options.getSubcommandGroup(false);
  const subcommand = interaction.options.getSubcommand();
  
  await interaction.deferReply({ ephemeral: subcommandGroup === 'add' || subcommand === 'view' || subcommandGroup === 'edit' || subcommandGroup === 'fix' }); // Ephemeral for utility commands

  if (subcommandGroup === 'edit' && subcommand === 'name') {
    await SeasonService.editSeasonName(interaction);
  } else if (subcommandGroup === 'fix' && subcommand === 'old-season') {
    const memberId = interaction.options.getString('member', true);
    const seasonId = interaction.options.getString('season', true);
    const amount = interaction.options.getInteger('amount', true);
    const reason = interaction.options.getString('reason', true);

    try {
      const member = await PointService.grantPointsManual(
        interaction.client,
        interaction.user.id,
        interaction.user.username,
        memberId,
        amount,
        reason,
        seasonId
      );
      await interaction.editReply(`✅ Successfully granted **${amount} points** to **${member.nickname}** for a past season.\nReason: ${reason}`);
    } catch (error: any) {
      console.error('Error fixing points:', error);
      await interaction.editReply(`❌ Error: ${error.message}`);
    }
  } else if (subcommandGroup === 'add' && subcommand === 'point') {
    const memberId = interaction.options.getString('member', true);
    const amount = interaction.options.getInteger('amount', true);
    const reason = interaction.options.getString('reason', true);

    try {
      const member = await PointService.grantPointsManual(
        interaction.client,
        interaction.user.id,
        interaction.user.username,
        memberId,
        amount,
        reason
      );
      await interaction.editReply(`✅ Successfully granted **${amount} points** to **${member.nickname}**.\nReason: ${reason}`);
    } catch (error: any) {
      console.error('Error granting points:', error);
      await interaction.editReply(`❌ Error: ${error.message}`);
    }
  } else if (subcommand === 'start') {
    await SeasonService.startSeason(interaction);
  } else if (subcommand === 'leaderboard') {
    await SeasonService.generateLeaderboard(interaction);
  } else if (subcommand === 'close') {
    await SeasonService.closeSeason(interaction);
  } else if (subcommand === 'view') {
    await SeasonService.viewPastSeason(interaction);
  }
}
