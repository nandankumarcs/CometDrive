import { FileEntity, FolderEntity, UserEntity, OrganizationEntity } from '@src/entities';
import { CreateFileDto } from './dto/create-file.dto';
import { UpdateFileDto } from './dto/update-file.dto';
import { StorageService } from '@src/modules/storage/storage.service';
import { AuditService } from '@src/commons/services';
import { ForbiddenException, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);

  constructor(
    @InjectModel(FileEntity)
    private readonly fileModel: typeof FileEntity,
    @InjectModel(FolderEntity)
    private readonly folderModel: typeof FolderEntity,
    @InjectModel(OrganizationEntity)
    private readonly organizationModel: typeof OrganizationEntity,
    private readonly storageService: StorageService,
    private readonly auditService: AuditService,
  ) {}

  async upload(file: any, user: UserEntity, createFileDto: CreateFileDto) {
    const { folderUuid } = createFileDto;
    let folderId: number | null = null;

    try {
      if (folderUuid) {
        const folder = await this.folderModel.findOne({
          where: { uuid: folderUuid, user_id: user.id },
        });

        if (!folder) {
          throw new NotFoundException('Folder not found');
        }
        folderId = folder.id;
      }

      const timestamp = Date.now();
      const storagePath = `users/${user.uuid}/${folderUuid || 'root'}/${timestamp}-${
        file.originalname
      }`;

      // Check storage quota
      const orgId = (user as any).organizationId || user.organization_id;
      const organization = await this.organizationModel.findByPk(orgId);
      if (!organization) {
        throw new NotFoundException('Organization not found');
      }

      const fileSize = parseInt(file.size, 10);
      const currentUsage = parseInt(organization.storage_used as any, 10);
      const maxStorage = parseInt(organization.max_storage as any, 10);

      if (currentUsage + fileSize > maxStorage) {
        throw new ForbiddenException('Storage usage quota exceeded for this organization.');
      }

      await this.storageService.upload(file, storagePath);

      // Update storage usage
      await organization.increment('storage_used', { by: fileSize });

      const fileRecord = await this.fileModel.create({
        name: file.originalname,
        original_name: file.originalname,
        size: file.size,
        mime_type: file.mimetype,
        storage_path: storagePath,
        storage_provider: this.storageService.getDriver(),
        storage_bucket: this.storageService.getBucket(),
        user_id: user.id,
        folder_id: folderId,
      });

      await this.auditService.log(
        'FILE_UPLOAD',
        user,
        { name: file.originalname, folderUuid, storagePath },
        fileRecord.id,
        'file',
      );

      return fileRecord;
    } catch (e) {
      const err = e as Error;
      this.logger.error(`Upload error: ${err.message}`, err.stack);
      throw e;
    }
  }

  async findAll(user: UserEntity, folderUuid?: string, isTrashed = false) {
    let folderId: number | null = null;

    if (folderUuid) {
      const folder = await this.folderModel.findOne({
        where: { uuid: folderUuid, user_id: user.id },
      });
      if (!folder) {
        throw new NotFoundException('Folder not found');
      }
      folderId = folder.id;
    }

    return this.fileModel.findAll({
      where: {
        user_id: user.id,
        folder_id: folderId,
      },
      paranoid: !isTrashed,
      order: [['created_at', 'DESC']],
    });
  }

  async findOne(uuid: string, user: UserEntity) {
    const file = await this.fileModel.findOne({
      where: { uuid, user_id: user.id },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    return file;
  }

  async update(uuid: string, updateFileDto: UpdateFileDto, user: UserEntity) {
    const file = await this.findOne(uuid, user);
    const { name, folderUuid } = updateFileDto;

    if (name) {
      file.name = name;
    }

    if (folderUuid !== undefined) {
      if (folderUuid === null) {
        file.folder_id = null;
      } else {
        const folder = await this.folderModel.findOne({
          where: { uuid: folderUuid, user_id: user.id },
        });
        if (!folder) {
          throw new NotFoundException('Folder not found');
        }
        file.folder_id = folder.id;
      }
    }

    await file.save();

    await this.auditService.log(
      'FILE_UPDATE',
      user,
      updateFileDto as unknown as Record<string, unknown>,
      file.id,
      'file',
    );

    return file;
  }

  async trash(uuid: string, user: UserEntity) {
    const file = await this.findOne(uuid, user);
    await file.destroy();

    await this.auditService.log('FILE_TRASH', user, {}, file.id, 'file');

    return file;
  }

  async restore(uuid: string, user: UserEntity) {
    const file = await this.fileModel.findOne({
      where: { uuid, user_id: user.id },
      paranoid: false,
    });

    if (!file || !file.deleted_at) {
      throw new NotFoundException('Trashed file not found');
    }

    await file.restore();

    await this.auditService.log('FILE_RESTORE', user, {}, file.id, 'file');

    return file;
  }

  async deletePermanently(uuid: string, user: UserEntity) {
    const file = await this.fileModel.findOne({
      where: { uuid, user_id: user.id },
      paranoid: false,
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    const fileId = file.id;
    const storagePath = file.storage_path;

    await this.storageService.delete(storagePath);
    await file.destroy({ force: true });

    // Update storage usage
    const organization = await this.organizationModel.findByPk(user.organization_id);
    if (organization) {
      // Ensure we don't go below zero (though unlikely with proper logic)
      // Sequelize decrement is useful here
      await organization.decrement('storage_used', { by: file.size });
    }

    await this.auditService.log('FILE_DELETE_PERMANENT', user, { storagePath }, fileId, 'file');

    return { success: true };
  }

  async emptyTrash(user: UserEntity) {
    const trashedFiles = await this.fileModel.findAll({
      where: { user_id: user.id },
      paranoid: false,
    });

    const itemsToDelete = trashedFiles.filter((f) => f.deleted_at !== null);

    if (itemsToDelete.length === 0) {
      return { success: true, count: 0 };
    }

    let totalSize = 0;
    for (const file of itemsToDelete) {
      try {
        await this.storageService.delete(file.storage_path);
        totalSize += file.size;
        await file.destroy({ force: true });
      } catch (e: any) {
        this.logger.error(`Failed to delete file ${file.uuid} from storage: ${e.message}`);
        // Continue with others
      }
    }

    // Update storage usage
    const organization = await this.organizationModel.findByPk(user.organization_id);
    if (organization && totalSize > 0) {
      await organization.decrement('storage_used', { by: totalSize });
    }

    await this.auditService.log(
      'FILE_EMPTY_TRASH',
      user,
      { count: itemsToDelete.length },
      undefined,
      'file',
    );

    return { success: true, count: itemsToDelete.length };
  }

  async getDownloadStream(uuid: string, user: UserEntity) {
    const file = await this.findOne(uuid, user);
    return this.storageService.download(file.storage_path);
  }

  async getSignedUrl(uuid: string, user: UserEntity) {
    const file = await this.findOne(uuid, user);
    if (this.storageService.getDriver() === 'local') {
      return `/api/v1/files/${file.uuid}/content`;
    }
    return this.storageService.getSignedUrl(file.storage_path);
  }
}
