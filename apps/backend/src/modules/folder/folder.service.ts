import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { FolderEntity, UserEntity } from '@src/entities';
import { Op } from 'sequelize';
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

  async findAll(
    user: UserEntity,
    parentUuid?: string,
    isTrashed = false,
    search?: string,
    sort: 'name' | 'date' = 'name',
    order: 'ASC' | 'DESC' = 'ASC',
    isStarred = false,
  ) {
    let parentId: number | null = null;
    const where: any = {
      user_id: user.id,
    };

    if (parentUuid && parentUuid !== 'root') {
      const parent = await this.folderModel.findOne({
        where: { uuid: parentUuid, user_id: user.id },
      });
      if (!parent) {
        throw new NotFoundException('Parent folder not found');
      }
      parentId = parent.id;
      where.parent_id = parentId;
    } else if (parentUuid === 'root') {
      where.parent_id = null;
    }

    if (!search && parentUuid === undefined) {
      where.parent_id = null;
    }

    if (search) {
      delete where.parent_id;
      where.name = { [Op.iLike]: `%${search}%` };
    }

    if (isStarred) {
      where.is_starred = true;
      if (!parentUuid) {
        delete where.parent_id;
      }
    }

    let orderClause: any = [['name', 'ASC']];
    if (sort) {
      const fieldMap = {
        name: 'name',
        date: 'created_at',
      };
      const field = fieldMap[sort] || 'name';
      orderClause = [[field, order]];
    }

    return this.folderModel.findAll({
      where,
      paranoid: !isTrashed,
      order: orderClause,
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

  async toggleStar(uuid: string, user: UserEntity) {
    const folder = await this.findOne(uuid, user);
    return folder.update({ is_starred: !folder.is_starred });
  }

  async getAncestry(uuid: string, user: UserEntity) {
    const folder = await this.findOne(uuid, user);

    // Recursive CTE to get ancestry
    // We go up from the found folder to the root
    const query = `
      WITH RECURSIVE folder_path AS (
        SELECT id, uuid, name, parent_id, 0 as level
        FROM folder
        WHERE id = :folderId
        UNION ALL
        SELECT f.id, f.uuid, f.name, f.parent_id, fp.level + 1
        FROM folder f
        INNER JOIN folder_path fp ON f.id = fp.parent_id
      )
      SELECT uuid, name FROM folder_path ORDER BY level DESC;
    `;

    const results = await this.folderModel.sequelize?.query(query, {
      replacements: { folderId: folder.id },
      type: 'SELECT',
    });

    // Add "My Drive" as root if needed, but usually frontend handles "My Drive" as static root?
    // Let's standardise: results will comprise the folders.
    // Frontend usually has "My Drive" -> ...folders
    return results || [];
  }
}
