import { Table, Column, DataType, ForeignKey, BelongsTo, Index } from 'sequelize-typescript';
import { BaseEntity } from './base.entity';
import { UserEntity } from './user.entity';
import { FileEntity } from './file.entity';

@Table({
  tableName: 'file_playback_progress',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
})
export class FilePlaybackProgressEntity extends BaseEntity {
  @ForeignKey(() => UserEntity)
  @Index({ name: 'UQ_FILE_PLAYBACK_PROGRESS_USER_FILE', unique: true })
  @Column({
    field: 'user_id',
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare user_id: number;

  @BelongsTo(() => UserEntity)
  declare user: UserEntity;

  @ForeignKey(() => FileEntity)
  @Index({ name: 'UQ_FILE_PLAYBACK_PROGRESS_USER_FILE', unique: true })
  @Column({
    field: 'file_id',
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare file_id: number;

  @BelongsTo(() => FileEntity)
  declare file: FileEntity;

  @Column({
    field: 'position_seconds',
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  declare position_seconds: number;

  @Column({
    field: 'duration_seconds',
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  declare duration_seconds: number;

  @Column({
    field: 'progress_percent',
    type: DataType.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0,
  })
  declare progress_percent: string;

  @Index({ name: 'IDX_FILE_PLAYBACK_PROGRESS_USER_LAST_WATCHED' })
  @Column({
    field: 'last_watched_at',
    type: DataType.DATE,
    allowNull: false,
  })
  declare last_watched_at: Date;
}
