import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  HasMany,
  IsUUID,
  Sequelize,
  Table,
} from 'sequelize-typescript';
import { BaseEntity } from './base.entity';
import { UserEntity } from './user.entity';

@Table({
  tableName: 'folder',
  paranoid: true,
})
export class FolderEntity extends BaseEntity {
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
    field: 'parent_id',
    type: DataType.INTEGER,
    allowNull: true,
  })
  declare parent_id: number | null;

  @BelongsTo(() => FolderEntity, 'parent_id')
  declare parent: FolderEntity | null;

  @HasMany(() => FolderEntity, 'parent_id')
  declare subfolders: FolderEntity[];

  @Column({
    field: 'deleted_at',
    type: DataType.DATE,
    allowNull: true,
  })
  declare deleted_at: Date | null;
}
