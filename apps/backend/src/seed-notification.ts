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
    await app.close();
    return;
  }

  await notificationService.create({
    user_id: user.id,
    type: 'file_shared',
    title: 'Welcome to Notifications!',
    body: 'You can now receive updates about your files and collaborations.',
    is_read: false,
  });

  console.log('Test notification created successfully');
  await app.close();
}

bootstrap();
