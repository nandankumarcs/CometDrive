import { Test, TestingModule } from '@nestjs/testing';
import { InvitationService } from './invitation.service';
import { getModelToken } from '@nestjs/sequelize';
import { InvitationEntity, UserEntity, UserTypeEntity } from '@src/entities';
import { MailerService } from '@crownstack/mailer';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, BadRequestException } from '@nestjs/common';

const mockInvitationModel = {
  create: jest.fn(),
  findOne: jest.fn(),
  findAll: jest.fn(),
};

const mockUserTypeModel = {
  findByPk: jest.fn(),
};

const mockMailerService = {
  sendMail: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key) => {
    if (key === 'FRONTEND_DOMAIN') return 'http://localhost:3000';
    return null;
  }),
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
        {
          provide: MailerService,
          useValue: mockMailerService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
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
      const dto = { email: 'test@example.com', user_type_id: 1 };
      const inviter = { id: 1, first_name: 'Admin', last_name: 'User' } as UserEntity;
      mockUserTypeModel.findByPk.mockResolvedValue({ id: 1, name: 'User' });
      mockInvitationModel.findOne.mockResolvedValue(null);
      mockInvitationModel.create.mockResolvedValue({
        ...dto,
        token: 'token123',
        uuid: 'uuid123',
        expires_at: new Date(Date.now() + 86400000),
      });

      const result = await service.create(dto, inviter);

      expect(mockInvitationModel.create).toHaveBeenCalled();
      expect(mockMailerService.sendMail).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw BadRequest if active invitation exists', async () => {
      const dto = { email: 'test@example.com', user_type_id: 1 };
      const inviter = { id: 1 } as UserEntity;
      mockUserTypeModel.findByPk.mockResolvedValue({ id: 1 });
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
