import { BelongsTo, Column, DataType, ForeignKey, Table } from 'sequelize-typescript';
import { BaseEntity } from './base.entity';
import { UserEntity } from './user.entity';

@Table({
  tableName: 'audit_log',
})
export class AuditLogEntity extends BaseEntity {
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare action: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  declare entity_id: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare entity_type: string;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  declare metadata: Record<string, unknown>;

  @ForeignKey(() => UserEntity)
  @Column({
    type: DataType.INTEGER,
    allowNull: true, // System actions might not have a user
  })
  declare user_id: number;

  @BelongsTo(() => UserEntity)
  declare user: UserEntity;
}
