import { Test, TestingModule } from '@nestjs/testing';
import { ShareService } from './share.service';
import { getModelToken } from '@nestjs/sequelize';
import { Share } from '../../entities/share.entity';
import { FileEntity } from '../../entities/file.entity';
import { UserEntity } from '../../entities/user.entity';
import { NotFoundException } from '@nestjs/common';

const mockShareModel = {
  create: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
};

const mockFileModel = {
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
    it('should create a share link if one does not exist', async () => {
      const user = { uuid: 'user-uuid', id: 1 } as UserEntity;
      const file = { uuid: 'file-uuid', user_id: 1 } as FileEntity;
      const dto = { fileId: 'file-uuid' };

      mockFileModel.findOne.mockResolvedValue(file);
      mockShareModel.findOne.mockResolvedValue(null);
      mockShareModel.create.mockResolvedValue({ token: 'new-token' });

      const result = await service.create(user, dto);

      expect(mockFileModel.findOne).toHaveBeenCalled();
      expect(mockShareModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          file_id: 'file-uuid',
          created_by: 'user-uuid',
          is_active: true,
        }),
      );
      expect(result).toEqual({ token: 'new-token' });
    });

    it('should return existing active share if it exists', async () => {
      const user = { uuid: 'user-uuid', id: 1 } as UserEntity;
      const file = { uuid: 'file-uuid', user_id: 1 } as FileEntity;
      const dto = { fileId: 'file-uuid' };
      const existingShare = { token: 'existing-token' };

      mockFileModel.findOne.mockResolvedValue(file);
      mockShareModel.findOne.mockResolvedValue(existingShare);

      const result = await service.create(user, dto);

      expect(mockShareModel.create).not.toHaveBeenCalled();
      expect(result).toEqual(existingShare);
    });
  });

  describe('revoke', () => {
    it('should revoke an active share', async () => {
      const user = { uuid: 'user-uuid' } as UserEntity;
      const share = { is_active: true, save: jest.fn() };

      mockShareModel.findOne.mockResolvedValue(share);

      await service.revoke(user, 'file-uuid');

      expect(share.is_active).toBe(false);
      expect(share.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if no active share found', async () => {
      const user = { uuid: 'user-uuid' } as UserEntity;
      mockShareModel.findOne.mockResolvedValue(null);

      await expect(service.revoke(user, 'file-uuid')).rejects.toThrow(NotFoundException);
    });
  });
});
