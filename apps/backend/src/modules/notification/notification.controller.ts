import { Controller, Get, Patch, Param, UseGuards, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'notifications', version: '1' })
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: 'Get all notifications for current user' })
  async findAll(@Req() req: any) {
    const notifications = await this.notificationService.findAll(req.user.id);
    return {
      success: true,
      data: notifications,
    };
  }

  @Patch(':uuid/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  async markAsRead(@Req() req: any, @Param('uuid') uuid: string) {
    const notification = await this.notificationService.markAsRead(req.user.id, uuid);
    return {
      success: true,
      data: notification,
    };
  }

  @Patch('mark-all-read')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@Req() req: any) {
    await this.notificationService.markAllAsRead(req.user.id);
    return {
      success: true,
      message: 'All notifications marked as read',
    };
  }
}
