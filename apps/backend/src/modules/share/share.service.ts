import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import * as crypto from 'crypto';
import { Share, SharePermission } from '../../entities/share.entity';
import { FileEntity } from '../../entities/file.entity';
import { FolderEntity } from '../../entities/folder.entity';
import { UserEntity } from '../../entities/user.entity';
import { CreateShareDto } from './dto/create-share.dto';

type ResourceType = 'file' | 'folder';

@Injectable()
export class ShareService {
  constructor(
    @InjectModel(Share)
    private readonly shareModel: typeof Share,
    @InjectModel(FileEntity)
    private readonly fileModel: typeof FileEntity,
    @InjectModel(FolderEntity)
    private readonly folderModel: typeof FolderEntity,
    @InjectModel(UserEntity)
    private readonly userModel: typeof UserEntity,
  ) {}

  async create(user: any, createShareDto: CreateShareDto) {
    const hasFileId = !!createShareDto.fileId;
    const hasFolderId = !!createShareDto.folderId;
    if ((hasFileId && hasFolderId) || (!hasFileId && !hasFolderId)) {
      throw new BadRequestException('Provide either fileId or folderId');
    }

    const resourceType: ResourceType = hasFileId ? 'file' : 'folder';
    const resourceUuid = (createShareDto.fileId ?? createShareDto.folderId)!;
    const permission = createShareDto.permission ?? SharePermission.VIEWER;

    if (resourceType === 'folder' && !createShareDto.recipientEmail?.trim()) {
      throw new BadRequestException('Folder sharing requires recipientEmail');
    }

    const resource = await this.getOwnedResource(resourceType, resourceUuid, user);
    const recipientId = await this.resolveRecipientId(createShareDto.recipientEmail);

    if (!recipientId && permission === SharePermission.EDITOR) {
      throw new BadRequestException('Public shares can only be viewer permission');
    }

    const whereClause: any = {
      created_by: user.id,
      is_active: true,
      recipient_id: recipientId ?? null,
      file_id: null,
      folder_id: null,
    };
    if (resource.type === 'file') {
      whereClause.file_id = resource.id;
    } else {
      whereClause.folder_id = resource.id;
    }

    const existingShare = await this.shareModel.findOne({ where: whereClause });
    if (existingShare) {
      existingShare.permission = permission;
      if (createShareDto.expiresAt !== undefined) {
        existingShare.expires_at = createShareDto.expiresAt;
      }
      await existingShare.save();
      return existingShare;
    }

    const token = crypto.randomBytes(5).toString('hex');
    return this.shareModel.create({
      token,
      file_id: resource.type === 'file' ? resource.id : null,
      folder_id: resource.type === 'folder' ? resource.id : null,
      created_by: user.id,
      recipient_id: recipientId,
      expires_at: createShareDto.expiresAt,
      is_active: true,
      permission,
    });
  }

  // Legacy endpoint support: revoke all file shares created by user.
  async revoke(user: UserEntity, fileUuid: string) {
    const file = await this.getOwnedResource('file', fileUuid, user);
    await this.shareModel.update(
      { is_active: false },
      { where: { file_id: file.id, created_by: user.id, is_active: true } },
    );
    return { success: true };
  }

  async revokeByShareUuid(user: UserEntity, shareUuid: string) {
    const share = await this.shareModel.findOne({
      where: {
        uuid: shareUuid,
        created_by: user.id,
        is_active: true,
      },
    });

    if (!share) {
      throw new NotFoundException('Share not found');
    }

    share.is_active = false;
    await share.save();
    return { success: true };
  }

  // Legacy endpoint support: returns one active share for a file.
  async getShareByFile(user: UserEntity, fileUuid: string) {
    const shares = await this.getSharesByResource(user, 'file', fileUuid);
    const publicShare = shares.find((share) => share.recipient_id === null);
    return publicShare ?? shares[0] ?? null;
  }

  async getShareByFolder(user: UserEntity, folderUuid: string) {
    const shares = await this.getSharesByResource(user, 'folder', folderUuid);
    return shares[0] ?? null;
  }

  async getSharesByResource(user: UserEntity, resourceType: ResourceType, resourceUuid: string) {
    const resource = await this.getOwnedResource(resourceType, resourceUuid, user);
    const whereClause: any = {
      created_by: user.id,
      is_active: true,
      file_id: null,
      folder_id: null,
    };

    if (resource.type === 'file') {
      whereClause.file_id = resource.id;
    } else {
      whereClause.folder_id = resource.id;
    }

    return this.shareModel.findAll({
      where: whereClause,
      include: [
        {
          model: UserEntity,
          as: 'recipient',
          attributes: ['uuid', 'first_name', 'last_name', 'email'],
          required: false,
        },
      ],
      order: [['created_at', 'DESC']],
    });
  }

  async findOneByToken(token: string) {
    const share = await this.shareModel.findOne({
      where: {
        token,
        is_active: true,
        recipient_id: null,
      },
      include: [
        {
          model: FileEntity,
          as: 'file',
          attributes: ['uuid', 'name', 'mime_type', 'size', 'created_at', 'updated_at'],
          required: false,
        },
        {
          model: FolderEntity,
          as: 'folder',
          attributes: ['uuid', 'name', 'created_at', 'updated_at'],
          required: false,
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

    share.increment('views');
    return share;
  }

  async findSharedWith(user: UserEntity) {
    return this.shareModel.findAll({
      where: {
        recipient_id: user.id,
        is_active: true,
        [Op.or]: [{ expires_at: null }, { expires_at: { [Op.gt]: new Date() } }],
      },
      include: [
        {
          model: FileEntity,
          as: 'file',
          attributes: ['uuid', 'name', 'mime_type', 'size', 'created_at', 'updated_at'],
          required: false,
        },
        {
          model: FolderEntity,
          as: 'folder',
          attributes: ['uuid', 'name', 'created_at', 'updated_at'],
          required: false,
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

  private async resolveRecipientId(email?: string) {
    if (!email?.trim()) {
      return null;
    }

    const recipient = await this.userModel.findOne({
      where: { email: email.trim().toLowerCase() },
    });
    if (!recipient) {
      throw new NotFoundException(`User with email ${email} not found`);
    }
    return recipient.id;
  }

  private async getOwnedResource(resourceType: ResourceType, resourceUuid: string, user: any) {
    if (resourceType === 'file') {
      const file = await this.fileModel.findOne({ where: { uuid: resourceUuid } });
      if (!file) {
        throw new NotFoundException('File not found');
      }
      this.ensureSharePermission(file.user_id, user);
      return { type: 'file' as const, id: file.id };
    }

    const folder = await this.folderModel.findOne({ where: { uuid: resourceUuid } });
    if (!folder) {
      throw new NotFoundException('Folder not found');
    }
    this.ensureSharePermission(folder.user_id, user);
    return { type: 'folder' as const, id: folder.id };
  }

  private ensureSharePermission(ownerUserId: number, user: any) {
    if (ownerUserId !== user.id && user.userTypeId > 2) {
      throw new NotFoundException('Resource not found or access denied');
    }
  }
}
