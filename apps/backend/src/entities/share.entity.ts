import { Table, Column, DataType, ForeignKey, BelongsTo, AllowNull } from 'sequelize-typescript';
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
    type: DataType.STRING,
    allowNull: false,
    unique: true,
  })
  token: string;

  @ForeignKey(() => FileEntity)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  file_id: number;

  @BelongsTo(() => FileEntity)
  file: FileEntity;

  @ForeignKey(() => UserEntity)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  created_by: number;

  @BelongsTo(() => UserEntity)
  creator: UserEntity;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
  })
  is_active: boolean;

  @AllowNull(true)
  @Column({
    type: DataType.DATE,
  })
  expires_at: Date | null;

  @Column({
    type: DataType.INTEGER, // Views count, optional but good for stats
    defaultValue: 0,
  })
  views: number;
}
