import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Guild } from 'discord.js';
import { prisma } from '../../database/prisma';

export async function performMemberSync(guild: Guild, adminIds: string[]): Promise<number> {
  const targetRole = guild.roles.cache.find((r: any) => r.name === 'Dark Stars');
  if (!targetRole) {
    throw new Error('Role "Dark Stars" not found in the server.');
  }

  const members = await guild.members.fetch();
  let officialCount = 0;

  for (const [id, member] of members) {
    if (member.user.bot) continue;
    const isOfficial = member.roles.cache.has(targetRole.id);
    const isAdmin = adminIds.includes(id);
    const roleNames = member.roles.cache.map((r: any) => r.name).filter((n: string) => n !== '@everyone');

    await prisma.member.upsert({
      where: { discordId: id },
      update: {
        nickname: member.displayName,
        avatarUrl: member.user.displayAvatarURL(),
        status: isOfficial ? 'OFFICIAL' : 'TRIAL',
        role: isAdmin ? 'ADMIN' : 'MEMBER',
        roles: roleNames,
      },
      create: {
        discordId: id,
        nickname: member.displayName,
        ign: member.displayName,
        avatarUrl: member.user.displayAvatarURL(),
        status: isOfficial ? 'OFFICIAL' : 'TRIAL',
        role: isAdmin ? 'ADMIN' : 'MEMBER',
        roles: roleNames,
      },
    });
    if (isOfficial) officialCount++;
  }
  return officialCount;
}

export async function generateConfirmationBoard(adminIds: string[], roleMention: string, currentMonthName: string) {
  // Fetch officials
  const officials = await prisma.member.findMany({
    where: { status: 'OFFICIAL' },
  });

  const admins = officials.filter(m => m.role === 'ADMIN' || adminIds.includes(m.discordId));
  const regulars = officials.filter(m => m.role !== 'ADMIN' && !adminIds.includes(m.discordId));

  let memberListText = '**👑 Admins & Mods:**\n';
  if (admins.length > 0) {
    memberListText += admins.map(a => `- ${a.nickname || a.ign}`).join('\n') + '\n\n';
  } else {
    memberListText += '*(None)*\n\n';
  }

  memberListText += '**👥 Members:**\n';
  if (regulars.length > 0) {
    memberListText += regulars.map(m => `- ${m.nickname || m.ign}`).join('\n');
  } else {
    memberListText += '*(None)*';
  }

  // Ensure text doesn't exceed 4096 chars (Discord limit for description)
  if (memberListText.length > 3800) {
    memberListText = memberListText.substring(0, 3800) + '\n... *(List truncated due to length limits)*';
  }

  const embed = new EmbedBuilder()
    .setTitle('📋 Member Sync Result - Confirmation Required')
    .setColor(0xeab308)
    .setDescription(
      `Hey ${roleMention}, it's time for our monthly member list check for **${currentMonthName}**!\n\n` +
      `Total OFFICIAL members: **${officials.length}**\n\n` +
      `${memberListText}\n\n` +
      `**Confirmations (0/${adminIds.length}):**\n(None yet)`
    )
    .setFooter({ text: `Liza & The DarkStar Team | confirm:` })
    .setTimestamp();

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('sync_reminder_confirm')
      .setLabel('✅ Confirm')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('sync_reminder_update')
      .setLabel('🔄 Update (Re-Sync)')
      .setStyle(ButtonStyle.Primary)
  );

  return { embed, components: [row] };
}
