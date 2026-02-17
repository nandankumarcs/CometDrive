import { Test, TestingModule } from '@nestjs/testing';
import { ShareService } from './share.service';
import { getModelToken } from '@nestjs/sequelize';
import { Share, SharePermission } from '../../entities/share.entity';
import { FileEntity } from '../../entities/file.entity';
import { FolderEntity } from '../../entities/folder.entity';
import { UserEntity } from '../../entities/user.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';

const mockShareModel = {
  create: jest.fn(),
  findOne: jest.fn(),
  findAll: jest.fn(),
  update: jest.fn(),
};

const mockFileModel = {
  findOne: jest.fn(),
};

const mockUserModel = {
  findOne: jest.fn(),
};

const mockFolderModel = {
  findOne: jest.fn(),
};

describe('ShareService', () => {
  let service: ShareService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShareService,
        {
          provide: getModelToken(Share),
          useValue: mockShareModel,
        },
        {
          provide: getModelToken(FileEntity),
          useValue: mockFileModel,
        },
        {
          provide: getModelToken(FolderEntity),
          useValue: mockFolderModel,
        },
        {
          provide: getModelToken(UserEntity),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    service = module.get<ShareService>(ShareService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a public share link if recipientEmail is not provided', async () => {
      const user = { id: 1, userTypeId: 1 } as UserEntity;
      const file = { id: 1, user_id: 1, uuid: 'file-uuid' } as FileEntity;
      const dto = { fileId: 'file-uuid' };

      mockFileModel.findOne.mockResolvedValue(file);
      mockShareModel.findOne.mockResolvedValue(null);
      mockShareModel.create.mockResolvedValue({ token: 'new-token' });

      const result = await service.create(user, dto);

      expect(mockFileModel.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { uuid: 'file-uuid' } }),
      );
      expect(mockShareModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          file_id: 1,
          folder_id: null,
          created_by: 1,
          recipient_id: null,
          is_active: true,
          permission: SharePermission.VIEWER,
        }),
      );
      expect(result).toEqual({ token: 'new-token' });
    });

    it('should create a private share link if recipientEmail is provided and user exists', async () => {
      const user = { id: 1, userTypeId: 1 } as UserEntity;
      const recipient = { id: 2, email: 'recipient@test.com' } as UserEntity;
      const file = { id: 1, user_id: 1, uuid: 'file-uuid' } as FileEntity;
      const dto = { fileId: 'file-uuid', recipientEmail: 'recipient@test.com' };

      mockFileModel.findOne.mockResolvedValue(file);
      mockUserModel.findOne.mockResolvedValue(recipient);
      mockShareModel.findOne.mockResolvedValue(null);
      mockShareModel.create.mockResolvedValue({ token: 'private-token', recipient_id: 2 });

      const result = await service.create(user, dto);

      expect(mockUserModel.findOne).toHaveBeenCalledWith({
        where: { email: 'recipient@test.com' },
      });
      expect(mockShareModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          file_id: 1,
          folder_id: null,
          recipient_id: 2,
          permission: SharePermission.VIEWER,
        }),
      );
    });

    it('should create a private editor share', async () => {
      const user = { id: 1, userTypeId: 1 } as UserEntity;
      const recipient = { id: 2, email: 'recipient@test.com' } as UserEntity;
      const file = { id: 1, user_id: 1, uuid: 'file-uuid' } as FileEntity;
      const dto = {
        fileId: 'file-uuid',
        recipientEmail: 'recipient@test.com',
        permission: SharePermission.EDITOR,
      };

      mockFileModel.findOne.mockResolvedValue(file);
      mockUserModel.findOne.mockResolvedValue(recipient);
      mockShareModel.findOne.mockResolvedValue(null);
      mockShareModel.create.mockResolvedValue({ token: 'private-token', recipient_id: 2 });

      await service.create(user, dto);

      expect(mockShareModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          file_id: 1,
          recipient_id: 2,
          permission: SharePermission.EDITOR,
        }),
      );
    });

    it('should throw NotFoundException if recipient email does not exist', async () => {
      const user = { id: 1 } as UserEntity;
      const file = { id: 1, user_id: 1 } as FileEntity;
      const dto = { fileId: 'file-uuid', recipientEmail: 'unknown@test.com' };

      mockFileModel.findOne.mockResolvedValue(file);
      mockUserModel.findOne.mockResolvedValue(null);

      await expect(service.create(user, dto)).rejects.toThrow(NotFoundException);
    });

    it('should reject editor permission for public share', async () => {
      const user = { id: 1, userTypeId: 1 } as UserEntity;
      const file = { id: 1, user_id: 1, uuid: 'file-uuid' } as FileEntity;
      const dto = { fileId: 'file-uuid', permission: SharePermission.EDITOR };

      mockFileModel.findOne.mockResolvedValue(file);

      await expect(service.create(user, dto)).rejects.toThrow(BadRequestException);
    });

    it('should update permission when active share already exists', async () => {
      const user = { id: 1, userTypeId: 1 } as UserEntity;
      const recipient = { id: 2, email: 'recipient@test.com' } as UserEntity;
      const file = { id: 1, user_id: 1, uuid: 'file-uuid' } as FileEntity;
      const save = jest.fn();
      const existingShare = {
        permission: SharePermission.VIEWER,
        save,
      };

      mockFileModel.findOne.mockResolvedValue(file);
      mockUserModel.findOne.mockResolvedValue(recipient);
      mockShareModel.findOne.mockResolvedValue(existingShare);

      const result = await service.create(user, {
        fileId: 'file-uuid',
        recipientEmail: 'recipient@test.com',
        permission: SharePermission.EDITOR,
      });

      expect(existingShare.permission).toBe(SharePermission.EDITOR);
      expect(save).toHaveBeenCalled();
      expect(result).toBe(existingShare);
    });
  });

  describe('findSharedWith', () => {
    it('should return files shared with the user', async () => {
      const user = { id: 2 } as UserEntity;
      const sharedFiles = [{ id: 1, file: { name: 'Shared File' } }];

      mockShareModel.findAll.mockResolvedValue(sharedFiles);

      const result = await service.findSharedWith(user);

      expect(mockShareModel.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ recipient_id: 2, is_active: true }),
        }),
      );
      expect(result).toEqual(sharedFiles);
    });
  });

  describe('revoke', () => {
    it('should revoke all active shares for a file', async () => {
      const user = { id: 1 } as UserEntity;
      const file = { id: 1, uuid: 'file-uuid' } as FileEntity;

      mockFileModel.findOne.mockResolvedValue(file);
      mockShareModel.update.mockResolvedValue([1]); // Sequelize update returns [affectedCount]

      await service.revoke(user, 'file-uuid');

      expect(mockShareModel.update).toHaveBeenCalledWith(
        { is_active: false },
        { where: { file_id: 1, created_by: 1, is_active: true } },
      );
    });
  });

  describe('revokeByShareUuid', () => {
    it('should revoke one specific share', async () => {
      const user = { id: 1 } as UserEntity;
      const save = jest.fn();
      mockShareModel.findOne.mockResolvedValue({ uuid: 'share-uuid', is_active: true, save });

      await service.revokeByShareUuid(user, 'share-uuid');

      expect(mockShareModel.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { uuid: 'share-uuid', created_by: 1, is_active: true },
        }),
      );
      expect(save).toHaveBeenCalled();
    });
  });
});
