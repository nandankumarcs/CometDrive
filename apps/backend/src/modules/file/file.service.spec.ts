import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { FileService } from './file.service';
import {
  FileEntity,
  FilePlaybackProgressEntity,
  FileVideoCommentEntity,
  FolderEntity,
  OrganizationEntity,
  Share,
  SharePermission,
} from '@src/entities';
import { StorageService } from '@src/modules/storage/storage.service';
import { AuditService } from '@src/commons/services';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Op } from 'sequelize';

describe('FileService', () => {
  let service: FileService;
  let fileModel: typeof FileEntity;
  let playbackProgressModel: typeof FilePlaybackProgressEntity;
  let videoCommentModel: typeof FileVideoCommentEntity;
  let folderModel: typeof FolderEntity;
  let shareModel: typeof Share;
  let organizationModel: typeof OrganizationEntity;
  let storageService: StorageService;
  let auditService: AuditService;

  const mockUser = { id: 1, uuid: 'user-uuid', email: 'test@example.com' } as any;
  const sharedRecipient = { id: 2, uuid: 'recipient-uuid', email: 'recipient@example.com' } as any;

  const mockFileInstance = {
    id: 1,
    uuid: 'file-uuid',
    name: 'test.txt',
    original_name: 'test.txt',
    size: 100,
    mime_type: 'text/plain',
    storage_path: 'users/user-uuid/root/test.txt',
    storage_bucket: null,
    storage_provider: 'local',
    user_id: 1,
    folder_id: null,
    deleted_at: null,
    save: jest.fn().mockResolvedValue(true),
    destroy: jest.fn().mockResolvedValue(true),
    restore: jest.fn().mockResolvedValue(true),
  };

  const mockFileModel = {
    create: jest.fn().mockResolvedValue(mockFileInstance),
    findOne: jest.fn(),
    findAll: jest.fn().mockResolvedValue([mockFileInstance]),
    sequelize: {
      getDialect: jest.fn().mockReturnValue('postgres'),
      escape: jest.fn().mockImplementation((value: string) => `'${value.replace(/'/g, "''")}'`),
    },
  };

  const mockPlaybackProgressInstance = {
    id: 10,
    user_id: 1,
    file_id: 1,
    position_seconds: 25,
    duration_seconds: 100,
    progress_percent: '25.00',
    last_watched_at: new Date(),
    update: jest.fn().mockResolvedValue(true),
    destroy: jest.fn().mockResolvedValue(true),
  };

  const mockPlaybackProgressModel = {
    findOne: jest.fn(),
    create: jest.fn().mockResolvedValue(mockPlaybackProgressInstance),
  };

  const mockVideoCommentInstance = {
    id: 20,
    uuid: 'comment-uuid',
    file_id: 1,
    user_id: 1,
    content: 'Great point',
    timestamp_seconds: 35,
    created_at: new Date(),
    createdAt: new Date(),
    author: {
      uuid: 'user-uuid',
      first_name: 'Test',
      last_name: 'User',
    },
    destroy: jest.fn().mockResolvedValue(true),
  };

  const mockVideoCommentModel = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn().mockResolvedValue(mockVideoCommentInstance),
  };

  const mockFolderModel = {
    findOne: jest.fn(),
  };

  const mockShareModel = {
    findOne: jest.fn(),
  };

  const mockStorageService = {
    upload: jest.fn().mockResolvedValue('users/user-uuid/root/test.txt'),
    download: jest.fn().mockResolvedValue({ pipe: jest.fn() }),
    delete: jest.fn().mockResolvedValue(true),
    getSignedUrl: jest.fn().mockResolvedValue('http://signed.url'),
    getDriver: jest.fn().mockReturnValue('local'),
    getBucket: jest.fn().mockReturnValue(null),
  };

  const mockOrganizationModel = {
    findByPk: jest.fn().mockResolvedValue({
      id: 1,
      storage_used: 0,
      max_storage: 1000,
      increment: jest.fn(),
      decrement: jest.fn(),
    }),
  };

  const mockAuditService = {
    log: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileService,
        {
          provide: getModelToken(FileEntity),
          useValue: mockFileModel,
        },
        {
          provide: getModelToken(FolderEntity),
          useValue: mockFolderModel,
        },
        {
          provide: getModelToken(FilePlaybackProgressEntity),
          useValue: mockPlaybackProgressModel,
        },
        {
          provide: getModelToken(FileVideoCommentEntity),
          useValue: mockVideoCommentModel,
        },
        {
          provide: getModelToken(Share),
          useValue: mockShareModel,
        },
        {
          provide: getModelToken(OrganizationEntity),
          useValue: mockOrganizationModel,
        },
        {
          provide: StorageService,
          useValue: mockStorageService,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    service = module.get<FileService>(FileService);
    fileModel = module.get<typeof FileEntity>(getModelToken(FileEntity));
    playbackProgressModel = module.get<typeof FilePlaybackProgressEntity>(
      getModelToken(FilePlaybackProgressEntity),
    );
    videoCommentModel = module.get<typeof FileVideoCommentEntity>(
      getModelToken(FileVideoCommentEntity),
    );
    folderModel = module.get<typeof FolderEntity>(getModelToken(FolderEntity));
    shareModel = module.get<typeof Share>(getModelToken(Share));
    storageService = module.get<StorageService>(StorageService);
    auditService = module.get<AuditService>(AuditService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('upload', () => {
    it('should upload a file to root', async () => {
      const file = { originalname: 'test.txt', size: 100, mimetype: 'text/plain' } as any;
      const dto = {};

      const result = await service.upload(file, mockUser, dto);

      expect(storageService.upload).toHaveBeenCalled();
      expect(fileModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'test.txt',
          original_name: 'test.txt',
          storage_path: expect.stringMatching(/users\/user-uuid\/root\/\d+-test.txt/),
          storage_provider: 'local',
          user_id: mockUser.id,
          folder_id: null,
        }),
      );
      expect(result).toBe(mockFileInstance);
    });

    it('should upload to a specific folder', async () => {
      const file = { originalname: 'test.txt', size: 100, mimetype: 'text/plain' } as any;
      const folderUuid = 'folder-uuid';
      const mockFolder = { id: 10, uuid: folderUuid, user_id: mockUser.id };
      mockFolderModel.findOne.mockResolvedValueOnce(mockFolder);

      await service.upload(file, mockUser, { folderUuid });

      expect(fileModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          folder_id: 10,
        }),
      );
    });

    it('should throw NotFound if folder does not exist', async () => {
      mockFolderModel.findOne.mockResolvedValueOnce(null);
      await expect(service.upload({}, mockUser, { folderUuid: 'bad' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should return user files', async () => {
      mockFileModel.findAll.mockResolvedValueOnce([mockFileInstance]);
      const result = await service.findAll(mockUser);
      expect(fileModel.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { user_id: mockUser.id, folder_id: null },
        }),
      );
      expect(result).toEqual([mockFileInstance]);
    });

    it('should apply postgres full-text + fuzzy search with relevance ordering', async () => {
      mockFileModel.sequelize.getDialect.mockReturnValueOnce('postgres');
      await service.findAll(mockUser, undefined, false, '  presntation  ');

      const query = mockFileModel.findAll.mock.calls[0][0];
      expect(mockFileModel.sequelize.escape).toHaveBeenCalledWith('presntation');
      expect(query.where.user_id).toBe(mockUser.id);
      expect(query.where.folder_id).toBeUndefined();
      expect(query.where[Op.and]).toHaveLength(1);
      expect(query.order[0][1]).toBe('DESC');
      expect(query.order[1]).toEqual(['created_at', 'DESC']);
    });

    it('should fallback to ILIKE search for non-postgres dialects', async () => {
      mockFileModel.sequelize.getDialect.mockReturnValueOnce('mysql');
      await service.findAll(mockUser, undefined, false, 'report');

      const query = mockFileModel.findAll.mock.calls[0][0];
      expect(query.where).toEqual(
        expect.objectContaining({
          user_id: mockUser.id,
          name: { [Op.iLike]: '%report%' },
        }),
      );
      expect(query.where.folder_id).toBeUndefined();
      expect(query.order).toEqual([['created_at', 'DESC']]);
    });
  });

  describe('playback progress', () => {
    it('should create playback progress for a video file', async () => {
      const videoFile = { ...mockFileInstance, mime_type: 'video/mp4' };
      mockFileModel.findOne.mockResolvedValue(videoFile);
      mockPlaybackProgressModel.findOne.mockResolvedValue(null);

      const result = await service.upsertPlaybackProgress(mockFileInstance.uuid, mockUser, {
        positionSeconds: 15,
        durationSeconds: 100,
      });

      expect(playbackProgressModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockUser.id,
          file_id: videoFile.id,
          position_seconds: 15,
          duration_seconds: 100,
          progress_percent: 15,
        }),
      );
      expect(result.fileUuid).toBe(mockFileInstance.uuid);
    });

    it('should update existing progress row', async () => {
      const videoFile = { ...mockFileInstance, mime_type: 'video/mp4' };
      mockFileModel.findOne.mockResolvedValue(videoFile);
      mockPlaybackProgressModel.findOne.mockResolvedValue(mockPlaybackProgressInstance);

      await service.upsertPlaybackProgress(mockFileInstance.uuid, mockUser, {
        positionSeconds: 60,
        durationSeconds: 100,
      });

      expect(mockPlaybackProgressInstance.update).toHaveBeenCalledWith(
        expect.objectContaining({
          position_seconds: 60,
          duration_seconds: 100,
          progress_percent: 60,
        }),
      );
    });

    it('should delete progress if video is completed', async () => {
      const videoFile = { ...mockFileInstance, mime_type: 'video/mp4' };
      mockFileModel.findOne.mockResolvedValue(videoFile);
      mockPlaybackProgressModel.findOne.mockResolvedValue(mockPlaybackProgressInstance);

      await service.upsertPlaybackProgress(mockFileInstance.uuid, mockUser, {
        positionSeconds: 95,
        durationSeconds: 100,
      });

      expect(mockPlaybackProgressInstance.destroy).toHaveBeenCalled();
    });

    it('should reject non-video files for playback progress APIs', async () => {
      mockFileModel.findOne.mockResolvedValue(mockFileInstance);

      await expect(
        service.upsertPlaybackProgress(mockFileInstance.uuid, mockUser, {
          positionSeconds: 10,
          durationSeconds: 100,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow shared recipient to track playback progress', async () => {
      const sharedVideoFile = { ...mockFileInstance, mime_type: 'video/mp4', user_id: 1 };
      mockFileModel.findOne.mockResolvedValue(sharedVideoFile);
      mockShareModel.findOne.mockResolvedValue({
        id: 99,
        file_id: sharedVideoFile.id,
        recipient_id: sharedRecipient.id,
        is_active: true,
        expires_at: null,
      });
      mockPlaybackProgressModel.findOne.mockResolvedValue(null);

      await service.upsertPlaybackProgress(sharedVideoFile.uuid, sharedRecipient, {
        positionSeconds: 12,
        durationSeconds: 90,
      });

      expect(playbackProgressModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: sharedRecipient.id,
          file_id: sharedVideoFile.id,
        }),
      );
    });

    it('should reject playback progress access when file is not shared', async () => {
      const sharedVideoFile = { ...mockFileInstance, mime_type: 'video/mp4', user_id: 1 };
      mockFileModel.findOne.mockResolvedValue(sharedVideoFile);
      mockShareModel.findOne.mockResolvedValue(null);

      await expect(
        service.getPlaybackProgress(sharedVideoFile.uuid, sharedRecipient),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return latest continue watching item', async () => {
      const now = new Date();
      mockPlaybackProgressModel.findOne.mockResolvedValue({
        ...mockPlaybackProgressInstance,
        position_seconds: 40,
        duration_seconds: 120,
        progress_percent: '33.33',
        last_watched_at: now,
        file: {
          uuid: 'video-uuid',
          name: 'video.mp4',
          mime_type: 'video/mp4',
          size: 12345,
          updated_at: now,
        },
      });

      const result = await service.getContinueWatching(mockUser);
      expect(result).toEqual(
        expect.objectContaining({
          file: expect.objectContaining({ uuid: 'video-uuid' }),
          positionSeconds: 40,
          durationSeconds: 120,
          progressPercent: 33.33,
        }),
      );
    });

    it('should dismiss playback progress', async () => {
      const videoFile = { ...mockFileInstance, mime_type: 'video/mp4' };
      const destroy = jest.fn().mockResolvedValue(true);
      mockFileModel.findOne.mockResolvedValue(videoFile);
      mockPlaybackProgressModel.findOne.mockResolvedValue({ destroy });

      const result = await service.dismissPlaybackProgress(mockFileInstance.uuid, mockUser);

      expect(destroy).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });
  });

  describe('video comments', () => {
    it('should allow owner to list comments', async () => {
      const videoFile = { ...mockFileInstance, mime_type: 'video/mp4', user_id: mockUser.id };
      mockFileModel.findOne.mockResolvedValue(videoFile);
      mockVideoCommentModel.findAll.mockResolvedValue([
        {
          ...mockVideoCommentInstance,
          content: 'First',
          timestamp_seconds: 5,
          author: { uuid: 'user-uuid', first_name: 'Test', last_name: 'User' },
        },
      ]);

      const result = await service.listVideoComments(videoFile.uuid, mockUser);

      expect(videoCommentModel.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { file_id: videoFile.id },
          limit: 200,
        }),
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          content: 'First',
          canDelete: true,
        }),
      );
    });

    it('should allow shared recipient to create comments', async () => {
      const videoFile = { ...mockFileInstance, mime_type: 'video/mp4', user_id: mockUser.id };
      mockFileModel.findOne.mockResolvedValue(videoFile);
      mockShareModel.findOne.mockResolvedValue({
        id: 100,
        file_id: videoFile.id,
        recipient_id: sharedRecipient.id,
        is_active: true,
        expires_at: null,
      });
      mockVideoCommentModel.create.mockResolvedValue({
        ...mockVideoCommentInstance,
        user_id: sharedRecipient.id,
      });

      const result = await service.createVideoComment(videoFile.uuid, sharedRecipient, {
        content: '  Nice moment  ',
        timestampSeconds: 15,
      });

      expect(videoCommentModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          file_id: videoFile.id,
          user_id: sharedRecipient.id,
          content: 'Nice moment',
          timestamp_seconds: 15,
        }),
      );
      expect(result.canDelete).toBe(true);
    });

    it('should reject non-video files for comment APIs', async () => {
      mockFileModel.findOne.mockResolvedValue(mockFileInstance);
      await expect(service.listVideoComments(mockFileInstance.uuid, mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject access when file is not shared with requester', async () => {
      const videoFile = { ...mockFileInstance, mime_type: 'video/mp4', user_id: mockUser.id };
      mockFileModel.findOne.mockResolvedValue(videoFile);
      mockShareModel.findOne.mockResolvedValue(null);

      await expect(service.listVideoComments(videoFile.uuid, sharedRecipient)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should allow deleting own comment', async () => {
      const videoFile = { ...mockFileInstance, mime_type: 'video/mp4', user_id: mockUser.id };
      const destroy = jest.fn().mockResolvedValue(true);
      mockFileModel.findOne.mockResolvedValue(videoFile);
      mockVideoCommentModel.findOne.mockResolvedValue({
        ...mockVideoCommentInstance,
        user_id: mockUser.id,
        destroy,
      });

      const result = await service.deleteVideoComment(videoFile.uuid, 'comment-uuid', mockUser);

      expect(destroy).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it('should forbid deleting someone else comment', async () => {
      const videoFile = { ...mockFileInstance, mime_type: 'video/mp4', user_id: mockUser.id };
      mockFileModel.findOne.mockResolvedValue(videoFile);
      mockVideoCommentModel.findOne.mockResolvedValue({
        ...mockVideoCommentInstance,
        user_id: 999,
      });

      await expect(
        service.deleteVideoComment(videoFile.uuid, 'comment-uuid', mockUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deletePermanently', () => {
    it('should delete from storage and DB', async () => {
      mockFileModel.findOne.mockResolvedValueOnce(mockFileInstance);
      await service.deletePermanently(mockFileInstance.uuid, mockUser);
      expect(storageService.delete).toHaveBeenCalledWith(mockFileInstance.storage_path);
      expect(mockFileInstance.destroy).toHaveBeenCalledWith({ force: true });
    });

    it('should throw NotFound if file not found', async () => {
      mockFileModel.findOne.mockResolvedValueOnce(null);
      await expect(service.deletePermanently('bad', mockUser)).rejects.toThrow(NotFoundException);
    });
  });

  describe('trash/restore', () => {
    it('should soft delete file', async () => {
      mockFileModel.findOne.mockResolvedValueOnce(mockFileInstance);
      await service.trash(mockFileInstance.uuid, mockUser);
      expect(mockFileInstance.destroy).toHaveBeenCalled();
    });

    it('should restore file', async () => {
      const trashedFile = { ...mockFileInstance, deleted_at: new Date(), restore: jest.fn() };
      mockFileModel.findOne.mockResolvedValueOnce(trashedFile);
      await service.restore(mockFileInstance.uuid, mockUser);
      expect(trashedFile.restore).toHaveBeenCalled();
    });

    it('should reject shared viewer from trashing file', async () => {
      const sharedFile = { ...mockFileInstance, user_id: 1, folder_id: null };
      mockFileModel.findOne.mockResolvedValueOnce(sharedFile);
      mockShareModel.findOne.mockResolvedValueOnce(null);

      await expect(service.trash(sharedFile.uuid, sharedRecipient)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should allow shared editor to trash file', async () => {
      const sharedFile = {
        ...mockFileInstance,
        user_id: 1,
        folder_id: null,
        destroy: jest.fn().mockResolvedValue(true),
      };
      mockFileModel.findOne.mockResolvedValueOnce(sharedFile);
      mockShareModel.findOne.mockResolvedValueOnce({
        id: 100,
        file_id: sharedFile.id,
        recipient_id: sharedRecipient.id,
        permission: SharePermission.EDITOR,
      });

      await service.trash(sharedFile.uuid, sharedRecipient);
      expect(sharedFile.destroy).toHaveBeenCalled();
    });
  });
});
