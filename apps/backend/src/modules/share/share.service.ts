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

    // Check if active share already exists for this file created by this user
    const existingShare = await this.shareModel.findOne({
      where: {
        file_id: file.id,
        created_by: user.id,
        is_active: true,
      },
    });

    if (existingShare) {
      return existingShare;
    }

    // Create new share
    const token = crypto.randomBytes(5).toString('hex');

    return await this.shareModel.create({
      token,
      file_id: file.id,
      created_by: user.id,
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

    const share = await this.shareModel.findOne({
      where: {
        file_id: file.id,
        created_by: user.id,
        is_active: true,
      },
    });

    if (!share) {
      throw new NotFoundException('Active share link not found');
    }

    share.is_active = false;
    await share.save();
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
          attributes: ['uuid', 'name', 'mime_type', 'size', 'created_at', 'updated_at'], // Don't expose internal paths yet securely
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
   * Get active share for a file (User internal check)
   */
  async getShareByFile(user: UserEntity, fileUuid: string) {
    const file = await this.fileModel.findOne({ where: { uuid: fileUuid } });

    if (!file) {
      // If file doesn't exist, they can't have a share for it
      return null;
    }

    return this.shareModel.findOne({
      where: {
        file_id: file.id,
        created_by: user.id,
        is_active: true,
      },
    });
  }
}
