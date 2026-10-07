import { Client } from 'discord.js';
import { prisma } from '../../database/prisma';
import { LoggerService } from './logger.service';

export interface LeaderboardEntry {
  memberId: string;
  nickname: string;
  discordId: string | null;
  avatarUrl: string | null;
  dropCount: number;
  rank: number;
  projectedPoints: number;
}

export class MinesDropService {
  /**
   * Retrieves or creates the current active Mines Drop event.
   */
  static async getActiveEvent() {
    let event = await prisma.minesDropEvent.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });

    if (!event) {
      event = await prisma.minesDropEvent.create({
        data: {
          name: 'Mines Equip Drops Event',
          status: 'ACTIVE',
          firstPoints: 150,
          secondPoints: 100,
          thirdPoints: 50,
        },
      });
    }

    return event;
  }

  /**
   * Records a drop via message reaction (with messageId idempotency).
   */
  static async recordReactionDrop(memberId: string, adminId: string, messageId: string) {
    const event = await this.getActiveEvent();

    // Prevent duplicate counting on the exact same message
    const existing = await prisma.minesDropRecord.findUnique({
      where: { messageId },
    });

    if (existing) {
      return { success: false, reason: 'ALREADY_RECORDED' as const };
    }

    await prisma.minesDropRecord.create({
      data: {
        eventId: event.id,
        memberId,
        messageId,
        count: 1,
        addedBy: adminId,
      },
    });

    const totalDrops = await this.getMemberDropCount(event.id, memberId);
    return { success: true, totalDrops };
  }

  /**
   * Removes a drop record when an admin removes the reaction.
   */
  static async removeReactionDrop(messageId: string) {
    const record = await prisma.minesDropRecord.findUnique({
      where: { messageId },
    });

    if (!record) {
      return { success: false, reason: 'NOT_FOUND' as const };
    }

    await prisma.minesDropRecord.delete({
      where: { id: record.id },
    });

    const totalDrops = await this.getMemberDropCount(record.eventId, record.memberId);
    return { success: true, memberId: record.memberId, totalDrops };
  }

  /**
   * Manually adds or deducts drops for a member.
   */
  static async addManualDrops(memberId: string, count: number, adminId: string, reason?: string, messageId?: string) {
    const event = await this.getActiveEvent();
    const currentDrops = await this.getMemberDropCount(event.id, memberId);

    if (currentDrops + count < 0) {
      return {
        success: false,
        reason: 'CANNOT_BE_NEGATIVE' as const,
        currentDrops,
      };
    }

    await prisma.minesDropRecord.create({
      data: {
        eventId: event.id,
        memberId,
        count,
        addedBy: adminId,
        messageId: messageId || undefined,
      },
    });

    const newTotal = await this.getMemberDropCount(event.id, memberId);
    return { success: true, totalDrops: newTotal };
  }

  /**
   * Configures prizes for 1st, 2nd, and 3rd place.
   */
  static async setPoints(first: number, second: number, third: number) {
    if (first < 0 || second < 0 || third < 0) {
      throw new Error('Points must be non-negative integers.');
    }

    const event = await this.getActiveEvent();
    return await prisma.minesDropEvent.update({
      where: { id: event.id },
      data: {
        firstPoints: first,
        secondPoints: second,
        thirdPoints: third,
      },
    });
  }

  /**
   * Calculates total drops for a specific member in an event.
   */
  static async getMemberDropCount(eventId: string, memberId: string): Promise<number> {
    const aggregate = await prisma.minesDropRecord.aggregate({
      where: { eventId, memberId },
      _sum: { count: true },
    });
    return aggregate._sum.count || 0;
  }

  /**
   * Computes the leaderboard for the active event with ties and projected points.
   */
  static async getLeaderboard(): Promise<{
    event: any;
    standings: LeaderboardEntry[];
    totalDrops: number;
    totalParticipants: number;
  }> {
    const event = await this.getActiveEvent();

    const records = await prisma.minesDropRecord.findMany({
      where: { eventId: event.id },
      include: {
        member: {
          select: {
            id: true,
            nickname: true,
            ign: true,
            discordId: true,
            avatarUrl: true,
          },
        },
      },
    });

    const memberMap = new Map<string, { member: any; total: number }>();
    let grandTotalDrops = 0;

    for (const record of records) {
      grandTotalDrops += record.count;
      const current = memberMap.get(record.memberId) || {
        member: record.member,
        total: 0,
      };
      current.total += record.count;
      memberMap.set(record.memberId, current);
    }

    // Filter out members with <= 0 drops and sort descending
    const sorted = Array.from(memberMap.values())
      .filter(item => item.total > 0)
      .sort((a, b) => b.total - a.total);

    const standings: LeaderboardEntry[] = [];
    let currentRank = 1;

    for (let i = 0; i < sorted.length; i++) {
      const entry = sorted[i];
      if (i > 0 && entry.total < sorted[i - 1].total) {
        currentRank = i + 1;
      }

      let projectedPoints = 0;
      if (currentRank === 1) projectedPoints = event.firstPoints;
      else if (currentRank === 2) projectedPoints = event.secondPoints;
      else if (currentRank === 3) projectedPoints = event.thirdPoints;

      standings.push({
        memberId: entry.member.id,
        nickname: entry.member.nickname || entry.member.ign,
        discordId: entry.member.discordId,
        avatarUrl: entry.member.avatarUrl,
        dropCount: entry.total,
        rank: currentRank,
        projectedPoints,
      });
    }

    return {
      event,
      standings,
      totalDrops: grandTotalDrops,
      totalParticipants: standings.length,
    };
  }

  /**
   * Awards points to the active season (if exists) and member profile points, finalizes the event.
   */
  static async awardPrizes(adminDiscordId: string, adminUsername: string, client: Client) {
    const activeSeason = await prisma.season.findFirst({
      where: { isActive: true },
    });

    const { event, standings } = await this.getLeaderboard();

    if (event.status === 'AWARDED') {
      throw new Error('ALREADY_AWARDED');
    }

    if (standings.length === 0) {
      throw new Error('NO_PARTICIPANTS');
    }

    const winners = standings.filter(s => s.rank <= 3 && s.projectedPoints > 0);

    // Update cumulative Member.points and optionally create Submission if season is active
    for (const winner of winners) {
      // 1. Permanently increment Member clan points
      await prisma.member.update({
        where: { id: winner.memberId },
        data: { points: { increment: winner.projectedPoints } },
      });

      // 2. If an active HOF season is open, also record in Submission table
      if (activeSeason) {
        await prisma.submission.create({
          data: {
            memberId: winner.memberId,
            seasonId: activeSeason.id,
            mission: 'Mines Equip Drops Event',
            reason: `Mines Equip Drops Event - Rank ${winner.rank} Prize (${winner.dropCount} drops)`,
            rank: winner.rank,
            points: winner.projectedPoints,
            verifiedBy: adminDiscordId,
          },
        });
      }

      // 3. Log point addition to LOG_OF_LB_POINTS_ID
      await LoggerService.logPoints(client, {
        memberNickname: winner.nickname,
        memberDiscordId: winner.discordId || undefined,
        missionText: `Mines Equip Drops Event - Rank ${winner.rank}`,
        points: winner.projectedPoints,
        seasonName: activeSeason ? activeSeason.name : 'Mines Event (Direct Clan Points)',
        adminUsername,
      });
    }

    // Save leaderboard snapshot and mark AWARDED
    await prisma.minesDropEvent.update({
      where: { id: event.id },
      data: {
        status: 'AWARDED',
        awardedAt: new Date(),
        leaderboardSnapshot: standings as any,
      },
    });

    // Log action to EWLYA_EDIT_LOGS_ID
    const seasonText = activeSeason
      ? `\nSeason: **${activeSeason.name}**`
      : '\nSeason: *(None - Points added directly to Member clan points)*';

    await LoggerService.logAction(
      client,
      '🏆 Mines Equip Drops Event Awarded',
      `Admin **${adminUsername}** awarded prizes for **${event.name}**.${seasonText}`,
      0xf59e0b,
      winners.map(w => ({
        name: `Rank ${w.rank}: ${w.nickname}`,
        value: `**${w.dropCount}** drops ➔ **+${w.projectedPoints}** pts`,
      }))
    );

    return {
      event,
      season: activeSeason,
      winners,
      standings,
    };
  }

  /**
   * Resets and starts a new Mines Drop event cycle.
   */
  static async resetEvent(newEventName?: string) {
    // Close existing active events
    await prisma.minesDropEvent.updateMany({
      where: { status: 'ACTIVE' },
      data: { status: 'CLOSED' },
    });

    // Create a new event
    return await prisma.minesDropEvent.create({
      data: {
        name: newEventName || 'Mines Equip Drops Event',
        status: 'ACTIVE',
        firstPoints: 150,
        secondPoints: 100,
        thirdPoints: 50,
      },
    });
  }
}
