import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { FileEntity, FolderEntity, Share, SharePermission, UserEntity } from '@src/entities';
import { Op, col, fn, literal, where as sequelizeWhere } from 'sequelize';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';
import { AuditService } from '@src/commons/services';
import { StorageService } from '@src/modules/storage/storage.service';

const SEARCH_SIMILARITY_THRESHOLD = 0.22;

@Injectable()
export class FolderService {
  constructor(
    @InjectModel(FolderEntity)
    private readonly folderModel: typeof FolderEntity,
    @InjectModel(FileEntity)
    private readonly fileModel: typeof FileEntity,
    @InjectModel(Share)
    private readonly shareModel: typeof Share,
    @InjectModel(UserEntity)
    private readonly userModel: typeof UserEntity,
    private readonly auditService: AuditService,
    private readonly storageService: StorageService,
  ) {}

  async create(createFolderDto: CreateFolderDto, user: UserEntity) {
    const { name, parentUuid } = createFolderDto;
    let parentId: number | null = null;
    let ownerId = user.id;

    if (parentUuid) {
      const parent = await this.findEditableFolder(parentUuid, user);
      parentId = parent.id;
      ownerId = parent.user_id;
    }

    const folder = await this.folderModel.create({
      name,
      user_id: ownerId,
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
    const where: any = {};
    const normalizedSearch = search?.trim();
    const hasSearch = Boolean(normalizedSearch);
    let relevanceOrderExpression: ReturnType<typeof literal> | null = null;

    if (parentUuid && parentUuid !== 'root') {
      const parent = await this.findAccessibleFolder(parentUuid, user);
      where.user_id = parent.user_id;
      where.parent_id = parent.id;
    } else if (parentUuid === 'root') {
      where.user_id = user.id;
      where.parent_id = null;
    } else {
      where.user_id = user.id;
    }

    if (!hasSearch && parentUuid === undefined) {
      where.parent_id = null;
    }

    if (isTrashed) {
      where.deleted_at = { [Op.not]: null };
    }

    if (hasSearch) {
      if (!parentUuid) {
        delete where.parent_id;
      }

      const dialect = this.folderModel.sequelize?.getDialect();
      if (normalizedSearch && normalizedSearch.length < 3) {
        where.name = { [Op.iLike]: `%${normalizedSearch}%` };
      } else if (dialect === 'postgres') {
        const tsvector = fn('to_tsvector', 'simple', fn('coalesce', col('name'), ''));
        const tsquery = fn('websearch_to_tsquery', 'simple', normalizedSearch);
        const similarityScore = fn(
          'similarity',
          fn('lower', col('name')),
          fn('lower', normalizedSearch),
        );

        where[Op.and] = [
          ...((where[Op.and] as any[]) ?? []),
          {
            [Op.or]: [
              sequelizeWhere(tsvector, '@@', tsquery),
              sequelizeWhere(similarityScore, { [Op.gte]: SEARCH_SIMILARITY_THRESHOLD }),
            ],
          },
        ];

        const escapedSearchTerm =
          FolderEntity.sequelize?.escape(normalizedSearch!) ??
          `'${normalizedSearch!.replace(/'/g, "''")}'`;
        relevanceOrderExpression = literal(
          `(ts_rank_cd(to_tsvector('simple', coalesce(name, '')), websearch_to_tsquery('simple', ${escapedSearchTerm})) + similarity(lower(name), lower(${escapedSearchTerm})))`,
        );
      } else {
        where.name = { [Op.iLike]: `%${normalizedSearch}%` };
      }
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
    if (relevanceOrderExpression) {
      orderClause = [[relevanceOrderExpression, 'DESC'], ...orderClause];
    }

    return this.folderModel.findAll({
      where,
      paranoid: !isTrashed,
      order: orderClause,
    });
  }

  async findOne(uuid: string, user: UserEntity) {
    return this.findAccessibleFolder(uuid, user);
  }

  async update(uuid: string, updateFolderDto: UpdateFolderDto, user: UserEntity) {
    const folder = await this.findEditableFolder(uuid, user);
    const { name, parentUuid } = updateFolderDto;

    if (name) {
      folder.name = name;
    }

    if (parentUuid !== undefined) {
      if (parentUuid === null) {
        if (folder.user_id !== user.id) {
          throw new NotFoundException('Parent folder not found');
        }
        folder.parent_id = null;
      } else {
        if (parentUuid === uuid) {
          throw new BadRequestException('Folder cannot be its own parent');
        }
        const parent = await this.findEditableFolder(parentUuid, user);
        folder.parent_id = parent.id;
        folder.user_id = parent.user_id;
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
    const folder = await this.findEditableFolder(uuid, user);
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
    const totalSize = await this.deleteFolderTreeFiles(folder);
    await folder.destroy({ force: true });

    if (totalSize > 0) {
      const folderOwner = await this.userModel.findByPk(folder.user_id);
      if (folderOwner) {
        await this.decrementStorageUsage(folderOwner, totalSize);
      }
    }

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

    const trashedFolderIds = new Set(itemsToDelete.map((folder) => folder.id));
    const rootFolders = itemsToDelete.filter(
      (folder) => folder.parent_id === null || !trashedFolderIds.has(folder.parent_id),
    );

    let totalSize = 0;
    for (const folder of rootFolders) {
      totalSize += await this.deleteFolderTreeFiles(folder);
      await folder.destroy({ force: true });
    }

    if (totalSize > 0) {
      const folderOwner = await this.userModel.findByPk(user.id);
      if (folderOwner) {
        await this.decrementStorageUsage(folderOwner, totalSize);
      }
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
    const folder = await this.findOwnedFolder(uuid, user);
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

  private async findOwnedFolder(uuid: string, user: UserEntity) {
    const folder = await this.folderModel.findOne({
      where: { uuid, user_id: user.id },
    });

    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    return folder;
  }

  private async deleteFolderTreeFiles(folder: FolderEntity): Promise<number> {
    const folderIds = await this.getFolderTreeIds(folder.id);
    const files = await this.fileModel.findAll({
      where: {
        user_id: folder.user_id,
        folder_id: { [Op.in]: folderIds },
      },
      paranoid: false,
    });

    let totalSize = 0;
    for (const file of files) {
      await this.storageService.delete(file.storage_path);
      totalSize += file.size;
    }

    return totalSize;
  }

  private async getFolderTreeIds(folderId: number): Promise<number[]> {
    const query = `
      WITH RECURSIVE folder_tree AS (
        SELECT id, parent_id
        FROM folder
        WHERE id = :folderId
        UNION ALL
        SELECT f.id, f.parent_id
        FROM folder f
        INNER JOIN folder_tree ft ON f.parent_id = ft.id
      )
      SELECT id FROM folder_tree;
    `;

    const results = await this.folderModel.sequelize?.query<{ id: number }>(query, {
      replacements: { folderId },
      type: 'SELECT',
    });

    return (results || []).map((row) => row.id);
  }

  private async decrementStorageUsage(user: UserEntity, by: number) {
    const currentUsage = parseInt(user.storage_used as any, 10) || 0;
    const nextUsage = Math.max(currentUsage - by, 0);
    await user.update({ storage_used: nextUsage });
  }

  private async findAccessibleFolder(uuid: string, user: UserEntity) {
    const folder = await this.folderModel.findOne({
      where: { uuid },
    });

    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    if (folder.user_id !== user.id) {
      const hasAccess = await this.hasSharedFolderAccess(folder.id, user.id);
      if (!hasAccess) {
        throw new NotFoundException('Folder not found');
      }
    }

    return folder;
  }

  private async findEditableFolder(uuid: string, user: UserEntity) {
    const folder = await this.folderModel.findOne({
      where: { uuid },
    });

    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    if (folder.user_id !== user.id) {
      const hasAccess = await this.hasSharedFolderAccess(
        folder.id,
        user.id,
        SharePermission.EDITOR,
      );
      if (!hasAccess) {
        throw new NotFoundException('Folder not found');
      }
    }

    return folder;
  }

  private async hasSharedFolderAccess(
    folderId: number,
    recipientId: number,
    requiredPermission: SharePermission = SharePermission.VIEWER,
  ) {
    let currentFolderId: number | null = folderId;

    while (currentFolderId) {
      const activeShare = await this.shareModel.findOne({
        where: {
          folder_id: currentFolderId,
          recipient_id: recipientId,
          is_active: true,
          ...(requiredPermission === SharePermission.EDITOR
            ? { permission: SharePermission.EDITOR }
            : {}),
          [Op.or]: [{ expires_at: null }, { expires_at: { [Op.gt]: new Date() } }],
        },
      });

      if (activeShare) {
        return true;
      }

      const currentFolder: FolderEntity | null = await this.folderModel.findByPk(currentFolderId, {
        attributes: ['id', 'parent_id'],
      });

      currentFolderId = currentFolder?.parent_id ?? null;
    }

    return false;
  }
}
