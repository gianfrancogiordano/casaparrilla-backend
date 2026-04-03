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
    origin: [
      'https://admin.casaparrilla.com',
      'https://www.casaparrilla.com',
      'https://casaparrilla.com',
      'http://localhost:4200'
    ],
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

  @SubscribeMessage('ping')
  handlePing(client: Socket, data: any) {
    return { event: 'pong', data };
  }
}
