import { Test, TestingModule } from '@nestjs/testing';
import { ShareService } from './share.service';
import { getModelToken } from '@nestjs/sequelize';
import { Share, SharePermission } from '../../entities/share.entity';
import { FileEntity } from '../../entities/file.entity';
import { FolderEntity } from '../../entities/folder.entity';
import { UserEntity } from '../../entities/user.entity';
import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PasswordService } from '../auth/services';
import { StorageService } from '../storage/storage.service';
import { NotificationService } from '../notification/notification.service';

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

const mockPasswordService = {
  hash: jest.fn(),
  compare: jest.fn(),
};

const mockStorageService = {
  download: jest.fn(),
};

const mockNotificationService = {
  create: jest.fn(),
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
        {
          provide: PasswordService,
          useValue: mockPasswordService,
        },
        {
          provide: StorageService,
          useValue: mockStorageService,
        },
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
      ],
    }).compile();

    service = module.get<ShareService>(ShareService);
    mockPasswordService.hash.mockResolvedValue('hashed-password');
    mockPasswordService.compare.mockResolvedValue(true);
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
      expect(result).toEqual(expect.objectContaining({ token: 'new-token' }));
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
      expect(result).toEqual(expect.objectContaining({ permission: SharePermission.EDITOR }));
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
      expect(result).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: 1, has_password: false })]),
      );
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

  describe('updateShare', () => {
    it('should update permission for a private share', async () => {
      const user = { id: 1 } as UserEntity;
      const save = jest.fn();
      const share = {
        uuid: 'share-uuid',
        created_by: 1,
        is_active: true,
        recipient_id: 2,
        permission: SharePermission.VIEWER,
        save,
      };

      mockShareModel.findOne.mockResolvedValue(share);

      const result = await service.updateShare(user, 'share-uuid', {
        permission: SharePermission.EDITOR,
      });

      expect(share.permission).toBe(SharePermission.EDITOR);
      expect(save).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({ permission: SharePermission.EDITOR }));
    });

    it('should reject editor permission for public share', async () => {
      const user = { id: 1 } as UserEntity;
      const save = jest.fn();
      const share = {
        uuid: 'share-uuid',
        created_by: 1,
        is_active: true,
        recipient_id: null,
        permission: SharePermission.VIEWER,
        save,
      };

      mockShareModel.findOne.mockResolvedValue(share);

      await expect(
        service.updateShare(user, 'share-uuid', { permission: SharePermission.EDITOR }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update expiry when provided', async () => {
      const user = { id: 1 } as UserEntity;
      const save = jest.fn();
      const share = {
        uuid: 'share-uuid',
        created_by: 1,
        is_active: true,
        recipient_id: 2,
        permission: SharePermission.VIEWER,
        expires_at: null,
        save,
      };
      const expiresAt = new Date('2030-01-01T00:00:00Z');

      mockShareModel.findOne.mockResolvedValue(share);

      const result = await service.updateShare(user, 'share-uuid', { expiresAt });

      expect(share.expires_at).toEqual(expiresAt);
      expect(save).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({ expires_at: expiresAt }));
    });
  });

  describe('findOneByToken', () => {
    it('should require password when link is protected', async () => {
      const share = {
        token: 'token',
        recipient_id: null,
        is_active: true,
        expires_at: null,
        password_hash: 'hashed-password',
        increment: jest.fn(),
      };
      mockShareModel.findOne.mockResolvedValue(share);

      await expect(service.findOneByToken('token')).rejects.toThrow(UnauthorizedException);
    });

    it('should reject invalid password', async () => {
      const share = {
        token: 'token',
        recipient_id: null,
        is_active: true,
        expires_at: null,
        password_hash: 'hashed-password',
        increment: jest.fn(),
      };
      mockShareModel.findOne.mockResolvedValue(share);
      mockPasswordService.compare.mockResolvedValueOnce(false);

      await expect(service.findOneByToken('token', 'wrong')).rejects.toThrow(UnauthorizedException);
    });

    it('should return share when password is valid', async () => {
      const share = {
        token: 'token',
        recipient_id: null,
        is_active: true,
        expires_at: null,
        password_hash: 'hashed-password',
        increment: jest.fn(),
      };
      mockShareModel.findOne.mockResolvedValue(share);

      const result = await service.findOneByToken('token', 'correct');

      expect(share.increment).toHaveBeenCalledWith('views');
      expect(result).toEqual(expect.objectContaining({ token: 'token', has_password: true }));
    });

    it('should mark expired links inactive and reject access', async () => {
      const save = jest.fn();
      const share = {
        token: 'token',
        recipient_id: null,
        is_active: true,
        expires_at: new Date(Date.now() - 1000),
        password_hash: null,
        save,
      };
      mockShareModel.findOne.mockResolvedValue(share);

      await expect(service.findOneByToken('token')).rejects.toThrow(NotFoundException);
      expect(share.is_active).toBe(false);
      expect(save).toHaveBeenCalled();
    });
  });
});
