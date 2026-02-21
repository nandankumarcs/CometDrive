import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { NotificationEntity } from '@src/entities';

@Injectable()
export class NotificationService {
  constructor(
    @InjectModel(NotificationEntity)
    private readonly notificationModel: typeof NotificationEntity,
  ) {}

  async findAll(userId: number): Promise<NotificationEntity[]> {
    return this.notificationModel.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']],
    });
  }

  async markAsRead(userId: number, uuid: string): Promise<NotificationEntity> {
    const notification = await this.notificationModel.findOne({
      where: { uuid, user_id: userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    notification.is_read = true;
    await notification.save();
    return notification;
  }

  async markAllAsRead(userId: number): Promise<void> {
    await this.notificationModel.update(
      { is_read: true },
      { where: { user_id: userId, is_read: false } },
    );
  }

  async create(data: Partial<NotificationEntity>): Promise<NotificationEntity> {
    return this.notificationModel.create(data as any);
  }

  async deleteAll(userId: number): Promise<void> {
    await this.notificationModel.destroy({
      where: { user_id: userId },
    });
  }
}
