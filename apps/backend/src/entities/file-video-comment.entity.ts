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
import { FileEntity } from './file.entity';
import { UserEntity } from './user.entity';

@Table({
  tableName: 'file_video_comment',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
})
export class FileVideoCommentEntity extends BaseEntity {
  @IsUUID(4)
  @Column({
    type: DataType.UUID,
    allowNull: false,
    defaultValue: Sequelize.literal('gen_random_uuid()'),
  })
  declare uuid: string;

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
    field: 'user_id',
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare user_id: number;

  @BelongsTo(() => UserEntity, 'user_id')
  declare author: UserEntity;

  @Column({
    type: DataType.STRING(1000),
    allowNull: false,
  })
  declare content: string;

  @Column({
    field: 'timestamp_seconds',
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  declare timestamp_seconds: number;
}
