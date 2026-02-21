import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { InvitationEntity, UserEntity, UserTypeEntity } from '@src/entities';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import * as crypto from 'crypto';
import { MailerService } from '@crownstack/mailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class InvitationService {
  constructor(
    @InjectModel(InvitationEntity)
    private readonly invitationModel: typeof InvitationEntity,
    @InjectModel(UserTypeEntity)
    private readonly userTypeModel: typeof UserTypeEntity,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  async create(createInvitationDto: CreateInvitationDto, inviter: UserEntity) {
    const { email, user_type_id } = createInvitationDto;

    // Check if user type exists
    const userType = await this.userTypeModel.findByPk(user_type_id);
    if (!userType) {
      throw new NotFoundException('User type not found');
    }

    // Check for existing active invitation
    const existingInvitation = await this.invitationModel.findOne({
      where: {
        email,
        accepted_at: null,
        is_revoked: false,
      },
    });

    if (existingInvitation) {
      if (existingInvitation.expires_at > new Date()) {
        throw new BadRequestException('Active invitation already exists for this email');
      }
      // If expired, we can create a new one (or revoke old one implicitly? separate logic)
      // For now, let's just revoke the old one to keep history clean
      existingInvitation.is_revoked = true;
      await existingInvitation.save();
    }

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

    const invitation = await this.invitationModel.create({
      email,
      user_type_id,
      invited_by: inviter.id,
      token,
      expires_at: expiresAt,
    });

    // Send email
    const frontendUrl = this.configService.get('FRONTEND_DOMAIN', 'http://localhost:3000');
    const inviteLink = `${frontendUrl}/auth/signup?token=${token}`;

    await this.mailerService.sendMail({
      to: email,
      subject: 'You have been invited to join Comet',
      html: `
        <h1>Welcome to Comet</h1>
        <p>You have been invited by ${inviter.first_name} ${inviter.last_name} to join Comet as a ${userType.name}.</p>
        <p>Click the link below to accept the invitation and create your account:</p>
        <a href="${inviteLink}">${inviteLink}</a>
        <p>This link expires in 7 days.</p>
      `,
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
}
