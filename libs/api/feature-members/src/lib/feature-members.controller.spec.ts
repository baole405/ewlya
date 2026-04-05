import { Test, TestingModule } from '@nestjs/testing';
import { FeatureMembersController } from './feature-members.controller';
import { MemberService } from '@ds/web/data-access'; // Giả sử đây là service cung cấp data

describe('FeatureMembersController', () => {
  let controller: FeatureMembersController;

  const mockMemberService = {
    members: () => [{ id: '1', nickname: 'Test Member', points: 100 }],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FeatureMembersController],
      providers: [
        {
          provide: 'MemberService', // Hoặc class thực tế tùy vào DI
          useValue: mockMemberService,
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
