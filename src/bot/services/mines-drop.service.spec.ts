import { MinesDropService } from './mines-drop.service';
import { prisma } from '../../database/prisma';
import { LoggerService } from './logger.service';

jest.mock('../../database/prisma', () => ({
  prisma: {
    minesDropEvent: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    minesDropRecord: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      aggregate: jest.fn(),
    },
    season: {
      findFirst: jest.fn(),
    },
    submission: {
      create: jest.fn(),
    },
    member: {
      update: jest.fn(),
    },
  },
}));

jest.mock('./logger.service', () => ({
  LoggerService: {
    logAction: jest.fn(),
    logPoints: jest.fn(),
  },
}));

describe('MinesDropService', () => {
  const mockActiveEvent = {
    id: 'event-1',
    name: 'Mines Equip Drops Event',
    status: 'ACTIVE',
    firstPoints: 150,
    secondPoints: 100,
    thirdPoints: 50,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getActiveEvent()', () => {
    it('should return active event if one exists', async () => {
      (prisma.minesDropEvent.findFirst as jest.Mock).mockResolvedValue(mockActiveEvent);

      const event = await MinesDropService.getActiveEvent();
      expect(event).toEqual(mockActiveEvent);
      expect(prisma.minesDropEvent.create).not.toHaveBeenCalled();
    });

    it('should create new active event if none exists', async () => {
      (prisma.minesDropEvent.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.minesDropEvent.create as jest.Mock).mockResolvedValue(mockActiveEvent);

      const event = await MinesDropService.getActiveEvent();
      expect(event).toEqual(mockActiveEvent);
      expect(prisma.minesDropEvent.create).toHaveBeenCalledWith({
        data: {
          name: 'Mines Equip Drops Event',
          status: 'ACTIVE',
          firstPoints: 150,
          secondPoints: 100,
          thirdPoints: 50,
        },
      });
    });
  });

  describe('recordReactionDrop()', () => {
    it('should record a drop if messageId is new', async () => {
      (prisma.minesDropEvent.findFirst as jest.Mock).mockResolvedValue(mockActiveEvent);
      (prisma.minesDropRecord.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.minesDropRecord.create as jest.Mock).mockResolvedValue({ id: 'rec-1' });
      (prisma.minesDropRecord.aggregate as jest.Mock).mockResolvedValue({ _sum: { count: 3 } });

      const result = await MinesDropService.recordReactionDrop('mem-1', 'admin-1', 'msg-100');
      expect(result).toEqual({ success: true, totalDrops: 3 });
      expect(prisma.minesDropRecord.create).toHaveBeenCalledWith({
        data: {
          eventId: 'event-1',
          memberId: 'mem-1',
          messageId: 'msg-100',
          count: 1,
          addedBy: 'admin-1',
        },
      });
    });

    it('should reject duplicate drop if messageId was already recorded', async () => {
      (prisma.minesDropEvent.findFirst as jest.Mock).mockResolvedValue(mockActiveEvent);
      (prisma.minesDropRecord.findUnique as jest.Mock).mockResolvedValue({ id: 'rec-1', messageId: 'msg-100' });

      const result = await MinesDropService.recordReactionDrop('mem-1', 'admin-1', 'msg-100');
      expect(result).toEqual({ success: false, reason: 'ALREADY_RECORDED' });
      expect(prisma.minesDropRecord.create).not.toHaveBeenCalled();
    });
  });

  describe('removeReactionDrop()', () => {
    it('should delete record and return updated total', async () => {
      (prisma.minesDropRecord.findUnique as jest.Mock).mockResolvedValue({
        id: 'rec-1',
        eventId: 'event-1',
        memberId: 'mem-1',
      });
      (prisma.minesDropRecord.delete as jest.Mock).mockResolvedValue({});
      (prisma.minesDropRecord.aggregate as jest.Mock).mockResolvedValue({ _sum: { count: 2 } });

      const result = await MinesDropService.removeReactionDrop('msg-100');
      expect(result).toEqual({ success: true, memberId: 'mem-1', totalDrops: 2 });
      expect(prisma.minesDropRecord.delete).toHaveBeenCalledWith({ where: { id: 'rec-1' } });
    });

    it('should return NOT_FOUND if messageId does not exist', async () => {
      (prisma.minesDropRecord.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await MinesDropService.removeReactionDrop('unknown-msg');
      expect(result).toEqual({ success: false, reason: 'NOT_FOUND' });
    });
  });

  describe('addManualDrops() & Negative Drop Safeguards', () => {
    it('should prevent deducting below 0 drops', async () => {
      (prisma.minesDropEvent.findFirst as jest.Mock).mockResolvedValue(mockActiveEvent);
      (prisma.minesDropRecord.aggregate as jest.Mock).mockResolvedValue({ _sum: { count: 2 } });

      const result = await MinesDropService.addManualDrops('mem-1', -5, 'admin-1', 'Wrong deduction');
      expect(result).toEqual({
        success: false,
        reason: 'CANNOT_BE_NEGATIVE',
        currentDrops: 2,
      });
      expect(prisma.minesDropRecord.create).not.toHaveBeenCalled();
    });

    it('should allow valid additions', async () => {
      (prisma.minesDropEvent.findFirst as jest.Mock).mockResolvedValue(mockActiveEvent);
      (prisma.minesDropRecord.aggregate as jest.Mock)
        .mockResolvedValueOnce({ _sum: { count: 2 } })
        .mockResolvedValueOnce({ _sum: { count: 5 } });

      const result = await MinesDropService.addManualDrops('mem-1', 3, 'admin-1', 'Triple drop screenshot');
      expect(result).toEqual({ success: true, totalDrops: 5 });
    });
  });

  describe('setPoints() Config Validation', () => {
    it('should reject negative point values', async () => {
      await expect(MinesDropService.setPoints(-10, 100, 50)).rejects.toThrow(
        'Points must be non-negative integers.'
      );
    });

    it('should update valid points config', async () => {
      (prisma.minesDropEvent.findFirst as jest.Mock).mockResolvedValue(mockActiveEvent);
      (prisma.minesDropEvent.update as jest.Mock).mockResolvedValue({
        ...mockActiveEvent,
        firstPoints: 200,
        secondPoints: 120,
        thirdPoints: 60,
      });

      const updated = await MinesDropService.setPoints(200, 120, 60);
      expect(updated.firstPoints).toBe(200);
      expect(prisma.minesDropEvent.update).toHaveBeenCalledWith({
        where: { id: 'event-1' },
        data: { firstPoints: 200, secondPoints: 120, thirdPoints: 60 },
      });
    });
  });

  describe('getLeaderboard() & Ties Handling', () => {
    it('should correctly sort standings and assign projected points with ties', async () => {
      (prisma.minesDropEvent.findFirst as jest.Mock).mockResolvedValue(mockActiveEvent);
      (prisma.minesDropRecord.findMany as jest.Mock).mockResolvedValue([
        { memberId: 'm1', count: 10, member: { id: 'm1', nickname: 'Alice', discordId: 'd1', avatarUrl: null } },
        { memberId: 'm2', count: 10, member: { id: 'm2', nickname: 'Bob', discordId: 'd2', avatarUrl: null } },
        { memberId: 'm3', count: 6, member: { id: 'm3', nickname: 'Charlie', discordId: 'd3', avatarUrl: null } },
      ]);

      const result = await MinesDropService.getLeaderboard();
      expect(result.totalDrops).toBe(26);
      expect(result.totalParticipants).toBe(3);

      // Alice & Bob tie for rank 1
      expect(result.standings[0].rank).toBe(1);
      expect(result.standings[0].projectedPoints).toBe(150);
      expect(result.standings[1].rank).toBe(1);
      expect(result.standings[1].projectedPoints).toBe(150);

      // Charlie is rank 3 (since 2 people share rank 1)
      expect(result.standings[2].rank).toBe(3);
      expect(result.standings[2].projectedPoints).toBe(50);
    });
  });

  describe('awardPrizes() & Exception Cases', () => {
    it('should award directly to Member.points even if no active season is open', async () => {
      (prisma.season.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.minesDropEvent.findFirst as jest.Mock).mockResolvedValue(mockActiveEvent);
      (prisma.minesDropRecord.findMany as jest.Mock).mockResolvedValue([
        { memberId: 'm1', count: 12, member: { id: 'm1', nickname: 'Alice', discordId: 'd1', avatarUrl: null } },
      ]);
      (prisma.member.update as jest.Mock).mockResolvedValue({});
      (prisma.minesDropEvent.update as jest.Mock).mockResolvedValue({});

      const result = await MinesDropService.awardPrizes('admin-1', 'Bahan', {} as any);
      expect(result.winners.length).toBe(1);
      expect(prisma.member.update).toHaveBeenCalledWith({
        where: { id: 'm1' },
        data: { points: { increment: 150 } },
      });
      // Submission not created since season is null
      expect(prisma.submission.create).not.toHaveBeenCalled();
    });

    it('should throw ALREADY_AWARDED if event was already finalized', async () => {
      (prisma.season.findFirst as jest.Mock).mockResolvedValue({ id: 'season-1', name: 'Season 5', isActive: true });
      (prisma.minesDropEvent.findFirst as jest.Mock).mockResolvedValue({
        ...mockActiveEvent,
        status: 'AWARDED',
      });
      (prisma.minesDropRecord.findMany as jest.Mock).mockResolvedValue([
        { memberId: 'm1', count: 5, member: { id: 'm1', nickname: 'Alice' } },
      ]);

      await expect(
        MinesDropService.awardPrizes('admin-1', 'Bahan', {} as any)
      ).rejects.toThrow('ALREADY_AWARDED');
    });

    it('should throw NO_PARTICIPANTS if 0 drops were recorded', async () => {
      (prisma.season.findFirst as jest.Mock).mockResolvedValue({ id: 'season-1', name: 'Season 5', isActive: true });
      (prisma.minesDropEvent.findFirst as jest.Mock).mockResolvedValue(mockActiveEvent);
      (prisma.minesDropRecord.findMany as jest.Mock).mockResolvedValue([]);

      await expect(
        MinesDropService.awardPrizes('admin-1', 'Bahan', {} as any)
      ).rejects.toThrow('NO_PARTICIPANTS');
    });

    it('should successfully award points to submissions and log to LB points & audit logs', async () => {
      const mockSeason = { id: 'season-1', name: 'Season 5', isActive: true };
      (prisma.season.findFirst as jest.Mock).mockResolvedValue(mockSeason);
      (prisma.minesDropEvent.findFirst as jest.Mock).mockResolvedValue(mockActiveEvent);
      (prisma.minesDropRecord.findMany as jest.Mock).mockResolvedValue([
        { memberId: 'm1', count: 12, member: { id: 'm1', nickname: 'Alice', discordId: 'd1', avatarUrl: null } },
        { memberId: 'm2', count: 8, member: { id: 'm2', nickname: 'Bob', discordId: 'd2', avatarUrl: null } },
      ]);
      (prisma.submission.create as jest.Mock).mockResolvedValue({});
      (prisma.minesDropEvent.update as jest.Mock).mockResolvedValue({});

      const result = await MinesDropService.awardPrizes('admin-1', 'Bahan', {} as any);
      expect(result.winners.length).toBe(2);

      // Check Submission created for 1st place
      expect(prisma.submission.create).toHaveBeenCalledWith({
        data: {
          memberId: 'm1',
          seasonId: 'season-1',
          mission: 'Mines Equip Drops Event',
          reason: 'Mines Equip Drops Event - Rank 1 Prize (12 drops)',
          rank: 1,
          points: 150,
          verifiedBy: 'admin-1',
        },
      });

      // Check LoggerService.logPoints called for both winners
      expect(LoggerService.logPoints).toHaveBeenCalledTimes(2);
      expect(LoggerService.logAction).toHaveBeenCalledTimes(1);

      // Event status marked AWARDED
      expect(prisma.minesDropEvent.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'event-1' },
          data: expect.objectContaining({ status: 'AWARDED' }),
        })
      );
    });
  });
});
