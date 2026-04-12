import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

/**
 * ChatGateway — emits real-time WhatsApp chat events to connected Angular clients.
 * Runs on the same Socket.io server as OrdersGateway (same port, different events).
 */
@WebSocketGateway({
  cors: {
    origin: [
      'https://admin.casaparrilla.com',
      'https://www.casaparrilla.com',
      'https://casaparrilla.com',
      'http://localhost:4200',
      'http://localhost:4201',
    ],
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
    timestamp: Date;
  }) {
    this.server.emit('chat:new_message', payload);
  }

  /** Emitted when a session is updated (unread count, AI toggle, last message) */
  emitSessionUpdated(session: any) {
    this.server.emit('chat:session_updated', session);
  }
}
