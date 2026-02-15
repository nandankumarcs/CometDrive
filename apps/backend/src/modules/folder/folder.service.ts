import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { FolderEntity, UserEntity } from '@src/entities';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';
import { AuditService } from '@src/commons/services';

@Injectable()
export class FolderService {
  constructor(
    @InjectModel(FolderEntity)
    private readonly folderModel: typeof FolderEntity,
    private readonly auditService: AuditService,
  ) {}

  async create(createFolderDto: CreateFolderDto, user: UserEntity) {
    const { name, parentUuid } = createFolderDto;
    let parentId: number | null = null;

    if (parentUuid) {
      const parent = await this.folderModel.findOne({
        where: { uuid: parentUuid, user_id: user.id },
      });
      if (!parent) {
        throw new NotFoundException('Parent folder not found');
      }
      parentId = parent.id;
    }

    const folder = await this.folderModel.create({
      name,
      user_id: user.id,
      parent_id: parentId,
    });

    await this.auditService.log('FOLDER_CREATE', user, { name, parentUuid }, folder.id, 'folder');

    return folder;
  }

  async findAll(user: UserEntity, parentUuid?: string, isTrashed = false) {
    let parentId: number | null = null;

    if (parentUuid) {
      const parent = await this.folderModel.findOne({
        where: { uuid: parentUuid, user_id: user.id },
      });
      if (!parent) {
        throw new NotFoundException('Parent folder not found');
      }
      parentId = parent.id;
    }

    return this.folderModel.findAll({
      where: {
        user_id: user.id,
        parent_id: parentId,
      },
      paranoid: !isTrashed,
      order: [['name', 'ASC']],
    });
  }

  async findOne(uuid: string, user: UserEntity) {
    const folder = await this.folderModel.findOne({
      where: { uuid, user_id: user.id },
    });

    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    return folder;
  }

  async update(uuid: string, updateFolderDto: UpdateFolderDto, user: UserEntity) {
    const folder = await this.findOne(uuid, user);
    const { name, parentUuid } = updateFolderDto;

    if (name) {
      folder.name = name;
    }

    if (parentUuid !== undefined) {
      if (parentUuid === null) {
        folder.parent_id = null;
      } else {
        if (parentUuid === uuid) {
          throw new BadRequestException('Folder cannot be its own parent');
        }
        const parent = await this.folderModel.findOne({
          where: { uuid: parentUuid, user_id: user.id },
        });
        if (!parent) {
          throw new NotFoundException('Parent folder not found');
        }
        folder.parent_id = parent.id;
      }
    }

    await folder.save();

    await this.auditService.log(
      'FOLDER_UPDATE',
      user,
      updateFolderDto as unknown as Record<string, unknown>,
      folder.id,
      'folder',
    );

    return folder;
  }

  async trash(uuid: string, user: UserEntity) {
    const folder = await this.findOne(uuid, user);
    await folder.destroy(); // Soft delete due to paranoid: true

    await this.auditService.log('FOLDER_TRASH', user, {}, folder.id, 'folder');

    return folder;
  }

  async restore(uuid: string, user: UserEntity) {
    const folder = await this.folderModel.findOne({
      where: { uuid, user_id: user.id },
      paranoid: false,
    });

    if (!folder || !folder.deleted_at) {
      throw new NotFoundException('Trashed folder not found');
    }

    await folder.restore();

    await this.auditService.log('FOLDER_RESTORE', user, {}, folder.id, 'folder');

    return folder;
  }

  async deletePermanently(uuid: string, user: UserEntity) {
    const folder = await this.folderModel.findOne({
      where: { uuid, user_id: user.id },
      paranoid: false,
    });

    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    const folderId = folder.id;
    await folder.destroy({ force: true });

    await this.auditService.log('FOLDER_DELETE_PERMANENT', user, { uuid }, folderId, 'folder');

    return { success: true };
  }

  async emptyTrash(user: UserEntity) {
    const trashedFolders = await this.folderModel.findAll({
      where: { user_id: user.id },
      paranoid: false,
    });

    const itemsToDelete = trashedFolders.filter((f) => f.deleted_at !== null);

    if (itemsToDelete.length === 0) {
      return { success: true, count: 0 };
    }

    for (const folder of itemsToDelete) {
      await folder.destroy({ force: true });
    }

    await this.auditService.log(
      'FOLDER_EMPTY_TRASH',
      user,
      { count: itemsToDelete.length },
      undefined,
      'folder',
    );

    return { success: true, count: itemsToDelete.length };
  }
}
