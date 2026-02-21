import {
  FileEntity,
  FilePlaybackProgressEntity,
  FileVideoCommentEntity,
  FolderEntity,
  UserEntity,
  OrganizationEntity,
  Share,
  SharePermission,
} from '@src/entities';
import { Op, col, fn, literal, where as sequelizeWhere } from 'sequelize';
import archiver from 'archiver';
import { CreateFileDto } from './dto/create-file.dto';
import { UpdateFileDto } from './dto/update-file.dto';
import { UpdatePlaybackProgressDto } from './dto/update-playback-progress.dto';
import { CreateVideoCommentDto } from './dto/create-video-comment.dto';
import { StorageService } from '@src/modules/storage/storage.service';
import { AuditService } from '@src/commons/services';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';

const PLAYBACK_COMPLETION_THRESHOLD = 95;
const SEARCH_SIMILARITY_THRESHOLD = 0.22;

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);

  constructor(
    @InjectModel(FileEntity)
    private readonly fileModel: typeof FileEntity,
    @InjectModel(FolderEntity)
    private readonly folderModel: typeof FolderEntity,
    @InjectModel(FilePlaybackProgressEntity)
    private readonly playbackProgressModel: typeof FilePlaybackProgressEntity,
    @InjectModel(FileVideoCommentEntity)
    private readonly videoCommentModel: typeof FileVideoCommentEntity,
    @InjectModel(Share)
    private readonly shareModel: typeof Share,
    @InjectModel(OrganizationEntity)
    private readonly organizationModel: typeof OrganizationEntity,
    private readonly storageService: StorageService,
    private readonly auditService: AuditService,
  ) {}

  async upload(file: any, user: UserEntity, createFileDto: CreateFileDto) {
    const { folderUuid } = createFileDto;
    let folderId: number | null = null;
    let fileOwnerId = user.id;

    try {
      if (folderUuid) {
        const folder = await this.folderModel.findOne({
          where: { uuid: folderUuid },
        });

        if (!folder) {
          throw new NotFoundException('Folder not found');
        }

        if (folder.user_id !== user.id) {
          const hasEditAccess = await this.hasSharedFolderAccess(
            folder.id,
            user.id,
            SharePermission.EDITOR,
          );
          if (!hasEditAccess) {
            throw new NotFoundException('Folder not found');
          }
        }

        folderId = folder.id;
        fileOwnerId = folder.user_id;
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
        user_id: fileOwnerId,
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

  async findAll(
    user: UserEntity,
    folderUuid?: string,
    isTrashed = false,
    search?: string,
    type?: string,
    sort: 'name' | 'size' | 'date' = 'date',
    order: 'ASC' | 'DESC' = 'DESC',
    isStarred = false,
  ) {
    const where: any = {};
    const normalizedSearch = search?.trim();
    const hasSearch = Boolean(normalizedSearch);
    let relevanceOrderExpression: ReturnType<typeof literal> | null = null;

    if (folderUuid && folderUuid !== 'root') {
      const folder = await this.folderModel.findOne({
        where: { uuid: folderUuid },
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

      where.user_id = folder.user_id;
      where.folder_id = folder.id;
    } else if (folderUuid === 'root') {
      where.user_id = user.id;
      where.folder_id = null;
    } else {
      where.user_id = user.id;
    }

    if (!hasSearch && folderUuid === undefined) {
      where.folder_id = null;
    }

    if (hasSearch) {
      if (!folderUuid) {
        delete where.folder_id;
      }

      const dialect = this.fileModel.sequelize?.getDialect();
      if (dialect === 'postgres') {
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
          FileEntity.sequelize?.escape(normalizedSearch!) ??
          `'${normalizedSearch!.replace(/'/g, "''")}'`;
        relevanceOrderExpression = literal(
          `(ts_rank_cd(to_tsvector('simple', coalesce(name, '')), websearch_to_tsquery('simple', ${escapedSearchTerm})) + similarity(lower(name), lower(${escapedSearchTerm})))`,
        );
      } else {
        where.name = { [Op.iLike]: `%${normalizedSearch}%` };
      }
    }

    if (type) {
      if (type.includes('/')) {
        where.mime_type = type;
      } else {
        where.mime_type = { [Op.iLike]: `${type}%` };
      }
    }

    if (isStarred) {
      where.is_starred = true;
      // If viewing starred items, we usually ignore folder hierarchy unless specified?
      // For now, let's say "Starred" view shows all starred items flat.
      if (!folderUuid) {
        delete where.folder_id;
      }
    }

    let orderClause: any = [['created_at', 'DESC']];
    if (sort) {
      const fieldMap = {
        name: 'name',
        size: 'size',
        date: 'created_at',
      };
      const field = fieldMap[sort] || 'created_at';
      orderClause = [[field, order]];
    }
    if (relevanceOrderExpression) {
      orderClause = [[relevanceOrderExpression, 'DESC'], ...orderClause];
    }

    return this.fileModel.findAll({
      where,
      paranoid: !isTrashed,
      order: orderClause,
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

  async findAccessible(uuid: string, user: UserEntity, requireVideo = false) {
    const file = await this.fileModel.findOne({
      where: { uuid },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    if (file.user_id !== user.id) {
      const hasDirectShare = await this.hasDirectFileShare(
        file.id,
        user.id,
        SharePermission.VIEWER,
      );

      if (!hasDirectShare) {
        const hasFolderAccess =
          file.folder_id !== null
            ? await this.hasSharedFolderAccess(file.folder_id, user.id)
            : false;

        if (!hasFolderAccess) {
          throw new NotFoundException('File not found');
        }
      }
    }

    if (requireVideo && !file.mime_type?.toLowerCase().startsWith('video/')) {
      throw new BadRequestException('Playback progress is supported for video files only');
    }

    return file;
  }

  async update(uuid: string, updateFileDto: UpdateFileDto, user: UserEntity) {
    const file = await this.findEditable(uuid, user);
    const { name, folderUuid } = updateFileDto;

    if (name) {
      file.name = name;
    }

    if (folderUuid !== undefined) {
      if (folderUuid === null) {
        if (file.user_id !== user.id) {
          throw new NotFoundException('Folder not found');
        }
        file.folder_id = null;
      } else {
        const folder = await this.folderModel.findOne({
          where: { uuid: folderUuid },
        });
        if (!folder) {
          throw new NotFoundException('Folder not found');
        }
        if (folder.user_id !== user.id) {
          const hasEditAccess = await this.hasSharedFolderAccess(
            folder.id,
            user.id,
            SharePermission.EDITOR,
          );
          if (!hasEditAccess) {
            throw new NotFoundException('Folder not found');
          }
        }

        file.user_id = folder.user_id;
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
    const file = await this.findEditable(uuid, user);
    await file.destroy();

    const folder = file.folder_id ? await this.folderModel.findByPk(file.folder_id) : null;

    await this.auditService.log(
      'FILE_TRASH',
      user,
      {
        folderUuid: folder?.uuid || 'root',
        name: file.name,
      },
      file.id,
      'file',
    );

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

    const folder = file.folder_id ? await this.folderModel.findByPk(file.folder_id) : null;

    await this.auditService.log(
      'FILE_RESTORE',
      user,
      {
        folderUuid: folder?.uuid || 'root',
        name: file.name,
      },
      file.id,
      'file',
    );

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

    const folder = file.folder_id ? await this.folderModel.findByPk(file.folder_id) : null;

    await this.auditService.log(
      'FILE_DELETE_PERMANENT',
      user,
      {
        storagePath,
        folderUuid: folder?.uuid || 'root',
        name: file.name,
      },
      fileId,
      'file',
    );

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
    const file = await this.findAccessible(uuid, user);
    return this.storageService.download(file.storage_path);
  }

  async toggleStar(uuid: string, user: UserEntity) {
    const file = await this.findOne(uuid, user);
    return file.update({ is_starred: !file.is_starred });
  }

  async getSignedUrl(uuid: string, user: UserEntity) {
    const file = await this.findAccessible(uuid, user);
    if (this.storageService.getDriver() === 'local') {
      return `/api/v1/files/${file.uuid}/content`;
    }
    return this.storageService.getSignedUrl(file.storage_path);
  }

  async upsertPlaybackProgress(uuid: string, user: UserEntity, dto: UpdatePlaybackProgressDto) {
    const file = await this.findAccessible(uuid, user, true);
    const positionSeconds = Math.max(0, Math.floor(dto.positionSeconds));
    const durationSeconds = Math.max(1, Math.floor(dto.durationSeconds));
    const progressPercent = this.computeProgressPercent(positionSeconds, durationSeconds);
    const now = new Date();

    const existing = await this.playbackProgressModel.findOne({
      where: { user_id: user.id, file_id: file.id },
    });

    if (progressPercent >= PLAYBACK_COMPLETION_THRESHOLD) {
      if (existing) {
        await existing.destroy();
      }
      return {
        fileUuid: file.uuid,
        positionSeconds,
        durationSeconds,
        progressPercent,
        lastWatchedAt: now,
      };
    }

    if (existing) {
      await existing.update({
        position_seconds: positionSeconds,
        duration_seconds: durationSeconds,
        progress_percent: progressPercent,
        last_watched_at: now,
      });
      return this.mapProgress(file.uuid, existing);
    }

    const created = await this.playbackProgressModel.create({
      user_id: user.id,
      file_id: file.id,
      position_seconds: positionSeconds,
      duration_seconds: durationSeconds,
      progress_percent: progressPercent,
      last_watched_at: now,
    });

    return this.mapProgress(file.uuid, created);
  }

  async getPlaybackProgress(uuid: string, user: UserEntity) {
    const file = await this.findAccessible(uuid, user, true);
    const progress = await this.playbackProgressModel.findOne({
      where: { user_id: user.id, file_id: file.id },
    });

    if (!progress) {
      return null;
    }

    return this.mapProgress(file.uuid, progress);
  }

  async getContinueWatching(user: UserEntity) {
    const progress = await this.playbackProgressModel.findOne({
      where: { user_id: user.id },
      include: [
        {
          model: FileEntity,
          as: 'file',
          required: true,
          where: {
            user_id: user.id,
            mime_type: { [Op.iLike]: 'video/%' },
          },
          attributes: ['uuid', 'name', 'mime_type', 'size', 'updated_at'],
        },
      ],
      order: [['last_watched_at', 'DESC']],
    });

    if (!progress || !progress.file) {
      return null;
    }

    return {
      file: {
        uuid: progress.file.uuid,
        name: progress.file.name,
        mime_type: progress.file.mime_type,
        size: progress.file.size,
        updated_at: (progress.file as any).updated_at ?? progress.file.updatedAt,
      },
      positionSeconds: progress.position_seconds,
      durationSeconds: progress.duration_seconds,
      progressPercent: parseFloat(progress.progress_percent as unknown as string),
      lastWatchedAt: progress.last_watched_at,
    };
  }

  async dismissPlaybackProgress(uuid: string, user: UserEntity) {
    const file = await this.findAccessible(uuid, user, true);
    const progress = await this.playbackProgressModel.findOne({
      where: { user_id: user.id, file_id: file.id },
    });

    if (progress) {
      await progress.destroy();
    }

    return { success: true };
  }

  async listVideoComments(uuid: string, user: UserEntity) {
    const file = await this.findAccessible(uuid, user, true);
    const comments = await this.videoCommentModel.findAll({
      where: { file_id: file.id },
      include: [
        {
          model: UserEntity,
          as: 'author',
          attributes: ['uuid', 'first_name', 'last_name'],
          required: true,
        },
      ],
      order: [['created_at', 'DESC']],
      limit: 200,
    });

    return comments.reverse().map((comment) => this.mapVideoComment(file.uuid, comment, user.id));
  }

  async createVideoComment(uuid: string, user: UserEntity, dto: CreateVideoCommentDto) {
    const file = await this.findAccessible(uuid, user, true);
    const content = typeof dto.content === 'string' ? dto.content.trim() : '';
    if (!content) {
      throw new BadRequestException('Comment content is required');
    }

    const created = await this.videoCommentModel.create({
      file_id: file.id,
      user_id: user.id,
      content,
      timestamp_seconds: Math.max(0, Math.floor(dto.timestampSeconds)),
    });

    return this.mapVideoComment(file.uuid, created, user.id, user);
  }

  async deleteVideoComment(uuid: string, commentUuid: string, user: UserEntity) {
    const file = await this.findAccessible(uuid, user, true);
    const comment = await this.videoCommentModel.findOne({
      where: {
        uuid: commentUuid,
        file_id: file.id,
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.user_id !== user.id) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await comment.destroy();
    return { success: true };
  }

  async downloadZip(uuids: string[], user: UserEntity) {
    const files = await this.fileModel.findAll({
      where: {
        uuid: { [Op.in]: uuids },
        user_id: user.id,
      },
    });

    if (!files.length) {
      throw new NotFoundException('No files found');
    }

    const archive = archiver('zip', {
      zlib: { level: 9 }, // Sets the compression level.
    });

    // Handle errors explicitly
    archive.on('error', (err) => {
      throw err;
    });

    // Use a for...of loop to handle async operations sequentially
    // Parallel might be faster but ensuring order/stability first
    for (const file of files) {
      try {
        const stream = await this.storageService.download(file.storage_path);
        archive.append(stream, { name: file.name });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Failed to add file ${file.name} to zip: ${message}`);
        // Optionally append a text file with error, or just skip
      }
    }

    archive.finalize();
    return archive;
  }

  private async findEditable(uuid: string, user: UserEntity) {
    const file = await this.fileModel.findOne({
      where: { uuid },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    if (file.user_id !== user.id) {
      const hasDirectShare = await this.hasDirectFileShare(
        file.id,
        user.id,
        SharePermission.EDITOR,
      );
      const hasFolderAccess =
        file.folder_id !== null
          ? await this.hasSharedFolderAccess(file.folder_id, user.id, SharePermission.EDITOR)
          : false;

      if (!hasDirectShare && !hasFolderAccess) {
        throw new NotFoundException('File not found');
      }
    }

    return file;
  }

  private async hasDirectFileShare(
    fileId: number,
    recipientId: number,
    requiredPermission: SharePermission,
  ) {
    const share = await this.shareModel.findOne({
      where: {
        file_id: fileId,
        recipient_id: recipientId,
        is_active: true,
        ...(requiredPermission === SharePermission.EDITOR
          ? { permission: SharePermission.EDITOR }
          : {}),
        [Op.or]: [{ expires_at: null }, { expires_at: { [Op.gt]: new Date() } }],
      },
    });

    return !!share;
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

  private computeProgressPercent(positionSeconds: number, durationSeconds: number) {
    if (durationSeconds <= 0) {
      return 0;
    }
    return Math.min(100, parseFloat(((positionSeconds / durationSeconds) * 100).toFixed(2)));
  }

  private mapProgress(fileUuid: string, progress: FilePlaybackProgressEntity) {
    return {
      fileUuid,
      positionSeconds: progress.position_seconds,
      durationSeconds: progress.duration_seconds,
      progressPercent: parseFloat(progress.progress_percent as unknown as string),
      lastWatchedAt: progress.last_watched_at,
    };
  }

  private mapVideoComment(
    fileUuid: string,
    comment: FileVideoCommentEntity,
    currentUserId: number,
    fallbackAuthor?: UserEntity,
  ) {
    const author = comment.author ?? fallbackAuthor;
    return {
      uuid: comment.uuid,
      fileUuid,
      content: comment.content,
      timestampSeconds: comment.timestamp_seconds,
      createdAt: (comment as any).created_at ?? comment.createdAt,
      author: {
        uuid: author?.uuid ?? '',
        firstName: author?.first_name ?? 'Unknown',
        lastName: author?.last_name ?? 'User',
      },
      canDelete: comment.user_id === currentUserId,
    };
  }
}
