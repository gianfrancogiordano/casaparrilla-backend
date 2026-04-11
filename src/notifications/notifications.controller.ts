import { Controller, Post, Body, Delete } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Endpoint para suscribir el FCM token del admin al topic 'admin-deliveries'
   * Lo llama el frontend al hacer login
   */
  @Post('subscribe')
  async subscribe(@Body('token') token: string) {
    await this.notificationsService.subscribeToTopic(token, 'admin-deliveries');
    return { ok: true, topic: 'admin-deliveries' };
  }

  /**
   * Desuscribir al cerrar sesión
   */
  @Delete('unsubscribe')
  async unsubscribe(@Body('token') token: string) {
    await this.notificationsService.unsubscribeFromTopic(token, 'admin-deliveries');
    return { ok: true };
  }
}
