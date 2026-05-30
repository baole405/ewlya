import { Test, TestingModule } from '@nestjs/testing';
import { FeatureMembersController } from './feature-members.controller';
import { FeatureMembersService } from './feature-members.service';

describe('FeatureMembersController', () => {
  let controller: FeatureMembersController;

  const mockFeatureMembersService = {
    getAllMembers: jest.fn().mockResolvedValue([{ id: '1', nickname: 'Test Member', points: 100 }]),
    getOfficialMembers: jest.fn().mockResolvedValue([]),
    getMemberById: jest.fn().mockResolvedValue({}),
    updateMember: jest.fn().mockResolvedValue({}),
    updatePoints: jest.fn().mockResolvedValue({}),
    deleteMember: jest.fn().mockResolvedValue({}),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FeatureMembersController],
      providers: [
        {
          provide: FeatureMembersService,
          useValue: mockFeatureMembersService,
        },
      ],
    }).compile();

    controller = module.get<FeatureMembersController>(FeatureMembersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // Thêm các test case khác cho các endpoint admin/public
});

