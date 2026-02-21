import { Table, Column, DataType, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript';
import { BaseEntity } from './base.entity';
import { FileEntity } from './file.entity';
import { FolderEntity } from './folder.entity';
import { UserEntity } from './user.entity';

@Table({
  tableName: 'comment',
  timestamps: true,
  underscored: true,
})
export class CommentEntity extends BaseEntity {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    unique: true,
    allowNull: false,
  })
  uuid: string;

  @ForeignKey(() => FileEntity)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  file_id: number;

  @BelongsTo(() => FileEntity)
  file: FileEntity;

  @ForeignKey(() => FolderEntity)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  folder_id: number;

  @BelongsTo(() => FolderEntity)
  folder: FolderEntity;

  @ForeignKey(() => UserEntity)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  user_id: number;

  @BelongsTo(() => UserEntity)
  user: UserEntity;

  @ForeignKey(() => CommentEntity)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  parent_id: number;

  @BelongsTo(() => CommentEntity, 'parent_id')
  parent: CommentEntity;

  @HasMany(() => CommentEntity, 'parent_id')
  replies: CommentEntity[];

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  content: string;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  metadata: any;
}
