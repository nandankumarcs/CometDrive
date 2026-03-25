import { Test, TestingModule } from '@nestjs/testing';
import { InvitationService } from './invitation.service';
import { getModelToken } from '@nestjs/sequelize';
import { InvitationEntity, UserEntity, UserTypeEntity } from '@src/entities';
import { NotFoundException, BadRequestException } from '@nestjs/common';

const mockInvitationModel = {
  create: jest.fn(),
  findOne: jest.fn(),
  findAll: jest.fn(),
};

const mockUserTypeModel = {
  findOne: jest.fn(),
};

describe('InvitationService', () => {
  let service: InvitationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationService,
        {
          provide: getModelToken(InvitationEntity),
          useValue: mockInvitationModel,
        },
        {
          provide: getModelToken(UserTypeEntity),
          useValue: mockUserTypeModel,
        },
      ],
    }).compile();

    service = module.get<InvitationService>(InvitationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an invitation', async () => {
      const dto = { email: 'test@example.com' };
      const inviter = { id: 1, first_name: 'Admin', last_name: 'User' } as UserEntity;
      mockUserTypeModel.findOne.mockResolvedValue({ id: 1, name: 'User', code: 'USER' });
      mockInvitationModel.findOne.mockResolvedValue(null);
      mockInvitationModel.create.mockResolvedValue({
        ...dto,
        user_type_id: 1,
        token: 'token123',
        uuid: 'uuid123',
        expires_at: new Date(Date.now() + 86400000),
      });

      const result = await service.create(dto, inviter);

      expect(mockInvitationModel.create).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should create a generic invitation when email is omitted', async () => {
      const dto = {};
      const inviter = { id: 1 } as UserEntity;
      mockUserTypeModel.findOne.mockResolvedValue({ id: 1, name: 'User', code: 'USER' });
      mockInvitationModel.create.mockImplementation(async (payload) => payload);

      const result = await service.create(dto, inviter);

      expect(mockInvitationModel.findOne).not.toHaveBeenCalled();
      expect(result.email).toMatch(/^invite\+.+@comet\.local$/);
    });

    it('should throw BadRequest if active invitation exists', async () => {
      const dto = { email: 'test@example.com' };
      const inviter = { id: 1 } as UserEntity;
      mockUserTypeModel.findOne.mockResolvedValue({ id: 1, code: 'USER' });
      mockInvitationModel.findOne.mockResolvedValue({
        expires_at: new Date(Date.now() + 86400000), // Future
        accepted_at: null,
        is_revoked: false,
      });

      await expect(service.create(dto, inviter)).rejects.toThrow(BadRequestException);
    });
  });

  describe('validateToken', () => {
    it('should return invitation if valid', async () => {
      const invitation = {
        token: 'valid',
        expires_at: new Date(Date.now() + 86400000),
        accepted_at: null,
        is_revoked: false,
      };
      mockInvitationModel.findOne.mockResolvedValue(invitation);

      const result = await service.validateToken('valid');
      expect(result).toEqual(invitation);
    });

    it('should throw NotFound if token invalid', async () => {
      mockInvitationModel.findOne.mockResolvedValue(null);
      await expect(service.validateToken('invalid')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequest if expired', async () => {
      const invitation = {
        token: 'expired',
        expires_at: new Date(Date.now() - 86400000), // Past
        accepted_at: null,
        is_revoked: false,
      };
      mockInvitationModel.findOne.mockResolvedValue(invitation);
      await expect(service.validateToken('expired')).rejects.toThrow(BadRequestException);
    });
  });
});
