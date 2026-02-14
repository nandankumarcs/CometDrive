import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { FileEntity, FolderEntity, UserEntity } from '@src/entities';
import { CreateFileDto } from './dto/create-file.dto';
import { UpdateFileDto } from './dto/update-file.dto';
import { StorageService } from '@src/modules/storage/storage.service';
import { AuditService } from '@src/commons/services';

@Injectable()
export class FileService {
  constructor(
    @InjectModel(FileEntity)
    private readonly fileModel: typeof FileEntity,
    @InjectModel(FolderEntity)
    private readonly folderModel: typeof FolderEntity,
    private readonly storageService: StorageService,
    private readonly auditService: AuditService,
  ) {}

  async upload(file: any, user: UserEntity, createFileDto: CreateFileDto) {
    const { folderUuid } = createFileDto;
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

    const timestamp = Date.now();
    const storageKey = `users/${user.uuid}/${folderUuid || 'root'}/${timestamp}-${
      file.originalname
    }`;

    await this.storageService.upload(file, storageKey);

    const fileRecord = await this.fileModel.create({
      name: file.originalname,
      size: file.size,
      mime_type: file.mimetype,
      storage_key: storageKey,
      user_id: user.id,
      folder_id: folderId,
    });

    await this.auditService.log(
      'FILE_UPLOAD',
      user,
      { name: file.originalname, folderUuid, storageKey },
      fileRecord.id,
      'file',
    );

    return fileRecord;
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
    const storageKey = file.storage_key;

    await this.storageService.delete(storageKey);
    await file.destroy({ force: true });

    await this.auditService.log('FILE_DELETE_PERMANENT', user, { storageKey }, fileId, 'file');

    return { success: true };
  }

  async getDownloadStream(uuid: string, user: UserEntity) {
    const file = await this.findOne(uuid, user);
    return this.storageService.download(file.storage_key);
  }

  async getSignedUrl(uuid: string, user: UserEntity) {
    const file = await this.findOne(uuid, user);
    return this.storageService.getSignedUrl(file.storage_key);
  }
}
