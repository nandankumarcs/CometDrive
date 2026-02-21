import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import * as crypto from 'crypto';
import { Share, SharePermission } from '../../entities/share.entity';
import { FileEntity } from '../../entities/file.entity';
import { FolderEntity } from '../../entities/folder.entity';
import { UserEntity } from '../../entities/user.entity';
import { CreateShareDto } from './dto/create-share.dto';
import { UpdateShareDto } from './dto/update-share.dto';
import { PasswordService } from '../auth/services';
import { StorageService } from '../storage/storage.service';
import { NotificationService } from '../notification/notification.service';

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
    private readonly passwordService: PasswordService,
    private readonly storageService: StorageService,
    private readonly notificationService: NotificationService,
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
    const downloadEnabled = createShareDto.downloadEnabled ?? true;
    const password = createShareDto.password?.trim();

    if (!recipientId && permission === SharePermission.EDITOR) {
      throw new BadRequestException('Public shares can only be viewer permission');
    }

    if (recipientId && (createShareDto.downloadEnabled !== undefined || password)) {
      throw new BadRequestException('Public link settings are only supported for public shares');
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
      if (createShareDto.downloadEnabled !== undefined) {
        existingShare.download_enabled = downloadEnabled;
      }
      if (createShareDto.password !== undefined) {
        await this.applyPasswordUpdate(existingShare, password);
      }
      await existingShare.save();
      return this.serializeShare(existingShare);
    }

    const token = crypto.randomBytes(5).toString('hex');
    const newShare = await this.shareModel.create({
      token,
      file_id: resource.type === 'file' ? resource.id : null,
      folder_id: resource.type === 'folder' ? resource.id : null,
      created_by: user.id,
      recipient_id: recipientId,
      expires_at: createShareDto.expiresAt,
      is_active: true,
      permission,
      download_enabled: downloadEnabled,
      password_hash: password ? await this.passwordService.hash(password) : null,
    });

    if (recipientId) {
      await this.notificationService.create({
        user_id: recipientId,
        type: resourceType === 'file' ? 'file_shared' : 'folder_shared',
        title: `${user.first_name || 'Someone'} shared a ${resourceType} with you`,
        body: `You now have access to "${resource.name}".`,
      });
    }

    return this.serializeShare(newShare);
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

  async updateShare(user: UserEntity, shareUuid: string, dto: UpdateShareDto) {
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

    if (dto.permission) {
      if (share.recipient_id === null && dto.permission === SharePermission.EDITOR) {
        throw new BadRequestException('Public shares can only be viewer permission');
      }
      share.permission = dto.permission;
    }

    if (dto.expiresAt !== undefined) {
      share.expires_at = dto.expiresAt;
    }

    if (dto.downloadEnabled !== undefined) {
      if (share.recipient_id !== null) {
        throw new BadRequestException('Public link settings are only supported for public shares');
      }
      share.download_enabled = dto.downloadEnabled;
    }

    if (dto.password !== undefined) {
      if (share.recipient_id !== null) {
        throw new BadRequestException('Public link settings are only supported for public shares');
      }
      const password = dto.password?.trim();
      await this.applyPasswordUpdate(share, password);
    }

    await share.save();
    return this.serializeShare(share);
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

    return this.shareModel
      .findAll({
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
      })
      .then((shares) => shares.map((share) => this.serializeShare(share)));
  }

  async findOneByToken(token: string, password?: string) {
    const share = await this.getPublicShare(token, password, false);
    await share.increment('views');
    return this.serializeShare(share);
  }

  async getPublicDownload(token: string, password?: string) {
    const share = await this.getPublicShare(token, password, true);

    if (!share.file) {
      throw new NotFoundException('File not found');
    }

    if (share.download_enabled === false) {
      throw new ForbiddenException('Downloads are disabled for this link');
    }

    const stream = await this.storageService.download(share.file.storage_path);
    return { file: share.file, stream };
  }

  async findSharedWith(user: UserEntity) {
    return this.shareModel
      .findAll({
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
      })
      .then((shares) => shares.map((share) => this.serializeShare(share)));
  }

  private serializeShare(share: Share | null) {
    if (!share) return null;
    const plain = typeof (share as any).toJSON === 'function' ? (share as any).toJSON() : share;
    const { password_hash, ...rest } = plain as any;
    return {
      ...rest,
      has_password: Boolean(password_hash),
    };
  }

  private async applyPasswordUpdate(share: Share, password?: string | null) {
    if (password === undefined) {
      return;
    }

    if (!password) {
      share.password_hash = null;
      return;
    }

    share.password_hash = await this.passwordService.hash(password);
  }

  private async getPublicShare(token: string, password?: string, includeStoragePath = false) {
    const fileAttributes = includeStoragePath
      ? ['uuid', 'name', 'mime_type', 'size', 'created_at', 'updated_at', 'storage_path']
      : ['uuid', 'name', 'mime_type', 'size', 'created_at', 'updated_at'];

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
          attributes: fileAttributes,
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

    const normalizedPassword = password?.trim();

    if (share.password_hash) {
      if (!normalizedPassword) {
        throw new UnauthorizedException('Password required');
      }

      const matches = await this.passwordService.compare(normalizedPassword, share.password_hash);
      if (!matches) {
        throw new UnauthorizedException('Invalid password');
      }
    }

    return share;
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
      return { type: 'file' as const, id: file.id, name: file.name };
    }

    const folder = await this.folderModel.findOne({ where: { uuid: resourceUuid } });
    if (!folder) {
      throw new NotFoundException('Folder not found');
    }
    this.ensureSharePermission(folder.user_id, user);
    return { type: 'folder' as const, id: folder.id, name: folder.name };
  }

  private ensureSharePermission(ownerUserId: number, user: any) {
    if (ownerUserId !== user.id && user.userTypeId > 2) {
      throw new NotFoundException('Resource not found or access denied');
    }
  }
}
