import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { AuditLogEntity } from '@src/entities';
import { UserEntity } from '@src/entities';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectModel(AuditLogEntity)
    private readonly auditLogModel: typeof AuditLogEntity,
  ) {}

  async log(
    action: string,
    user?: UserEntity | number,
    metadata?: Record<string, unknown>,
    entityId?: number,
    entityType?: string,
  ): Promise<AuditLogEntity | void> {
    try {
      const userId = user ? (typeof user === 'number' ? user : user.id) : undefined;

      const log = await this.auditLogModel.create({
        action,
        user_id: userId,
        metadata,
        entity_id: entityId,
        entity_type: entityType,
      });

      return log;
    } catch (error) {
      // Audit logging should essentially be non-blocking/fail-safe usually,
      // but logging the error is crucial.
      this.logger.error(`Failed to create audit log for action "${action}": ${error}`);
    }
  }

  async findAll(
    userId: number,
    limit = 20,
    offset = 0,
  ): Promise<{ rows: AuditLogEntity[]; count: number }> {
    return this.auditLogModel.findAndCountAll({
      where: { user_id: userId },
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      include: [UserEntity],
    });
  }
}
