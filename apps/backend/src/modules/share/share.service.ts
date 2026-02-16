import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Share } from '../../entities/share.entity';
import { FileEntity } from '../../entities/file.entity'; // Updated import
import { UserEntity } from '../../entities/user.entity'; // Updated import
import * as crypto from 'crypto';
import { CreateShareDto } from './dto/create-share.dto';

@Injectable()
export class ShareService {
  constructor(
    @InjectModel(Share)
    private readonly shareModel: typeof Share,
    @InjectModel(FileEntity)
    private readonly fileModel: typeof FileEntity,
    @InjectModel(UserEntity)
    private readonly userModel: typeof UserEntity,
  ) {}

  /**
   * Create a new share link for a file
   */
  async create(user: any, createShareDto: CreateShareDto) {
    // Check if file exists and belongs to user (or user has permission)
    const file = await this.fileModel.findOne({
      where: {
        uuid: createShareDto.fileId,
      },
      include: [{ model: UserEntity, as: 'user' }],
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    // Role check - only owner or admin can share
    if (file.user_id !== user.id) {
      if (user.userTypeId > 2) {
        throw new NotFoundException('File not found or access denied');
      }
    }

    let recipientId: number | null = null;
    if (createShareDto.recipientEmail) {
      const recipient = await this.userModel.findOne({
        where: { email: createShareDto.recipientEmail },
      });

      if (!recipient) {
        throw new NotFoundException(`User with email ${createShareDto.recipientEmail} not found`);
      }
      recipientId = recipient.id;
    }

    // Check if active share already exists for this file created by this user
    // If recipient is specified, check for existing share for that recipient
    const whereClause: any = {
      file_id: file.id,
      created_by: user.id,
      is_active: true,
    };

    if (recipientId) {
      whereClause.recipient_id = recipientId;
    } else {
      whereClause.recipient_id = null; // Public link
    }

    const existingShare = await this.shareModel.findOne({
      where: whereClause,
    });

    if (existingShare) {
      // If we are sharing with the same person again, likely we want to return the existing share
      // Or maybe extend expiration? For MVP, return existing.
      return existingShare;
    }

    // Create new share
    const token = crypto.randomBytes(5).toString('hex');

    return await this.shareModel.create({
      token,
      file_id: file.id,
      created_by: user.id,
      recipient_id: recipientId,
      expires_at: createShareDto.expiresAt,
      is_active: true,
    });
  }

  /**
   * Revoke a share link
   */
  async revoke(user: UserEntity, fileUuid: string) {
    // Need to resolve file UUID to ID first
    const file = await this.fileModel.findOne({ where: { uuid: fileUuid } });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    // Revoke all shares for this file created by this user?
    // Or mostly just the public one?
    // For MVP, revoke ALL shares for this file by this user to be safe
    // Or we should allow revoking specific shares.
    // Given the current UI has one "Revoke" button, we revoke all.

    await this.shareModel.update(
      { is_active: false },
      {
        where: {
          file_id: file.id,
          created_by: user.id,
          is_active: true,
        },
      },
    );

    return { success: true };
  }

  /**
   * Get share info by token (Public access)
   */
  async findOneByToken(token: string) {
    const share = await this.shareModel.findOne({
      where: {
        token,
        is_active: true,
      },
      include: [
        {
          model: FileEntity,
          as: 'file',
          attributes: ['uuid', 'name', 'mime_type', 'size', 'created_at', 'updated_at'],
        },
        {
          model: UserEntity,
          as: 'creator',
          attributes: ['first_name', 'last_name'],
        },
      ],
    });

    if (!share) {
      throw new NotFoundException('Link not found or expired');
    }

    if (share.expires_at && new Date() > share.expires_at) {
      share.is_active = false;
      await share.save();
      throw new NotFoundException('Link expired');
    }

    // Increment view count
    share.increment('views');

    return share;
  }

  /**
   * Get active public share for a file (User internal check)
   * This is used by the frontend to show the "Link is active" state.
   * Modifying to prefer public link if exists, or return any active share.
   */
  async getShareByFile(user: UserEntity, fileUuid: string) {
    const file = await this.fileModel.findOne({ where: { uuid: fileUuid } });

    if (!file) {
      return null;
    }

    // Prefer public link (recipient_id is null)
    const publicShare = await this.shareModel.findOne({
      where: {
        file_id: file.id,
        created_by: user.id,
        is_active: true,
        recipient_id: null,
      },
    });

    if (publicShare) return publicShare;

    // Otherwise return any active share (maybe shared with specific user)
    return this.shareModel.findOne({
      where: {
        file_id: file.id,
        created_by: user.id,
        is_active: true,
      },
    });
  }

  /**
   * Find files shared with the current user
   */
  async findSharedWith(user: UserEntity) {
    return this.shareModel.findAll({
      where: {
        recipient_id: user.id,
        is_active: true,
      },
      include: [
        {
          model: FileEntity,
          as: 'file',
          attributes: ['uuid', 'name', 'mime_type', 'size', 'created_at', 'updated_at'],
        },
        {
          model: UserEntity,
          as: 'creator',
          attributes: ['first_name', 'last_name', 'email'],
        },
      ],
      order: [['created_at', 'DESC']],
    });
  }
}
