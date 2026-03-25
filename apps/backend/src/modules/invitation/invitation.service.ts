import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { InvitationEntity, UserEntity, UserTypeEntity } from '@src/entities';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import * as crypto from 'crypto';

@Injectable()
export class InvitationService {
  constructor(
    @InjectModel(InvitationEntity)
    private readonly invitationModel: typeof InvitationEntity,
    @InjectModel(UserTypeEntity)
    private readonly userTypeModel: typeof UserTypeEntity,
  ) {}

  async create(createInvitationDto: CreateInvitationDto, inviter: UserEntity) {
    const requestedEmail = createInvitationDto.email?.trim().toLowerCase();

    // All invite signups are standard users for now.
    const userType = await this.userTypeModel.findOne({
      where: { code: 'USER', is_active: true },
    });
    if (!userType) {
      throw new NotFoundException('Default user type not found');
    }

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    const email = requestedEmail ?? this.buildGenericInviteEmail(token);

    // Check for existing active invitation
    const existingInvitation = requestedEmail
      ? await this.invitationModel.findOne({
          where: {
            email,
            accepted_at: null,
            is_revoked: false,
          },
        })
      : null;

    if (existingInvitation) {
      if (existingInvitation.expires_at > new Date()) {
        throw new BadRequestException('Active invitation already exists for this email');
      }
      // If expired, we can create a new one (or revoke old one implicitly? separate logic)
      // For now, let's just revoke the old one to keep history clean
      existingInvitation.is_revoked = true;
      await existingInvitation.save();
    }
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

    const invitation = await this.invitationModel.create({
      email,
      user_type_id: userType.id,
      invited_by: inviter.id,
      token,
      expires_at: expiresAt,
    });

    return invitation;
  }

  async validateToken(token: string): Promise<InvitationEntity> {
    const invitation = await this.invitationModel.findOne({
      where: { token },
      include: [UserTypeEntity],
    });

    if (!invitation) {
      throw new NotFoundException('Invalid invitation token');
    }

    if (invitation.is_revoked) {
      throw new BadRequestException('Invitation has been revoked');
    }

    if (invitation.accepted_at) {
      throw new BadRequestException('Invitation has already been used');
    }

    if (invitation.expires_at < new Date()) {
      throw new BadRequestException('Invitation has expired');
    }

    return invitation;
  }

  async accept(token: string): Promise<InvitationEntity> {
    const invitation = await this.validateToken(token);

    invitation.accepted_at = new Date();
    await invitation.save();

    return invitation;
  }

  async revoke(uuid: string): Promise<InvitationEntity> {
    const invitation = await this.invitationModel.findOne({ where: { uuid } });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    invitation.is_revoked = true;
    await invitation.save();

    return invitation;
  }

  async findAll() {
    return this.invitationModel.findAll({
      include: [
        { model: UserEntity, as: 'inviter', attributes: ['first_name', 'last_name', 'email'] },
        UserTypeEntity,
      ],
      order: [['created_at', 'DESC']],
    });
  }

  private buildGenericInviteEmail(token: string): string {
    return `invite+${token.slice(0, 16)}@comet.local`;
  }
}
