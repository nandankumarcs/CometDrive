import { Test, TestingModule } from '@nestjs/testing';
import { ShareController } from './share.controller';
import { ShareService } from './share.service';
import { UserEntity } from '../../entities/user.entity';

const mockShareService = {
  create: jest.fn(),
  getShareByFile: jest.fn(),
  revoke: jest.fn(),
  findSharedWith: jest.fn(),
};

describe('ShareController', () => {
  let controller: ShareController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShareController],
      providers: [
        {
          provide: ShareService,
          useValue: mockShareService,
        },
      ],
    }).compile();

    controller = module.get<ShareController>(ShareController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a share', async () => {
      const dto = { fileId: 'file-uuid' };
      const req = { user: { id: 1 } };
      mockShareService.create.mockResolvedValue({ token: 'token' });

      const result = await controller.create(dto, req);

      expect(mockShareService.create).toHaveBeenCalledWith(req.user, dto);
      expect(result).toEqual({ data: { token: 'token' } });
    });
  });

  describe('getSharedWithMe', () => {
    it('should return files shared with current user', async () => {
      const req = { user: { id: 1 } };
      const sharedFiles = [{ id: 1, name: 'file' }];
      mockShareService.findSharedWith.mockResolvedValue(sharedFiles);

      const result = await controller.getSharedWithMe(req);

      expect(mockShareService.findSharedWith).toHaveBeenCalledWith(req.user);
      expect(result).toEqual({ data: sharedFiles });
    });
  });

  describe('delete', () => {
    it('should revoke a share', async () => {
      const fileUuid = 'file-uuid';
      const req = { user: { id: 1 } };

      await controller.delete(fileUuid, req);

      expect(mockShareService.revoke).toHaveBeenCalledWith(req.user, fileUuid);
    });
  });
});
