import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/sequelize';
import { PasswordService, TokenService, SessionService } from './services';
import { EmailService } from '@src/commons/services';
import { InvitationService } from '../invitation/invitation.service';
import { UserEntity, UserTypeEntity, PasswordResetEntity } from '@src/entities';
import { ConflictException } from '@nestjs/common';

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
    };

    const defaultUserType = { id: 2, code: 'USER' };

    const newUser = {
      id: 200,
      uuid: 'uuid-200',
      email: 'jane@example.com',
      first_name: 'Jane',
      organization_id: null,
      user_type_id: 2,
    };

    beforeEach(() => {
      mockUserModel.findOne.mockResolvedValue(null);
      mockUserTypeModel.findOne.mockResolvedValue(defaultUserType);
      mockUserModel.create.mockResolvedValue(newUser);
      mockSessionService.create.mockResolvedValue({ hash: 'session_hash' });
      mockTokenService.generateTokens.mockReturnValue({
        accessToken: 'access',
        refreshToken: 'refresh',
      });
      mockUserModel.findByPk.mockResolvedValue(newUser);
    });

    it('should register a new standalone user', async () => {
      const result = await service.register(dto as any);

      expect(mockUserModel.findOne).toHaveBeenCalledWith({
        where: { email: 'jane@example.com', deleted_at: null },
      });
      expect(mockUserTypeModel.findOne).toHaveBeenCalledWith({
        where: { code: 'USER', is_active: true },
      });
      expect(mockPasswordService.hash).toHaveBeenCalledWith('password123');
      expect(mockUserModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'jane@example.com',
          organization_id: null,
          user_type_id: 2,
        }),
      );
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
      email: 'john@example.com',
      firstName: 'John',
      lastName: 'Doe',
      password: 'password123',
    };

    const invitation = {
      email: 'john@example.com',
      invited_by: 1,
      user_type_id: 2,
    };

    const newUser = {
      id: 100,
      uuid: 'uuid-100',
      email: 'john@example.com',
      first_name: 'John',
      organization_id: null,
      user_type: { code: 'USER' },
    };

    it('should register a user with valid token', async () => {
      mockInvitationService.validateToken.mockResolvedValue(invitation);
      mockUserTypeModel.findOne.mockResolvedValue({ id: 2, code: 'USER' });
      mockUserModel.findOne.mockResolvedValue(null);
      mockUserModel.findByPk.mockResolvedValue(newUser);
      mockUserModel.create.mockResolvedValue(newUser);

      mockSessionService.create.mockResolvedValue({ hash: 'session_hash' });
      mockTokenService.generateTokens.mockReturnValue({
        accessToken: 'access',
        refreshToken: 'refresh',
      });

      const result = await service.registerWithToken(dto);

      expect(mockInvitationService.validateToken).toHaveBeenCalledWith(dto.token);
      expect(mockUserModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'john@example.com',
          organization_id: null,
          user_type_id: 2,
        }),
      );
      expect(mockInvitationService.accept).toHaveBeenCalledWith(dto.token);
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('user');
    });

    it('should throw ConflictException if email already registered', async () => {
      mockInvitationService.validateToken.mockResolvedValue(invitation);
      mockUserModel.findOne.mockResolvedValue({ id: 999 }); // User exists

      await expect(service.registerWithToken(dto)).rejects.toThrow(ConflictException);
    });

    it('should allow a generic invite to register any email', async () => {
      mockInvitationService.validateToken.mockResolvedValue({
        email: 'invite+token@comet.local',
        invited_by: 1,
        user_type_id: 2,
      });
      mockUserTypeModel.findOne.mockResolvedValue({ id: 2, code: 'USER' });
      mockUserModel.findOne.mockResolvedValue(null);
      mockUserModel.findByPk.mockResolvedValue({ ...newUser, email: dto.email });
      mockUserModel.create.mockResolvedValue({ ...newUser, email: dto.email });
      mockSessionService.create.mockResolvedValue({ hash: 'session_hash' });
      mockTokenService.generateTokens.mockReturnValue({
        accessToken: 'access',
        refreshToken: 'refresh',
      });

      const result = await service.registerWithToken(dto);

      expect(mockUserModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'john@example.com',
          organization_id: null,
          user_type_id: 2,
        }),
      );
      expect(result).toHaveProperty('accessToken');
    });
  });
});
