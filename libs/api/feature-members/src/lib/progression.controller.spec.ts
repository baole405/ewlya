import { Test, TestingModule } from '@nestjs/testing';
import { ProgressionController } from './progression.controller';
import { ProgressionService } from './progression.service';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '@ds/api/auth';

describe('ProgressionController', () => {
  let controller: ProgressionController;
  let service: ProgressionService;

  const mockProgressionService = {
    getAllChecks: jest.fn(),
    getCheckById: jest.fn(),
    getSavedTitles: jest.fn(),
    createCheck: jest.fn(),
    updateMemberStatus: jest.fn(),
    updateMemberRequirementStatus: jest.fn(),
    deleteCheck: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProgressionController],
      providers: [
        {
          provide: ProgressionService,
          useValue: mockProgressionService,
        },
      ],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useValue({ canActivate: () => true })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ProgressionController>(ProgressionController);
    service = module.get<ProgressionService>(ProgressionService);

    // Ensure the service is attached to the controller (sometimes required in manual mocks)
    (controller as unknown as { progressionService: ProgressionService }).progressionService =
      service;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAllChecks', () => {
    it('should call service.getAllChecks', async () => {
      await controller.getAllChecks();
      expect(service.getAllChecks).toHaveBeenCalled();
    });
  });

  describe('getSavedTitles', () => {
    it('should call service.getSavedTitles', async () => {
      await controller.getSavedTitles();
      expect(service.getSavedTitles).toHaveBeenCalled();
    });
  });

  describe('createCheck', () => {
    it('should call service.createCheck with body data and requirements', async () => {
      const dto = { title: 'Test', description: 'Test', requirements: [{ title: 'R1' }] };
      await controller.createCheck(dto);
      expect(service.createCheck).toHaveBeenCalledWith({
        title: dto.title,
        description: dto.description,
        requirements: dto.requirements,
        startDate: undefined,
        endDate: undefined,
      });
    });
  });

  describe('updateMemberRequirementStatus', () => {
    it('should call service.updateMemberRequirementStatus', async () => {
      const reqStatusId = 'rs1';
      const body = { isMet: true };
      await controller.updateMemberRequirementStatus(reqStatusId, body);
      expect(service.updateMemberRequirementStatus).toHaveBeenCalledWith(reqStatusId, body.isMet);
    });
  });
});
