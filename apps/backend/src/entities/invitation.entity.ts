import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Index,
  IsEmail,
  IsUUID,
  Sequelize,
  Table,
} from 'sequelize-typescript';
import { BaseEntity } from './base.entity';
import { UserEntity } from './user.entity';
import { UserTypeEntity } from './user-type.entity';

@Table({
  tableName: 'invitation',
})
export class InvitationEntity extends BaseEntity {
  @IsUUID(4)
  @Column({
    type: DataType.UUID,
    allowNull: false,
    defaultValue: Sequelize.literal('gen_random_uuid()'),
  })
  declare uuid: string;

  @Index({ name: 'IDX_INVITATION_EMAIL' })
  @IsEmail
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare email: string;

  @Index({ name: 'IDX_INVITATION_TOKEN', unique: true })
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare token: string;

  @ForeignKey(() => UserTypeEntity)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare user_type_id: number;

  @BelongsTo(() => UserTypeEntity)
  declare user_type: UserTypeEntity;

  @ForeignKey(() => UserEntity)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare invited_by: number;

  @BelongsTo(() => UserEntity)
  declare inviter: UserEntity;

  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  declare expires_at: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  declare accepted_at: Date | null;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  declare is_revoked: boolean;
}
