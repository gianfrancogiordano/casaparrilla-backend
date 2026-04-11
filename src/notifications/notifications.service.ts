import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import * as path from 'path';

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);
  private messaging: admin.messaging.Messaging | null = null;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    try {
      // Soporta 2 modos: Base64 (Docker/EC2) o archivo directo (local dev)
      let serviceAccount: admin.ServiceAccount;

      const b64 = this.configService.get<string>('FIREBASE_SERVICE_ACCOUNT_B64');
      const filePath = this.configService.get<string>('FIREBASE_SERVICE_ACCOUNT_PATH');

      if (b64) {
        // Producción: decodifica el Base64
        const json = Buffer.from(b64, 'base64').toString('utf8');
        serviceAccount = JSON.parse(json);
        this.logger.log('Firebase Admin inicializado desde variable de entorno Base64');
      } else if (filePath) {
        // Desarrollo: lee el archivo directamente
        const absolutePath = path.resolve(process.cwd(), filePath);
        serviceAccount = require(absolutePath);
        this.logger.log(`Firebase Admin inicializado desde archivo: ${absolutePath}`);
      } else {
        this.logger.warn('Firebase Admin: no se encontró FIREBASE_SERVICE_ACCOUNT_B64 ni FIREBASE_SERVICE_ACCOUNT_PATH. Push notifications deshabilitadas.');
        return;
      }

      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
      }

      this.messaging = admin.messaging();
      this.logger.log('Firebase Messaging inicializado correctamente ✅');
    } catch (err) {
      this.logger.error('Error al inicializar Firebase Admin:', err);
    }
  }

  /**
   * Envía una notificación push a un dispositivo específico (cliente de la tienda)
   */
  async sendToDevice(
    token: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    if (!this.messaging) return;
    try {
      await this.messaging.send({
        token,
        notification: { title, body },
        data: data ?? {},
        webpush: {
          notification: {
            title,
            body,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-72x72.png',
          },
          fcmOptions: { link: '/' },
        },
      });
      this.logger.log(`Push enviado a device: ${title}`);
    } catch (err) {
      this.logger.error(`Error enviando push a device: ${err.message}`);
    }
  }

  /**
   * Envía una notificación push a todos los suscritos a un topic (admins)
   */
  async sendToTopic(
    topic: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    if (!this.messaging) return;
    try {
      await this.messaging.send({
        topic,
        notification: { title, body },
        data: data ?? {},
        webpush: {
          notification: {
            title,
            body,
            icon: '/assets/icons/icon-192x192.png',
            badge: '/assets/icons/icon-72x72.png',
          },
          fcmOptions: { link: '/delivery' },
        },
      });
      this.logger.log(`Push enviado a topic '${topic}': ${title}`);
    } catch (err) {
      this.logger.error(`Error enviando push a topic: ${err.message}`);
    }
  }

  /**
   * Suscribe un token FCM a un topic (para admins en el frontend)
   */
  async subscribeToTopic(token: string, topic: string): Promise<void> {
    if (!this.messaging) return;
    try {
      await this.messaging.subscribeToTopic([token], topic);
      this.logger.log(`Token suscrito al topic '${topic}'`);
    } catch (err) {
      this.logger.error(`Error suscribiendo al topic: ${err.message}`);
    }
  }

  /**
   * Desuscribe un token de un topic
   */
  async unsubscribeFromTopic(token: string, topic: string): Promise<void> {
    if (!this.messaging) return;
    try {
      await this.messaging.unsubscribeFromTopic([token], topic);
    } catch (err) {
      this.logger.error(`Error desuscribiendo del topic: ${err.message}`);
    }
  }
}
