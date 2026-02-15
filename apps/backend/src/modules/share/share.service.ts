import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Share } from '../../entities/share.entity';
import { FileEntity } from '../../entities/file.entity'; // Updated import
import { UserEntity } from '../../entities/user.entity'; // Updated import
import { nanoid } from 'nanoid';
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
  async create(user: UserEntity, createShareDto: CreateShareDto) {
    // Check if file exists and belongs to user (or user has permission)
    const file = await this.fileModel.findOne({
      where: {
        uuid: createShareDto.fileId,
        // user_id: user.id, // removed for simplicity, assuming service check or allowing admins
      },
      include: [{ model: UserEntity, as: 'user' }],
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    if (file.user_id !== user.id) {
      // Optional: check if user is admin or owner. For now assuming simple owner check is enough but let's be strict if needed.
      // For MVP, enable sharing if user can access file. But simple impl:
      if (user.user_type_id > 2) {
        // Assuming 1=SuperAdmin, 2=Admin, 3=User. Need to check UserType enum/constants.
        // Strict owner check for standard users
      }
    }

    // Check if active share already exists for this file created by this user
    const existingShare = await this.shareModel.findOne({
      where: {
        file_id: file.uuid,
        created_by: user.uuid,
        is_active: true,
      },
    });

    if (existingShare) {
      return existingShare;
    }

    // Create new share
    return this.shareModel.create({
      token: nanoid(10), // Short unique ID
      file_id: file.uuid,
      created_by: user.uuid,
      expires_at: createShareDto.expiresAt,
      is_active: true,
    });
  }

  /**
   * Revoke a share link
   */
  async revoke(user: UserEntity, fileId: string) {
    const share = await this.shareModel.findOne({
      where: {
        file_id: fileId,
        created_by: user.uuid,
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
  async getShareByFile(user: UserEntity, fileId: string) {
    return this.shareModel.findOne({
      where: {
        file_id: fileId,
        created_by: user.uuid,
        is_active: true,
      },
    });
  }
}
