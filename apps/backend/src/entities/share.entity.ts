import {
  Table,
  Column,
  DataType,
  ForeignKey,
  BelongsTo,
  AllowNull,
  DeletedAt,
} from 'sequelize-typescript';
import { UserEntity } from './user.entity';
import { FileEntity } from './file.entity';
import { BaseEntity } from './base.entity';

@Table({
  tableName: 'share',
  timestamps: true,
  paranoid: true, // Soft delete supported
})
export class Share extends BaseEntity {
  @Column({
    field: 'uuid',
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    allowNull: false,
    unique: true,
  })
  declare uuid: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
  })
  declare token: string;

  @ForeignKey(() => FileEntity)
  @Column({
    field: 'file_id',
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare file_id: number;

  @BelongsTo(() => FileEntity)
  declare file: FileEntity;

  @ForeignKey(() => UserEntity)
  @Column({
    field: 'created_by',
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare created_by: number;

  @BelongsTo(() => UserEntity)
  declare creator: UserEntity;

  @ForeignKey(() => UserEntity)
  @Column({
    field: 'recipient_id',
    type: DataType.INTEGER,
    allowNull: true,
  })
  declare recipient_id: number | null;

  @BelongsTo(() => UserEntity, 'recipient_id')
  declare recipient: UserEntity | null;

  @Column({
    field: 'is_active',
    type: DataType.BOOLEAN,
    defaultValue: true,
  })
  declare is_active: boolean;

  @AllowNull(true)
  @Column({
    field: 'expires_at',
    type: DataType.DATE,
  })
  declare expires_at: Date | null;

  @Column({
    field: 'views',
    type: DataType.INTEGER,
    defaultValue: 0,
  })
  declare views: number;

  @DeletedAt
  @Column({
    field: 'deleted_at',
    type: DataType.DATE,
    allowNull: true,
  })
  declare deletedAt: Date | null;
}
