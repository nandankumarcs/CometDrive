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
import { FolderEntity } from './folder.entity';
import { UserEntity } from './user.entity';

@Table({
  tableName: 'file',
  paranoid: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
})
export class FileEntity extends BaseEntity {
  @IsUUID(4)
  @Column({
    type: DataType.UUID,
    allowNull: false,
    defaultValue: Sequelize.literal('gen_random_uuid()'),
  })
  declare uuid: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare name: string;

  @Column({
    field: 'original_name',
    type: DataType.STRING,
    allowNull: false,
  })
  declare original_name: string;

  @Column({
    field: 'mime_type',
    type: DataType.STRING,
    allowNull: false,
  })
  declare mime_type: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare size: number;

  @Column({
    field: 'storage_path',
    type: DataType.STRING,
    allowNull: false,
  })
  declare storage_path: string;

  @Column({
    field: 'storage_bucket',
    type: DataType.STRING,
    allowNull: true,
  })
  declare storage_bucket: string | null;

  @Column({
    field: 'storage_provider',
    type: DataType.STRING,
    allowNull: false,
    defaultValue: 'local',
  })
  declare storage_provider: string;

  @ForeignKey(() => UserEntity)
  @Column({
    field: 'user_id',
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare user_id: number;

  @BelongsTo(() => UserEntity)
  declare user: UserEntity;

  @ForeignKey(() => FolderEntity)
  @Column({
    field: 'folder_id',
    type: DataType.INTEGER,
    allowNull: true,
  })
  declare folder_id: number | null;

  @BelongsTo(() => FolderEntity)
  declare folder: FolderEntity | null;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  })
  declare is_starred: boolean;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  declare deleted_at: Date | null;
}
