import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NotificationService } from './modules/notification/notification.service';
import { UserService } from './modules/user/user.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const notificationService = app.get(NotificationService);
  const userService = app.get(UserService);

  const user = await userService.findByEmail('test@crownstack.com');
  if (!user) {
    console.error('User not found');
    process.exit(1);
  }

  // Delete existing notifications for this user to ensure we have a fresh unread one
  await notificationService.deleteAll(user.id);

  console.log('Seeding unread notification...');
  await notificationService.create({
    user_id: user.id,
    type: 'file_shared',
    title: 'Welcome to Notifications!',
    body: 'You can now receive updates about your files and collaborations.',
    is_read: false,
  });
  console.log('Unread test notification created successfully');

  await app.close();
  process.exit(0);
}

bootstrap();
