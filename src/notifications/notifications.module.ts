import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { FcmToken, FcmTokenSchema } from './schemas/fcm-token.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: FcmToken.name, schema: FcmTokenSchema }]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
