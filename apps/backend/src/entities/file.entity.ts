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
import { FolderEntity } from './folder.entity';

@Table({
  tableName: 'file',
  paranoid: true,
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
    type: DataType.BIGINT,
    allowNull: false,
  })
  declare size: number;

  @Column({
    field: 'mime_type',
    type: DataType.STRING,
    allowNull: false,
  })
  declare mime_type: string;

  @Column({
    field: 'storage_key',
    type: DataType.STRING,
    allowNull: false,
  })
  declare storage_key: string;

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
    field: 'deleted_at',
    type: DataType.DATE,
    allowNull: true,
  })
  declare deleted_at: Date | null;
}
