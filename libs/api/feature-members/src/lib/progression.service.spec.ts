import { Test, TestingModule } from '@nestjs/testing';
import { ProgressionService } from './progression.service';
import { prisma } from '@ds/db';

// Mock prisma client
jest.mock('@ds/db', () => ({
  prisma: {
    progressionCheck: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    progressionTitle: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    member: {
      findMany: jest.fn(),
    },
    memberRequirementStatus: {
      update: jest.fn(),
      createMany: jest.fn(),
    },
    memberProgressionStatus: {
      update: jest.fn(),
      createMany: jest.fn(),
    },
    progressionRequirement: {
      create: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(prisma)),
  },
}));

describe('ProgressionService', () => {
  let service: ProgressionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProgressionService],
    }).compile();

    service = module.get<ProgressionService>(ProgressionService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllChecks', () => {
    it('should return all checks ordered by createdAt descending', async () => {
      const mockChecks = [{ id: '1', title: 'Check 1' }];
      (prisma.progressionCheck.findMany as jest.Mock).mockResolvedValue(mockChecks);

      const result = await service.getAllChecks();

      expect(result).toEqual(mockChecks);
      expect(prisma.progressionCheck.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            deletedAt: null,
            OR: [{ endDate: null }, { endDate: { gte: expect.any(Date) } }],
          },
          orderBy: { createdAt: 'desc' },
          include: {
            requirements: true,
            _count: {
              select: { memberStatuses: true },
            },
          },
        }),
      );
    });
  });

  describe('createCheck', () => {
    it('should create a check, upsert title, and create member statuses in a transaction', async () => {
      const dto = {
        title: 'New Check',
        description: 'Desc',
        requirements: [{ title: 'Req 1' }, { title: 'Req 2' }],
      };
      const mockMembers = [{ id: 'm1' }, { id: 'm2' }];
      const mockCreatedCheck = { id: 'c1', title: dto.title, description: dto.description };

      (prisma.member.findMany as jest.Mock).mockResolvedValue(mockMembers);
      (prisma.progressionCheck.create as jest.Mock).mockResolvedValue(mockCreatedCheck);
      (prisma.progressionRequirement.create as jest.Mock).mockResolvedValue({ id: 'req1' });

      const result = await service.createCheck(dto);

      expect(result).toEqual(mockCreatedCheck);
      expect(prisma.progressionTitle.upsert).toHaveBeenCalledWith({
        where: { title: dto.title },
        update: {},
        create: { title: dto.title },
      });
      expect(prisma.progressionCheck.create).toHaveBeenCalledWith({
        data: {
          title: dto.title,
          description: dto.description,
          startDate: expect.any(Date),
          endDate: undefined,
        },
      });
      expect(prisma.progressionRequirement.create).toHaveBeenCalledTimes(2);
      expect(prisma.memberRequirementStatus.createMany).toHaveBeenCalledTimes(2);
      expect(prisma.memberProgressionStatus.createMany).toHaveBeenCalled();
    });
  });

  describe('getSavedTitles', () => {
    it('should return a list of title strings', async () => {
      const mockTitles = [{ title: 'Title A' }, { title: 'Title B' }];
      (prisma.progressionTitle.findMany as jest.Mock).mockResolvedValue(mockTitles);

      const result = await service.getSavedTitles();

      expect(result).toEqual(['Title A', 'Title B']);
      expect(prisma.progressionTitle.findMany).toHaveBeenCalledWith({
        orderBy: { title: 'asc' },
      });
    });
  });
});
