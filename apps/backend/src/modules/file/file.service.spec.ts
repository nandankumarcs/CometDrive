import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { FileService } from './file.service';
import { FileEntity, FolderEntity } from '@src/entities';
import { StorageService } from '@src/modules/storage/storage.service';
import { AuditService } from '@src/commons/services';
import { NotFoundException } from '@nestjs/common';

describe('FileService', () => {
  let service: FileService;
  let fileModel: typeof FileEntity;
  let folderModel: typeof FolderEntity;
  let storageService: StorageService;
  let auditService: AuditService;

  const mockUser = { id: 1, uuid: 'user-uuid', email: 'test@example.com' } as any;

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
  };

  const mockFolderModel = {
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
    folderModel = module.get<typeof FolderEntity>(getModelToken(FolderEntity));
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
      const mockFolder = { id: 10, uuid: folderUuid };
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
  });
});
