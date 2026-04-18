import { Controller, Get, Post, Body, Param, NotFoundException, ForbiddenException, Patch } from '@nestjs/common';
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

  @Get('status')
  async getStatus() {
    const config = await this.configuracionService.get() as any;
    return this.configuracionService.isOpen(config.horario ?? [], config.activo ?? true);
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

      // Filtrar productos disponibles Y aptos para delivery (la tienda y Valentina son canales delivery)
      return allProducts.filter((p) => p && p.available === true && (p as any).availableForDelivery !== false);
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
    // Verificar si el restaurante está abierto
    const config = await this.configuracionService.get() as any;
    const { isOpen, nextOpening } = this.configuracionService.isOpen(config.horario ?? [], config.activo ?? true);
    if (!isOpen) {
      const msg = nextOpening
        ? `El restaurante está cerrado. Abrimos ${nextOpening}.`
        : 'El restaurante está cerrado por hoy.';
      throw new ForbiddenException(msg);
    }

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
      fcmToken: body.fcmToken ?? null,
      items: body.items.map((item: any) => ({
        productId: item.productId || new (require('mongoose').Types.ObjectId)(),
        productName: item.productName || item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice ?? item.price,
        subtotal: item.subtotal ?? (item.quantity * (item.unitPrice ?? item.price)),
        notes: item.notes ?? '',
        sentToCocina: false,
        requiresKitchen: item.requiresKitchen ?? true,
      })),
      totals: {
        subtotal: body.items.reduce((acc: number, val: any) => acc + (val.subtotal ?? val.quantity * (val.unitPrice ?? val.price)), 0),
        taxes: 0,
        total: body.items.reduce((acc: number, val: any) => acc + (val.subtotal ?? val.quantity * (val.unitPrice ?? val.price)), 0),
      },
      paymentInfo: {
        status: 'Pendiente',
        method: body.paymentMethod || 'Efectivo',
      },
    };

    const savedOrder = await this.ordersService.create(newOrder);

    // 🆕 Notificar a todos los meseros/admins sobre el nuevo delivery
    const clientName = body.clientName || body.customerPhone || 'Cliente';
    const totalOrder = savedOrder.totals?.total || 0;
    const formattedTotal = new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD', 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(totalOrder);
    
    this.notificationsService.sendToAllStaff(
      '🛵 Nuevo Delivery',
      `${clientName} — Monto: ${formattedTotal}`,
      { orderId: (savedOrder as any)._id?.toString() ?? '', orderType: 'Delivery' },
    );

    return savedOrder;
  }

  @Get('orders/by-phone/:phone')
  async getOrderByPhone(@Param('phone') phone: string) {
    const orders = await this.ordersService.findAll();
    const customerOrders = orders
      .filter((o: any) => o.customerPhone === phone && o.orderType === 'Delivery')
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (!customerOrders.length) throw new NotFoundException('No se encontraron pedidos para este número');
    return customerOrders[0];
  }

  @Get('orders/:id')
  async getOrderStatus(@Param('id') id: string) {
    // Support lookup by orderNumber (DEL-XXXXX) or by MongoDB _id
    let order;
    if (id.startsWith('DEL-')) {
      order = await this.ordersService.findByOrderNumber(id);
    } else {
      order = await this.ordersService.findOne(id);
    }
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

  @Patch('orders/:id/cancel')
  async cancelOrderPublic(@Param('id') id: string, @Body() body: { reason?: string }) {
    return this.ordersService.update(id, { status: 'Cancelado' });
  }

  @Post('orders/rate')
  async rateOrder(@Body() body: { phone: string; rating: number; comment?: string }) {
    const { phone, rating, comment } = body;

    if (!phone || !rating || rating < 1 || rating > 5) {
      throw new NotFoundException('Datos de calificación inválidos. Se requiere phone y rating (1-5).');
    }

    // Find the most recent delivered order for this phone
    const allOrders = await this.ordersService.findAll();
    const deliveredOrder = allOrders
      .filter((o: any) =>
        o.customerPhone === phone &&
        o.orderType === 'Delivery' &&
        ['Entregado', 'Pagado'].includes(o.status) &&
        !(o as any).rating // has not been rated yet
      )
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    if (!deliveredOrder) {
      // If all recent orders are already rated, rate the most recent one anyway
      const anyDelivered = allOrders
        .filter((o: any) => o.customerPhone === phone && o.orderType === 'Delivery' && ['Entregado', 'Pagado'].includes(o.status))
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

      if (!anyDelivered) throw new NotFoundException('No se encontró un pedido entregado para calificar.');

      return this.ordersService.update((anyDelivered as any)._id.toString(), {
        rating: Math.round(rating),
        ratingComment: comment ?? '',
      });
    }

    return this.ordersService.update((deliveredOrder as any)._id.toString(), {
      rating: Math.round(rating),
      ratingComment: comment ?? '',
    });
  }
}
