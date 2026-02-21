import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/sequelize';
import { PasswordService, TokenService, SessionService } from './services';
import { EmailService } from '@src/commons/services';
import { InvitationService } from '../invitation/invitation.service';
import { UserEntity, UserTypeEntity, OrganizationEntity, PasswordResetEntity } from '@src/entities';
import { ConflictException, NotFoundException } from '@nestjs/common';

const mockConfigService = {
  getOrThrow: jest.fn((key) => {
    if (key === 'auth.jwtRefreshTokenExpiresIn') return 3600;
    if (key === 'auth.passwordResetExpiresIn') return 3600;
    if (key === 'app.frontendDomain') return 'http://localhost:3000';
    return null;
  }),
};

const mockPasswordService = {
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn(),
};

const mockTokenService = {
  generateTokens: jest.fn(),
  verifyToken: jest.fn(),
};

const mockSessionService = {
  create: jest.fn(),
};

const mockEmailService = {
  sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
};

const mockInvitationService = {
  validateToken: jest.fn(),
  accept: jest.fn(),
};

const mockUserModel = {
  findOne: jest.fn(),
  findByPk: jest.fn(),
  create: jest.fn(),
};

const mockUserTypeModel = {
  findOne: jest.fn(),
};

const mockOrganizationModel = {
  findByPk: jest.fn(),
  create: jest.fn(),
};

const mockPasswordResetModel = {
  create: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PasswordService, useValue: mockPasswordService },
        { provide: TokenService, useValue: mockTokenService },
        { provide: SessionService, useValue: mockSessionService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: InvitationService, useValue: mockInvitationService },
        { provide: getModelToken(UserEntity), useValue: mockUserModel },
        { provide: getModelToken(UserTypeEntity), useValue: mockUserTypeModel },
        { provide: getModelToken(OrganizationEntity), useValue: mockOrganizationModel },
        { provide: getModelToken(PasswordResetEntity), useValue: mockPasswordResetModel },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const dto = {
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
      password: 'password123',
      organizationName: 'Acme Corp',
    };

    const newOrganization = { id: 10, name: 'Acme Corp' };
    const defaultUserType = { id: 2, code: 'USER' };

    const newUser = {
      id: 200,
      uuid: 'uuid-200',
      email: 'jane@example.com',
      first_name: 'Jane',
      organization_id: 10,
      user_type_id: 2,
    };

    beforeEach(() => {
      mockUserModel.findOne.mockResolvedValue(null);
      mockOrganizationModel.create.mockResolvedValue(newOrganization);
      mockUserTypeModel.findOne.mockResolvedValue(defaultUserType);
      mockUserModel.create.mockResolvedValue(newUser);
      mockSessionService.create.mockResolvedValue({ hash: 'session_hash' });
      mockTokenService.generateTokens.mockReturnValue({
        accessToken: 'access',
        refreshToken: 'refresh',
      });
      mockUserModel.findByPk.mockResolvedValue(newUser);
    });

    it('should register a new user and create an organization', async () => {
      const result = await service.register(dto as any);

      expect(mockUserModel.findOne).toHaveBeenCalledWith({
        where: { email: 'jane@example.com', deleted_at: null },
      });
      expect(mockOrganizationModel.create).toHaveBeenCalledWith({ name: 'Acme Corp' });
      expect(mockUserTypeModel.findOne).toHaveBeenCalledWith({
        where: { code: 'USER', is_active: true },
      });
      expect(mockPasswordService.hash).toHaveBeenCalledWith('password123');
      expect(mockUserModel.create).toHaveBeenCalled();
      expect(mockEmailService.sendWelcomeEmail).toHaveBeenCalledWith('jane@example.com', {
        name: 'Jane',
      });
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('user');
    });

    it('should throw ConflictException if email is already registered', async () => {
      mockUserModel.findOne.mockResolvedValue({ id: 999 });

      await expect(service.register(dto as any)).rejects.toThrow(ConflictException);
    });
  });

  describe('registerWithToken', () => {
    const dto = {
      token: 'valid_token',
      firstName: 'John',
      lastName: 'Doe',
      password: 'password123',
    };

    const invitation = {
      email: 'john@example.com',
      invited_by: 1,
      user_type_id: 2,
    };

    const inviter = {
      id: 1,
      organization_id: 10,
    };

    const newUser = {
      id: 100,
      uuid: 'uuid-100',
      email: 'john@example.com',
      first_name: 'John',
      organization_id: 10,
      user_type: { code: 'USER' },
    };

    it('should register a user with valid token', async () => {
      mockInvitationService.validateToken.mockResolvedValue(invitation);
      mockUserModel.findOne.mockResolvedValue(null); // No existing user
      mockUserModel.findByPk.mockImplementation((id) => {
        if (id === 1) return Promise.resolve(inviter);
        if (id === 100) return Promise.resolve(newUser);
        return Promise.resolve(null);
      });
      mockUserModel.create.mockResolvedValue(newUser);

      mockSessionService.create.mockResolvedValue({ hash: 'session_hash' });
      mockTokenService.generateTokens.mockReturnValue({
        accessToken: 'access',
        refreshToken: 'refresh',
      });

      const result = await service.registerWithToken(dto);

      expect(mockInvitationService.validateToken).toHaveBeenCalledWith(dto.token);
      expect(mockUserModel.create).toHaveBeenCalled();
      expect(mockInvitationService.accept).toHaveBeenCalledWith(dto.token);
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('user');
    });

    it('should throw ConflictException if email already registered', async () => {
      mockInvitationService.validateToken.mockResolvedValue(invitation);
      mockUserModel.findOne.mockResolvedValue({ id: 999 }); // User exists

      await expect(service.registerWithToken(dto)).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if inviter organization not found (inviter missing)', async () => {
      mockInvitationService.validateToken.mockResolvedValue(invitation);
      mockUserModel.findOne.mockResolvedValue(null);
      mockUserModel.findByPk.mockResolvedValue(null); // Inviter not found

      await expect(service.registerWithToken(dto)).rejects.toThrow(NotFoundException);
    });
  });
});
