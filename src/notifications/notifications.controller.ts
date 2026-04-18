import { Controller, Post, Body, Delete, Get } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Registra un token FCM vinculado al usuario que hace login.
   * El frontend envía: { token, userId, userName, role }
   */
  @Post('subscribe')
  async subscribe(
    @Body() body: { token: string; userId: string; userName: string; role: string },
  ) {
    await this.notificationsService.registerToken(
      body.token,
      body.userId,
      body.userName,
      body.role,
    );
    return { ok: true };
  }

  /**
   * Elimina el token al cerrar sesión.
   */
  @Delete('unsubscribe')
  async unsubscribe(@Body('token') token: string) {
    await this.notificationsService.removeToken(token);
    return { ok: true };
  }

  /**
   * Lista todos los tokens registrados (para debug desde admin).
   */
  @Get('tokens')
  async getTokens() {
    const tokens = await this.notificationsService.getAllTokens();
    return tokens.map((t) => ({
      userName: t.userName,
      role: t.role,
      registeredAt: (t as any).createdAt,
    }));
  }
}
