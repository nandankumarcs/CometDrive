import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  IsUUID,
  Sequelize,
  Table,
} from 'sequelize-typescript';
import { BaseEntity } from './base.entity';
import { UserEntity } from './user.entity';

@Table({
  tableName: 'notification',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
})
export class NotificationEntity extends BaseEntity {
  @IsUUID(4)
  @Column({
    type: DataType.UUID,
    allowNull: false,
    defaultValue: Sequelize.literal('gen_random_uuid()'),
  })
  declare uuid: string;

  @ForeignKey(() => UserEntity)
  @Column({
    field: 'user_id',
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare user_id: number;

  @BelongsTo(() => UserEntity)
  declare user: UserEntity;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare type: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare title: string;

  @Column({
    type: DataType.STRING(1000),
    allowNull: true,
  })
  declare body: string | null;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  declare is_read: boolean;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  declare metadata: Record<string, any> | null;
}
