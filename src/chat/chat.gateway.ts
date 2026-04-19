import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

/**
 * ChatGateway — emits real-time WhatsApp chat events to connected Angular clients.
 * Runs on the same Socket.io server as OrdersGateway (same port, different events).
 */
@WebSocketGateway({
  cors: {
    origin: (origin: string, callback: Function) => {
      if (!origin) return callback(null, true);
      const allowed = [
        'https://admin.casaparrilla.com',
        'https://www.casaparrilla.com',
        'https://casaparrilla.com',
        'https://main.djc1g6bljnrfx.amplifyapp.com',
      ];
      if (allowed.includes(origin) || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  /** Emitted when a new message arrives (from client, AI, or admin human) */
  emitNewMessage(payload: {
    phone: string;
    role: 'user' | 'ai' | 'human';
    content: string;
    type?: 'text' | 'audio' | 'image' | 'location';
    mediaUrl?: string | null;
    lat?: number | null;
    lng?: number | null;
    timestamp: Date;
  }) {
    this.server.emit('chat:new_message', payload);
  }

  /** Emitted when a session is updated (unread count, AI toggle, last message) */
  emitSessionUpdated(session: any) {
    this.server.emit('chat:session_updated', session);
  }
}
