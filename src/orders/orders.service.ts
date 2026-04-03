import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { Order, OrderDocument } from './schemas/order.schema';

import { IngredientsService } from '../ingredients/ingredients.service';
import { ClientsService } from '../clients/clients.service';
import { Product, ProductDocument } from '../products/schemas/product.schema';

import { OrdersGateway } from './orders.gateway';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    private readonly ingredientsService: IngredientsService,
    private readonly clientsService: ClientsService,
    private readonly ordersGateway: OrdersGateway,
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
    return this.orderModel.find().populate('clientId').sort({ createdAt: -1 }).exec();
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

  /** Cobra y cierra la orden. Marca como Pagado con el método de pago. */
  async payOrder(
    id: string,
    paymentMethod: 'Efectivo' | 'Pago Movil' | 'Binance' | 'Bancolombia' | 'Zelle',
  ): Promise<Order> {
    const order = await this.orderModel.findById(id);
    if (!order) throw new NotFoundException(`Order #${id} not found`);

    order.status = 'Pagado';
    order.paymentInfo = { status: 'Pagado', method: paymentMethod };

    const savedOrder = await order.save();

    // DESCUENTO AUTOMÁTICO DE STOCK
    try {
      for (const item of savedOrder.items) {
        // Buscar el producto para obtener su receta
        const product = await this.productModel.findById(item.productId).exec();
        if (product && product.recipe && product.recipe.length > 0) {
          for (const recipeItem of product.recipe) {
            // Calcular cuánto descontar: cantidadEnReceta * cantidadVendida
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

    return savedOrder;
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
    }

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

  async findOne(id: string): Promise<Order> {
    const item = await this.orderModel.findById(id).exec();
    if (!item) {
      throw new NotFoundException(`Order #${id} not found`);
    }
    return item;
  }

  async update(id: string, updateDto: any): Promise<Order> {
    const existing = await this.orderModel.findByIdAndUpdate(id, updateDto, { new: true })
      .populate('clientId')
      .populate('waiterId', 'name')
      .exec();

    if (!existing) {
      throw new NotFoundException(`Order #${id} not found`);
    }
    
    // Emitir evento de actualización
    this.ordersGateway.emitOrderUpdated(existing);
    
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
