import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { Order, OrderDocument } from './schemas/order.schema';

import { IngredientsService } from '../ingredients/ingredients.service';
import { ClientsService } from '../clients/clients.service';
import { Product, ProductDocument } from '../products/schemas/product.schema';

import { OrdersGateway } from './orders.gateway';
import { NotificationsService } from '../notifications/notifications.service';

const AGENT_URL = process.env.AGENT_URL ?? 'http://localhost:3008';


@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    private readonly ingredientsService: IngredientsService,
    private readonly clientsService: ClientsService,
    private readonly ordersGateway: OrdersGateway,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(createDto: any): Promise<Order> {
    const created = new this.orderModel(createDto);
    const savedOrder = await created.save();
    
    // Poblar de inmediato para que el socket lleve el nombre del cliente
    const populatedOrder = await this.orderModel.findById(savedOrder._id)
      .populate('clientId')
      .populate('waiterId', 'name')
      .exec();

    // Emitir evento de creación (importante para la vista de Delivery)
    if (populatedOrder) {
      this.ordersGateway.emitOrderCreated(populatedOrder);
    }
    
    return populatedOrder || savedOrder;
  }

  async findAll(): Promise<Order[]> {
    return this.orderModel.find()
      .populate('clientId')
      .populate('waiterId', 'name')
      .sort({ createdAt: -1 })
      .exec();
  }

  /** Busca la orden abierta de una mesa (status != Cerrado/Pagado) */
  async findOpenOrderByTable(tableNumber: string): Promise<Order | null> {
    return this.orderModel
      .findOne({
        table: tableNumber,
        status: { $nin: ['Pagado', 'Cerrado', 'Cancelado'] },
      })
      .populate('waiterId', 'name')
      .exec();
  }

  /** Agrega un item a una orden existente y recalcula totales.
   *  Si el producto ya existe en la comanda, incrementa la cantidad. */
  async addItemToOrder(
    id: string,
    item: { productId: string; productName: string; quantity: number; unitPrice: number; notes?: string; requiresKitchen?: boolean },
  ): Promise<Order> {
    const order = await this.orderModel.findById(id);
    if (!order) throw new NotFoundException(`Order #${id} not found`);

    // Buscar si el producto ya existe en la comanda con LA MISMA NOTA
    const existingItem = order.items.find(
      (i) => i.productId.toString() === item.productId && (i.notes ?? '') === (item.notes ?? ''),
    );

    if (existingItem) {
      // Incrementar cantidad y recalcular subtotal del item
      existingItem.quantity += item.quantity;
      existingItem.subtotal = existingItem.quantity * existingItem.unitPrice;
      // Si incrementamos un item ya enviado, lo marcamos como no enviado (nueva ronda)
      existingItem.sentToCocina = false;
    } else {
      // Agregar como nueva línea
      const subtotal = item.quantity * item.unitPrice;
      order.items.push({
        ...item,
        subtotal,
        sentToCocina: false,
        requiresKitchen: item.requiresKitchen ?? true,
      } as any);
    }

    // Recalcular totales de la orden
    const newSubtotal = order.items.reduce((acc, i) => acc + i.subtotal, 0);
    order.totals.subtotal = newSubtotal;
    order.totals.taxes = 0;
    order.totals.total = newSubtotal;

    const savedOrder = await order.save();
    
    // Poblar para que el socket lleve info completa
    const populatedOrder = await this.orderModel.findById(savedOrder._id)
      .populate('clientId')
      .populate('waiterId', 'name')
      .exec();

    if (populatedOrder) {
      this.ordersGateway.emitOrderUpdated(populatedOrder);
    }
    
    return populatedOrder || savedOrder;
  }

  /** Elimina un item de una orden por su posición en el array */
  async removeItemFromOrder(id: string, itemIndex: number): Promise<Order> {
    const order = await this.orderModel.findById(id);
    if (!order) throw new NotFoundException(`Order #${id} not found`);

    order.items.splice(itemIndex, 1);
    const newSubtotal = order.items.reduce((acc, i) => acc + i.subtotal, 0);
    order.totals.subtotal = newSubtotal;
    order.totals.total = newSubtotal;

    const savedOrder = await order.save();
    
    const populatedOrder = await this.orderModel.findById(savedOrder._id)
      .populate('clientId')
      .populate('waiterId', 'name')
      .exec();

    if (populatedOrder) {
      this.ordersGateway.emitOrderUpdated(populatedOrder);
    }
    
    return populatedOrder || savedOrder;
  }

  /** Cobra la orden.
   *  - Delivery: solo actualiza paymentInfo (el status sigue el flujo de entrega).
   *  - Presencial (Meseros): cierra el pedido con status = 'Pagado'.
   */
  async payOrder(
    id: string,
    paymentMethod: 'Efectivo' | 'Pago Movil' | 'Binance' | 'Bancolombia' | 'Zelle',
  ): Promise<Order> {
    const order = await this.orderModel.findById(id);
    if (!order) throw new NotFoundException(`Order #${id} not found`);

    // Solo cerrar el status para pedidos presenciales
    if ((order as any).orderType !== 'Delivery') {
      order.status = 'Pagado';
    }

    order.paymentInfo = { status: 'Pagado', method: paymentMethod };

    const savedOrder = await order.save();

    // DESCUENTO AUTOMÁTICO DE STOCK
    try {
      for (const item of savedOrder.items) {
        const product = await this.productModel.findById(item.productId).exec();
        if (product && product.recipe && product.recipe.length > 0) {
          for (const recipeItem of product.recipe) {
            const delta = -(recipeItem.quantityRequired * item.quantity);
            await this.ingredientsService.adjustStock(recipeItem.ingredientId.toString(), delta);
          }
        }
      }
    } catch (error) {
      console.error('Error al descontar stock automáticamente:', error);
    }

    // ACUMULACIÓN DE PUNTOS VIP
    try {
      if (savedOrder.clientId) {
        const points = Math.floor(savedOrder.totals.total);
        await this.clientsService.addPoints(savedOrder.clientId.toString(), points);
      }
    } catch (error) {
      console.error('Error al acumular puntos fidelidad:', error);
    }

    // Emitir socket para que el frontend actualice la card con el nuevo paymentInfo
    const populatedOrder = await this.orderModel.findById(savedOrder._id)
      .populate('clientId')
      .populate('waiterId', 'name')
      .exec();

    if (populatedOrder) {
      this.ordersGateway.emitOrderUpdated(populatedOrder);
    }

    return populatedOrder || savedOrder;
  }


  /** Vincula un cliente a una orden abierta */
  async linkClientToOrder(orderId: string, clientId: string): Promise<Order> {
    const order = await this.orderModel.findById(orderId);
    if (!order) throw new NotFoundException(`Order #${orderId} not found`);

    order.clientId = new mongoose.Types.ObjectId(clientId) as any;
    const savedOrder = await order.save();
    
    const populatedOrder = await this.orderModel.findById(savedOrder._id)
      .populate('clientId')
      .populate('waiterId', 'name')
      .exec();

    if (populatedOrder) {
      this.ordersGateway.emitOrderUpdated(populatedOrder);
    }
    
    return populatedOrder || savedOrder;
  }

  /** Marca los ítems pendientes de cocina como enviados y cambia el status a 'En Cocina' */
  async sendToKitchen(id: string): Promise<Order> {
    const order = await this.orderModel.findById(id);
    if (!order) throw new NotFoundException(`Order #${id} not found`);

    let itemsEnviados = 0;
    for (const item of order.items) {
      if ((item as any).requiresKitchen && !(item as any).sentToCocina) {
        (item as any).sentToCocina = true;
        itemsEnviados++;
      }
    }

    if (itemsEnviados > 0) {
      order.status = 'En Cocina';
      (order as any).kitchenSentAt = new Date();
    }

    const savedOrder = await order.save();
    
    const populatedOrder = await this.orderModel.findById(savedOrder._id)
      .populate('clientId')
      .populate('waiterId', 'name')
      .exec();

    if (populatedOrder) {
      this.ordersGateway.emitOrderUpdated(populatedOrder);
      // Notify the KDS in real-time
      if (itemsEnviados > 0) {
        this.ordersGateway.emitKitchenNewOrder(populatedOrder);
      }
    }
    
    return populatedOrder || savedOrder;
  }

  async findOne(id: string): Promise<Order> {
    const item = await this.orderModel.findById(id).exec();
    if (!item) {
      throw new NotFoundException(`Order #${id} not found`);
    }
    return item;
  }

  async findByOrderNumber(orderNumber: string): Promise<Order | null> {
    return this.orderModel.findOne({ orderNumber }).exec();
  }

  async update(id: string, updateDto: any): Promise<Order> {
    const existing = await this.orderModel.findByIdAndUpdate(id, updateDto, { new: true })
      .populate('clientId')
      .populate('waiterId', 'name')
      .exec();

    if (!existing) {
      throw new NotFoundException(`Order #${id} not found`);
    }

    // ── Push FCM al cliente si cambió el status de una orden Delivery ──────
    const newStatus = updateDto.status;
    const fcmToken = (existing as any).fcmToken;
    if (newStatus && fcmToken && (existing as any).orderType === 'Delivery') {
      const pushMessages: Record<string, { title: string; body: string }> = {
        'En Cocina':  { title: '🍖 Preparando tu pedido', body: 'Ya estamos en la parrilla, ¡pronto llega!' },
        'En Camino':  { title: '🛵 ¡Tu pedido va en camino!', body: 'El repartidor está yendo hacia ti.' },
        'Entregado':  { title: '🎉 ¡Pedido entregado!', body: '¡Disfruta tu parrilla! Gracias por elegirnos.' },
        'Pagado':     { title: '🎉 ¡Pedido entregado!', body: '¡Disfruta tu parrilla! Gracias por elegirnos.' },
        'Cancelado':  { title: '❌ Pedido cancelado', body: 'Tu pedido fue cancelado. Contáctanos para más info.' },
      };
      const msg = pushMessages[newStatus];
      if (msg) {
        this.notificationsService.sendToDevice(fcmToken, msg.title, msg.body, {
          orderId: id,
          status: newStatus,
        });
      }
    }

    // ── WhatsApp proactivo via Valentina ─────────────────────────────────────
    // Solo si el pedido fue creado por el agente de WhatsApp (Valentina)
    const customerPhone = (existing as any).customerPhone;
    const isWhatsappOrder = (existing as any).source === 'whatsapp';

    if (newStatus && customerPhone && isWhatsappOrder && (existing as any).orderType === 'Delivery') {
      const waMessages: Record<string, string> = {
        'En Cocina': `🍖 ¡Hola! Tu pedido *${(existing as any).orderNumber}* ya está en la parrilla. En breve estará listo 🔥`,
        'Lista':     `✅ ¡Tu pedido *${(existing as any).orderNumber}* está listo! El repartidor lo recogerá en cualquier momento 🛵`,
        'Entregado': `🎉 ¡Tu pedido *${(existing as any).orderNumber}* fue entregado! Esperamos que lo disfrutes mucho 🔥\n\n¿Cómo was tu experiencia? Respóndenos con un número del 1 al 5 ⭐`,
        'Cancelado': `❌ Tu pedido *${(existing as any).orderNumber}* fue cancelado. Contáctanos para más información.`,
      };
      const waMsg = waMessages[newStatus];
      if (waMsg) {
        fetch(`${AGENT_URL}/v1/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ number: customerPhone, message: waMsg }),
        }).catch(e => console.warn('⚠️ WhatsApp notification failed:', e.message));
      }

      // Encuesta de satisfacción — 30 min después de Entregado
      if (newStatus === 'Entregado') {
        setTimeout(() => {
          fetch(`${AGENT_URL}/v1/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              number: customerPhone,
              message: `⭐ ¿Cómo calificarías tu experiencia con Casa Parrilla?\n\nResponde con un número:\n5 ⭐ Excelente\n4 👍 Muy bueno\n3 😐 Regular\n2 👎 Malo\n1 😠 Pésimo`,
            }),
          }).catch(e => console.warn('⚠️ Survey notification failed:', e.message));
        }, 30 * 60 * 1000);
      }
    }


    // Emitir evento de actualización (socket)
    this.ordersGateway.emitOrderUpdated(existing);

    // ── KDS events ───────────────────────────────────────────────────────────
    // Delivery → En Cocina: notify kitchen display
    if (newStatus === 'En Cocina' && (existing as any).orderType === 'Delivery') {
      // Mark requiresKitchen items as sentToCocina and set timestamp
      await this.orderModel.updateOne(
        { _id: id },
        {
          $set: {
            kitchenSentAt: new Date(),
            'items.$[el].sentToCocina': true,
          }
        },
        { arrayFilters: [{ 'el.requiresKitchen': true }] }
      );
      const freshOrder = await this.orderModel.findById(id).populate('clientId').populate('waiterId', 'name').exec();
      this.ordersGateway.emitKitchenNewOrder(freshOrder);
    }
    // Any order → Listo: remove from KDS
    if (newStatus === 'Listo') {
      this.ordersGateway.emitKitchenOrderUpdated(existing);
    }

    return existing;
  }

  async remove(id: string): Promise<Order> {
    const deleted = await this.orderModel.findByIdAndDelete(id).exec();
    if (!deleted) {
      throw new NotFoundException(`Order #${id} not found`);
    }
    return deleted;
  }
}
