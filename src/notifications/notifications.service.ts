import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import * as path from 'path';
import { FcmToken, FcmTokenDocument } from './schemas/fcm-token.schema';

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);
  private messaging: admin.messaging.Messaging | null = null;

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(FcmToken.name) private readonly fcmTokenModel: Model<FcmTokenDocument>,
  ) {}

  onModuleInit() {
    try {
      // Soporta 2 modos: Base64 (Docker/EC2) o archivo directo (local dev)
      let serviceAccount: admin.ServiceAccount;

      const b64 = this.configService.get<string>('FIREBASE_SERVICE_ACCOUNT_B64');
      const filePath = this.configService.get<string>('FIREBASE_SERVICE_ACCOUNT_PATH');

      if (b64) {
        const json = Buffer.from(b64, 'base64').toString('utf8');
        serviceAccount = JSON.parse(json);
        this.logger.log('Firebase Admin inicializado desde variable de entorno Base64');
      } else if (filePath) {
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

  // ─── Token Management (MongoDB) ──────────────────────────────────────────────

  /**
   * Registra o actualiza un token FCM en la base de datos.
   * Si el token ya existe, actualiza el usuario asociado.
   */
  async registerToken(token: string, userId: string, userName: string, role: string): Promise<void> {
    try {
      await this.fcmTokenModel.updateOne(
        { token },
        { token, userId, userName, role },
        { upsert: true },
      );
      this.logger.log(`Token FCM registrado para ${userName} (${role})`);
    } catch (err) {
      this.logger.error(`Error registrando token FCM: ${err.message}`);
    }
  }

  /**
   * Elimina un token FCM de la base de datos (al hacer logout).
   */
  async removeToken(token: string): Promise<void> {
    try {
      await this.fcmTokenModel.deleteOne({ token });
      this.logger.log('Token FCM eliminado');
    } catch (err) {
      this.logger.error(`Error eliminando token FCM: ${err.message}`);
    }
  }

  /**
   * Obtiene todos los tokens registrados (para debug/admin).
   */
  async getAllTokens(): Promise<FcmTokenDocument[]> {
    return this.fcmTokenModel.find().sort({ createdAt: -1 }).exec();
  }

  // ─── Push Notifications ──────────────────────────────────────────────────────

  /**
   * Envía una notificación push a TODOS los tokens registrados en la base de datos.
   * Si un token falla (expirado/inválido), lo elimina automáticamente.
   */
  async sendToAllStaff(
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    if (!this.messaging) {
      this.logger.warn('Firebase Messaging no inicializado — push omitido');
      return;
    }

    const tokens = await this.fcmTokenModel.find().exec();
    if (tokens.length === 0) {
      this.logger.warn('No hay tokens FCM registrados — nadie recibirá el push');
      return;
    }

    this.logger.log(`Enviando push a ${tokens.length} dispositivo(s): "${title}"`);

    const tokensToRemove: string[] = [];

    // Enviar de forma individual para detectar tokens inválidos
    for (const doc of tokens) {
      try {
        await this.messaging.send({
          token: doc.token,
          notification: { title, body },
          data: data ?? {},
          webpush: {
            notification: {
              title,
              body,
              icon: '/icons/icon-192x192.png',
              badge: '/icons/icon-72x72.png',
              image: '/icons/icon-512x512.png',
            },
            fcmOptions: { link: '/delivery' },
          },
        });
      } catch (err: any) {
        const errorCode = err?.code ?? err?.errorInfo?.code ?? '';
        // Token inválido o expirado — marcar para eliminar
        if (
          errorCode === 'messaging/invalid-registration-token' ||
          errorCode === 'messaging/registration-token-not-registered'
        ) {
          this.logger.warn(`Token expirado de ${doc.userName} — eliminando`);
          tokensToRemove.push(doc.token);
        } else {
          this.logger.error(`Error enviando push a ${doc.userName}: ${err.message}`);
        }
      }
    }

    // Limpiar tokens muertos
    if (tokensToRemove.length > 0) {
      await this.fcmTokenModel.deleteMany({ token: { $in: tokensToRemove } });
      this.logger.log(`${tokensToRemove.length} token(s) expirado(s) eliminado(s)`);
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
            image: '/icons/icon-512x512.png',
          },
          fcmOptions: { link: '/' },
        },
      });
      this.logger.log(`Push enviado a device: ${title}`);
    } catch (err) {
      this.logger.error(`Error enviando push a device: ${err.message}`);
    }
  }
}
