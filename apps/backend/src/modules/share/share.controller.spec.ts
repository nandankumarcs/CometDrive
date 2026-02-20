import { Test, TestingModule } from '@nestjs/testing';
import { ShareController } from './share.controller';
import { ShareService } from './share.service';
import { SuccessResponse } from '../../commons/dtos/success-response.dto';

const mockShareService = {
  create: jest.fn(),
  getShareByFile: jest.fn(),
  getShareByFolder: jest.fn(),
  getSharesByResource: jest.fn(),
  revokeByShareUuid: jest.fn(),
  updateShare: jest.fn(),
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
      const share = { token: 'token' };
      mockShareService.create.mockResolvedValue(share);

      const result = await controller.create(req, dto);

      expect(mockShareService.create).toHaveBeenCalledWith(req.user, dto);
      expect(result).toEqual(new SuccessResponse('Share link created successfully', share));
    });
  });

  describe('getSharedWithMe', () => {
    it('should return files shared with current user', async () => {
      const req = { user: { id: 1 } };
      const sharedFiles = [{ id: 1, name: 'file' }];
      mockShareService.findSharedWith.mockResolvedValue(sharedFiles);

      const result = await controller.getSharedWithMe(req);

      expect(mockShareService.findSharedWith).toHaveBeenCalledWith(req.user);
      expect(result).toEqual(
        new SuccessResponse('Shared files retrieved successfully', sharedFiles),
      );
    });
  });

  describe('revoke', () => {
    it('should revoke a share', async () => {
      const fileUuid = 'file-uuid';
      const req = { user: { id: 1 } };

      const result = await controller.revoke(req, fileUuid);

      expect(mockShareService.revoke).toHaveBeenCalledWith(req.user, fileUuid);
      expect(result).toEqual(new SuccessResponse('Share link revoked successfully'));
    });
  });

  describe('revokeByShareUuid', () => {
    it('should revoke a specific share', async () => {
      const req = { user: { id: 1 } };
      const shareUuid = 'share-uuid';

      const result = await controller.revokeByShareUuid(req, shareUuid);

      expect(mockShareService.revokeByShareUuid).toHaveBeenCalledWith(req.user, shareUuid);
      expect(result).toEqual(new SuccessResponse('Share revoked successfully'));
    });
  });

  describe('updateShare', () => {
    it('should update a share', async () => {
      const req = { user: { id: 1 } };
      const shareUuid = 'share-uuid';
      const dto = { permission: 'editor' };
      const updated = { uuid: shareUuid, permission: 'editor' };
      mockShareService.updateShare.mockResolvedValue(updated);

      const result = await controller.updateShare(req, shareUuid, dto);

      expect(mockShareService.updateShare).toHaveBeenCalledWith(req.user, shareUuid, dto);
      expect(result).toEqual(new SuccessResponse('Share updated successfully', updated));
    });
  });

  describe('getSharesByResource', () => {
    it('should return shares for a resource', async () => {
      const req = { user: { id: 1 } };
      const shares = [{ uuid: 'share-1' }];
      mockShareService.getSharesByResource.mockResolvedValue(shares);

      const result = await controller.getSharesByResource(req, 'folder', 'folder-uuid');

      expect(mockShareService.getSharesByResource).toHaveBeenCalledWith(
        req.user,
        'folder',
        'folder-uuid',
      );
      expect(result).toEqual(new SuccessResponse('Shares retrieved successfully', shares));
    });
  });
});
