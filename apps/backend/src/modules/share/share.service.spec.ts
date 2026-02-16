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
  findAll: jest.fn(),
  update: jest.fn(),
};

const mockFileModel = {
  findOne: jest.fn(),
};

const mockUserModel = {
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
          created_by: 1,
          recipient_id: null,
          is_active: true,
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
          recipient_id: 2,
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
  });

  describe('findSharedWith', () => {
    it('should return files shared with the user', async () => {
      const user = { id: 2 } as UserEntity;
      const sharedFiles = [{ id: 1, file: { name: 'Shared File' } }];

      mockShareModel.findAll.mockResolvedValue(sharedFiles);

      const result = await service.findSharedWith(user);

      expect(mockShareModel.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { recipient_id: 2, is_active: true },
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
});
