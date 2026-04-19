import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

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
export class OrdersGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  // Método para emitir eventos desde otros servicios
  emitOrderCreated(order: any) {
    this.server.emit('order_created', order);
  }

  emitOrderUpdated(order: any) {
    this.server.emit('order_updated', order);
  }

  // ─── Kitchen Display System (KDS) ──────────────────────────────────────────
  emitKitchenNewOrder(order: any) {
    this.server.emit('kitchen:new_order', order);
  }

  emitKitchenOrderUpdated(order: any) {
    this.server.emit('kitchen:order_updated', order);
  }

  @SubscribeMessage('ping')
  handlePing(client: Socket, data: any) {
    return { event: 'pong', data };
  }
}
