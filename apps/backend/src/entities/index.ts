export * from './base.entity';
export * from './organization.entity';
export * from './user-type.entity';
export * from './user.entity';
export * from './share.entity';
export * from './session.entity';
export * from './password-reset.entity';
export * from './audit-log.entity';
export * from './folder.entity';
export * from './file.entity';
export * from './invitation.entity';
export * from './file-playback-progress.entity';
export * from './file-video-comment.entity';
export * from './notification.entity';
export * from './comment.entity';

import { OrganizationEntity } from './organization.entity';
import { UserTypeEntity } from './user-type.entity';
import { UserEntity } from './user.entity';
import { SessionEntity } from './session.entity';
import { PasswordResetEntity } from './password-reset.entity';
import { AuditLogEntity } from './audit-log.entity';
import { InvitationEntity } from './invitation.entity';
import { FolderEntity } from './folder.entity';
import { FileEntity } from './file.entity';
import { Share } from './share.entity';
import { FilePlaybackProgressEntity } from './file-playback-progress.entity';
import { FileVideoCommentEntity } from './file-video-comment.entity';
import { NotificationEntity } from './notification.entity';
import { CommentEntity } from './comment.entity';

export const entities = [
  UserTypeEntity,
  OrganizationEntity,
  UserEntity,
  SessionEntity,
  PasswordResetEntity,
  AuditLogEntity,
  InvitationEntity,
  FolderEntity,
  FileEntity,
  Share,
  FilePlaybackProgressEntity,
  FileVideoCommentEntity,
  NotificationEntity,
  CommentEntity,
];
