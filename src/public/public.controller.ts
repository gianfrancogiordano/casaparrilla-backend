import { Controller, Get, Post, Body, Param, NotFoundException } from '@nestjs/common';
import { ProductsService } from '../products/products.service';
import { OrdersService } from '../orders/orders.service';
import { ClientsService } from '../clients/clients.service';
import { ConfiguracionService } from '../configuracion/configuracion.service';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';

@Controller('public')
export class PublicController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly ordersService: OrdersService,
    private readonly clientsService: ClientsService,
    private readonly configuracionService: ConfiguracionService,
    private readonly usersService: UsersService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Get('configuracion')
  async getConfig() {
    return this.configuracionService.get();
  }

  @Get('products')
  async getProducts() {
    try {
      const allProducts = await this.productsService.findAll();
      
      // Asegurarse de que allProducts sea un arreglo antes de filtrar
      if (!Array.isArray(allProducts)) {
        console.error('getProducts: productsService.findAll() did not return an array');
        return [];
      }

      // Filtrar productos disponibles
      return allProducts.filter((p) => p && p.available === true);
    } catch (error) {
      console.error('Error al obtener productos públicos:', error);
      // Retornar un arreglo vacío para evitar que la tienda se rompa por completo con un 500
      return [];
    }
  }

  @Post('clients/identify')
  async identifyClient(@Body() body: { phone: string; name: string }) {
    const client = await this.clientsService.findOrCreateByPhone(body.phone, body.name);
    return {
      clientId: (client as any)._id,
      name: client.name,
      loyaltyPoints: client.loyaltyPoints,
      isVip: client.loyaltyPoints > 0,
    };
  }

  @Post('orders')
  async createOrder(@Body() body: any) {
    // Buscar el usuario "Delivery" para asignar como mesero
    const deliveryUser = await this.usersService.findByName('Delivery');
    if (!deliveryUser) {
      throw new NotFoundException('Configuración del sistema incompleta (Delivery user not found)');
    }

    const orderNumber = `DEL-${Date.now()}`;
    
    const newOrder = {
      orderNumber,
      status: 'Recibido',
      orderType: 'Delivery',
      waiterId: (deliveryUser as any)._id,
      clientId: body.clientId,
      customerPhone: body.customerPhone,
      deliveryAddress: body.deliveryAddress,
      deliveryNotes: body.deliveryNotes,
      fcmToken: body.fcmToken ?? null,   // 🆕 Guardamos el token del cliente
      items: body.items.map((item: any) => ({
        ...item,
        sentToCocina: false,
        requiresKitchen: item.requiresKitchen ?? true,
      })),
      totals: {
        subtotal: body.items.reduce((acc: number, val: any) => acc + val.subtotal, 0),
        taxes: 0,
        total: body.items.reduce((acc: number, val: any) => acc + val.subtotal, 0),
      },
      paymentInfo: {
        status: 'Pendiente',
        method: body.paymentMethod || 'Efectivo',
      },
    };

    const savedOrder = await this.ordersService.create(newOrder);

    // 🆕 Notificar al admin sobre el nuevo delivery
    const clientName = body.clientName || body.customerPhone || 'Cliente';
    const address = body.deliveryAddress || 'Dirección no especificada';
    this.notificationsService.sendToTopic(
      'admin-deliveries',
      '🛵 Nuevo Delivery',
      `${clientName} — ${address}`,
      { orderId: (savedOrder as any)._id?.toString() ?? '', orderType: 'Delivery' },
    );

    return savedOrder;
  }

  @Get('orders/:id')
  async getOrderStatus(@Param('id') id: string) {
    const order = await this.ordersService.findOne(id);
    if (!order) throw new NotFoundException('Pedido no encontrado');
    
    // Simplificar el estado para el cliente mayor
    let simpleStatus = order.status;
    let emoji = '⏳';

    switch (order.status) {
      case 'Recibido':
        simpleStatus = 'Lo hemos recibido';
        emoji = '✅';
        break;
      case 'En Cocina':
        simpleStatus = 'Lo estamos preparando';
        emoji = '🍖';
        break;
      case 'Listo':
        simpleStatus = '¡Ya está listo!';
        emoji = '😋';
        break;
      case 'En Camino':
        simpleStatus = 'El repartidor va hacia allá';
        emoji = '🛵';
        break;
      case 'Entregado':
      case 'Pagado':
        simpleStatus = '¡Ya fue entregado! Gracias';
        emoji = '🎉';
        break;
      case 'Cancelado':
        simpleStatus = 'Pedido cancelado';
        emoji = '❌';
        break;
    }

    return {
      id: (order as any)._id,
      orderNumber: order.orderNumber,
      status: order.status,
      simpleStatus,
      emoji,
      items: order.items,
      total: order.totals.total,
    };
  }
}
