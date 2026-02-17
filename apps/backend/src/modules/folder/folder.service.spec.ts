import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { FolderService } from './folder.service';
import { FolderEntity, Share } from '@src/entities';
import { AuditService } from '@src/commons/services';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Op } from 'sequelize';

describe('FolderService', () => {
  let service: FolderService;
  let model: typeof FolderEntity;
  let auditService: AuditService;

  const mockUser = { id: 1, email: 'test@example.com' } as any;
  const sharedRecipient = { id: 2, email: 'shared@example.com' } as any;

  const mockFolderInstance = {
    id: 1,
    uuid: 'folder-uuid',
    name: 'Test Folder',
    user_id: 1,
    parent_id: null,
    deleted_at: null,
    save: jest.fn().mockResolvedValue(true),
    destroy: jest.fn().mockResolvedValue(true),
    restore: jest.fn().mockResolvedValue(true),
  };

  const mockFolderModel = {
    create: jest.fn().mockResolvedValue(mockFolderInstance),
    findOne: jest.fn().mockResolvedValue(mockFolderInstance),
    findAll: jest.fn().mockResolvedValue([mockFolderInstance]),
    findByPk: jest.fn(),
    sequelize: {
      getDialect: jest.fn().mockReturnValue('postgres'),
      escape: jest.fn().mockImplementation((value: string) => `'${value.replace(/'/g, "''")}'`),
    },
  };

  const mockAuditService = {
    log: jest.fn().mockResolvedValue(true),
  };

  const mockShareModel = {
    findOne: jest.fn().mockResolvedValue(null),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FolderService,
        {
          provide: getModelToken(FolderEntity),
          useValue: mockFolderModel,
        },
        {
          provide: getModelToken(Share),
          useValue: mockShareModel,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    service = module.get<FolderService>(FolderService);
    model = module.get<typeof FolderEntity>(getModelToken(FolderEntity));
    auditService = module.get<AuditService>(AuditService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a root folder', async () => {
      const dto = { name: 'New Folder' };
      const result = await service.create(dto, mockUser);
      expect(model.create).toHaveBeenCalledWith({
        name: dto.name,
        user_id: mockUser.id,
        parent_id: null,
      });
      expect(auditService.log).toHaveBeenCalledWith(
        'FOLDER_CREATE',
        mockUser,
        expect.any(Object),
        mockFolderInstance.id,
        'folder',
      );
      expect(result).toBe(mockFolderInstance);
    });

    it('should create a subfolder', async () => {
      const parentUuid = 'parent-uuid';
      const dto = { name: 'Subfolder', parentUuid };
      const mockParent = { id: 2, uuid: parentUuid, user_id: mockUser.id };

      mockFolderModel.findOne.mockResolvedValueOnce(mockParent);

      await service.create(dto, mockUser);
      expect(model.create).toHaveBeenCalledWith({
        name: dto.name,
        user_id: mockUser.id,
        parent_id: mockParent.id,
      });
    });

    it('should throw NotFound if parent not found', async () => {
      mockFolderModel.findOne.mockResolvedValueOnce(null);
      await expect(service.create({ name: 'Sub', parentUuid: 'bad' }, mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should reject shared viewer from creating in shared folder', async () => {
      const parentUuid = 'parent-uuid';
      const dto = { name: 'Subfolder', parentUuid };
      const sharedParent = { id: 2, uuid: parentUuid, user_id: mockUser.id, parent_id: null };

      mockFolderModel.findOne.mockResolvedValueOnce(sharedParent);
      mockShareModel.findOne.mockResolvedValueOnce(null);
      mockFolderModel.findByPk.mockResolvedValueOnce(null);

      await expect(service.create(dto, sharedRecipient)).rejects.toThrow(NotFoundException);
    });

    it('should allow shared editor to create in shared folder', async () => {
      const parentUuid = 'parent-uuid';
      const dto = { name: 'Subfolder', parentUuid };
      const sharedParent = { id: 2, uuid: parentUuid, user_id: mockUser.id, parent_id: null };

      mockFolderModel.findOne.mockResolvedValueOnce(sharedParent);
      mockShareModel.findOne.mockResolvedValueOnce({
        id: 10,
        folder_id: sharedParent.id,
        recipient_id: sharedRecipient.id,
        permission: 'editor',
        is_active: true,
        expires_at: null,
      });

      await service.create(dto, sharedRecipient);
      expect(model.create).toHaveBeenCalledWith({
        name: dto.name,
        user_id: mockUser.id,
        parent_id: sharedParent.id,
      });
    });
  });

  describe('findAll', () => {
    it('should return all root folders for user', async () => {
      const result = await service.findAll(mockUser);
      expect(model.findAll).toHaveBeenCalledWith({
        where: { user_id: mockUser.id, parent_id: null },
        paranoid: true,
        order: [['name', 'ASC']],
      });
      expect(result).toEqual([mockFolderInstance]);
    });

    it('should return trashed folders when isTrashed is true', async () => {
      await service.findAll(mockUser, undefined, true);
      expect(model.findAll).toHaveBeenCalledWith({
        where: { user_id: mockUser.id, parent_id: null },
        paranoid: false,
        order: [['name', 'ASC']],
      });
    });

    it('should apply postgres full-text + fuzzy search with relevance ordering', async () => {
      mockFolderModel.sequelize.getDialect.mockReturnValueOnce('postgres');
      await service.findAll(mockUser, undefined, false, '  presntation  ');

      const query = mockFolderModel.findAll.mock.calls[0][0];
      expect(mockFolderModel.sequelize.escape).toHaveBeenCalledWith('presntation');
      expect(query.where.user_id).toBe(mockUser.id);
      expect(query.where.parent_id).toBeUndefined();
      expect(query.where[Op.and]).toHaveLength(1);
      expect(query.order[0][1]).toBe('DESC');
      expect(query.order[1]).toEqual(['name', 'ASC']);
    });

    it('should fallback to ILIKE search for non-postgres dialects', async () => {
      mockFolderModel.sequelize.getDialect.mockReturnValueOnce('mysql');
      await service.findAll(mockUser, undefined, false, 'report');

      const query = mockFolderModel.findAll.mock.calls[0][0];
      expect(query.where).toEqual(
        expect.objectContaining({
          user_id: mockUser.id,
          name: { [Op.iLike]: '%report%' },
        }),
      );
      expect(query.where.parent_id).toBeUndefined();
      expect(query.order).toEqual([['name', 'ASC']]);
    });
  });

  describe('update', () => {
    it('should rename a folder', async () => {
      const dto = { name: 'New Name' };
      mockFolderModel.findOne.mockResolvedValueOnce(mockFolderInstance);

      await service.update('uuid', dto, mockUser);
      expect(mockFolderInstance.name).toBe(dto.name);
      expect(mockFolderInstance.save).toHaveBeenCalled();
    });

    it('should throw BadRequest if moving to self', async () => {
      mockFolderModel.findOne.mockResolvedValueOnce(mockFolderInstance);
      await expect(
        service.update(mockFolderInstance.uuid, { parentUuid: mockFolderInstance.uuid }, mockUser),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('trash/restore', () => {
    it('should soft delete folder', async () => {
      mockFolderModel.findOne.mockResolvedValueOnce(mockFolderInstance);
      await service.trash(mockFolderInstance.uuid, mockUser);
      expect(mockFolderInstance.destroy).toHaveBeenCalled();
    });

    it('should restore folder', async () => {
      const trashedFolder = { ...mockFolderInstance, deleted_at: new Date(), restore: jest.fn() };
      mockFolderModel.findOne.mockResolvedValueOnce(trashedFolder);
      await service.restore(mockFolderInstance.uuid, mockUser);
      expect(trashedFolder.restore).toHaveBeenCalled();
    });
  });
});
