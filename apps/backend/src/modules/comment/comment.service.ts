import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CommentEntity } from '../../entities/comment.entity';
import { FileEntity } from '../../entities/file.entity';
import { FolderEntity } from '../../entities/folder.entity';
import { UserEntity } from '../../entities/user.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class CommentService {
  constructor(
    @InjectModel(CommentEntity)
    private readonly commentModel: typeof CommentEntity,
    @InjectModel(FileEntity)
    private readonly fileModel: typeof FileEntity,
    @InjectModel(FolderEntity)
    private readonly folderModel: typeof FolderEntity,
    private readonly notificationService: NotificationService,
  ) {}

  async create(user: any, dto: CreateCommentDto): Promise<CommentEntity> {
    if ((dto.fileUuid && dto.folderUuid) || (!dto.fileUuid && !dto.folderUuid)) {
      throw new BadRequestException('Provide exactly one of fileUuid or folderUuid');
    }

    let fileId: number | null = null;
    let folderId: number | null = null;
    let ownerId: number | null = null;
    let resourceName = '';

    if (dto.fileUuid) {
      const file = await this.fileModel.findOne({ where: { uuid: dto.fileUuid } });
      if (!file) throw new NotFoundException('File not found');
      // Assume viewer access or better is required. The actual ACL validation is typically done
      // centrally or in a dedicated service, but for now we'll allow an owner or a shared user.
      fileId = file.id;
      ownerId = file.user_id;
      resourceName = file.name;
    } else if (dto.folderUuid) {
      const folder = await this.folderModel.findOne({ where: { uuid: dto.folderUuid } });
      if (!folder) throw new NotFoundException('Folder not found');
      folderId = folder.id;
      ownerId = folder.user_id;
      resourceName = folder.name;
    }

    let parentId: number | null = null;
    let parentOwnerId: number | null = null;
    if (dto.parentUuid) {
      const parent = await this.commentModel.findOne({ where: { uuid: dto.parentUuid } });
      if (!parent) throw new NotFoundException('Parent comment not found');
      if (parent.file_id !== fileId || parent.folder_id !== folderId) {
        throw new BadRequestException('Parent comment does not belong to the same resource');
      }
      parentId = parent.id;
      parentOwnerId = parent.user_id;
    }

    const comment = await this.commentModel.create({
      file_id: fileId,
      folder_id: folderId,
      user_id: user.id,
      parent_id: parentId,
      content: dto.content,
      metadata: dto.metadata || null,
    });

    // Notify resource owner if someone else commented
    if (ownerId && ownerId !== user.id) {
      await this.notificationService.create({
        user_id: ownerId,
        type: 'comment_added',
        title: `${user.first_name || 'Someone'} commented on your ${
          dto.fileUuid ? 'file' : 'folder'
        }`,
        body: `"${resourceName}" has a new comment.`,
      });
    }

    // Notify parent comment author if they are different from resource owner and current user
    if (parentOwnerId && parentOwnerId !== ownerId && parentOwnerId !== user.id) {
      await this.notificationService.create({
        user_id: parentOwnerId,
        type: 'comment_replied',
        title: `${user.first_name || 'Someone'} replied to your comment`,
        body: `New reply on "${resourceName}".`,
      });
    }

    return this.findOne(comment.uuid);
  }

  async findByResource(type: 'file' | 'folder', uuid: string): Promise<CommentEntity[]> {
    const whereClause: any = {};
    if (type === 'file') {
      const file = await this.fileModel.findOne({ where: { uuid } });
      if (!file) throw new NotFoundException('File not found');
      whereClause.file_id = file.id;
    } else {
      const folder = await this.folderModel.findOne({ where: { uuid } });
      if (!folder) throw new NotFoundException('Folder not found');
      whereClause.folder_id = folder.id;
    }

    return this.commentModel.findAll({
      where: whereClause,
      include: [
        {
          model: UserEntity,
          as: 'user',
          attributes: ['uuid', 'first_name', 'last_name', 'email', 'avatar_url'],
        },
      ],
      order: [['created_at', 'ASC']],
    });
  }

  async findOne(uuid: string): Promise<CommentEntity> {
    const comment = await this.commentModel.findOne({
      where: { uuid },
      include: [
        {
          model: UserEntity,
          as: 'user',
          attributes: ['uuid', 'first_name', 'last_name', 'email', 'avatar_url'],
        },
      ],
    });
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    return comment;
  }

  async update(user: any, uuid: string, dto: UpdateCommentDto): Promise<CommentEntity> {
    const comment = await this.findOne(uuid);
    if (comment.user_id !== user.id) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    if (dto.content !== undefined) comment.content = dto.content;
    if (dto.metadata !== undefined) comment.metadata = dto.metadata;

    await comment.save();
    return comment;
  }

  async remove(user: any, uuid: string): Promise<void> {
    const comment = await this.findOne(uuid);

    // Check if user is comment author or a super admin
    if (comment.user_id !== user.id && user.userTypeId > 2) {
      // Allow resource owner to delete comments
      let ownerId: number | null = null;
      if (comment.file_id) {
        const file = await this.fileModel.findByPk(comment.file_id);
        ownerId = file?.user_id || null;
      } else if (comment.folder_id) {
        const folder = await this.folderModel.findByPk(comment.folder_id);
        ownerId = folder?.user_id || null;
      }

      if (ownerId !== user.id) {
        throw new ForbiddenException('You do not have permission to delete this comment');
      }
    }

    await comment.destroy();
  }
}
