import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { getModelToken } from '@nestjs/sequelize';
import { AuditLogEntity } from '@src/entities';

describe('AuditService', () => {
  let service: AuditService;
  let model: typeof AuditLogEntity;

  const mockAuditLogModel = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: getModelToken(AuditLogEntity),
          useValue: mockAuditLogModel,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    model = module.get<typeof AuditLogEntity>(getModelToken(AuditLogEntity));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('log', () => {
    it('should create an audit log entry', async () => {
      const action = 'TEST_ACTION';
      const userId = 1;
      const metadata = { foo: 'bar' };
      const entityId = 123;
      const entityType = 'TestEntity';

      const mockCreatedLog = { id: 1, action, user_id: userId, metadata };
      mockAuditLogModel.create.mockResolvedValue(mockCreatedLog);

      const result = await service.log(action, userId, metadata, entityId, entityType);

      expect(mockAuditLogModel.create).toHaveBeenCalledWith({
        action,
        user_id: userId,
        metadata,
        entity_id: entityId,
        entity_type: entityType,
      });
      expect(result).toEqual(mockCreatedLog);
    });

    it('should create an audit log entry with UserEntity object', async () => {
      const action = 'TEST_ACTION';
      const user = { id: 1 } as any;

      await service.log(action, user);

      expect(mockAuditLogModel.create).toHaveBeenCalledWith({
        action,
        user_id: 1,
        metadata: undefined,
        entity_id: undefined,
        entity_type: undefined,
      });
    });

    it('should handle errors gracefully (log error but not throw)', async () => {
      const error = new Error('Database error');
      mockAuditLogModel.create.mockRejectedValue(error);

      // Spy on logger to verify error logging
      const loggerSpy = jest.spyOn((service as any).logger, 'error').mockImplementation();

      await expect(service.log('FAIL_ACTION')).resolves.not.toThrow();

      expect(loggerSpy).toHaveBeenCalled();
    });
  });
});
