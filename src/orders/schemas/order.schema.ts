import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { Client } from '../../clients/schemas/client.schema';
import { Product } from '../../products/schemas/product.schema';

export type OrderDocument = Order & Document;

@Schema({ _id: false })
export class OrderItem {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true })
  productId: Product | mongoose.Types.ObjectId;

  @Prop({ required: true })
  productName: string;

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  unitPrice: number;

  @Prop({ required: true })
  subtotal: number;

  @Prop()
  notes: string;

  @Prop({ default: false })
  sentToCocina: boolean;

  @Prop({ default: true })
  requiresKitchen: boolean;
}

const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

@Schema({ _id: false })
export class OrderTotals {
  @Prop({ required: true, default: 0 })
  subtotal: number;

  @Prop({ required: true, default: 0 })
  taxes: number;

  @Prop({ required: true, default: 0 })
  total: number;
}

const OrderTotalsSchema = SchemaFactory.createForClass(OrderTotals);

@Schema({ _id: false })
export class PaymentInfo {
  @Prop({ default: 'Pendiente' })
  status: string;

  @Prop()
  method: string;
}

const PaymentInfoSchema = SchemaFactory.createForClass(PaymentInfo);

@Schema({ timestamps: true })
export class Order {
  @Prop({ required: true, unique: true })
  orderNumber: string;

  @Prop({ required: true, default: 'En Cocina' })
  status: string;

  @Prop({ required: true })
  orderType: string;

  @Prop()
  table: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  waiterId: User | mongoose.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Client' })
  clientId: Client | mongoose.Types.ObjectId;

  @Prop({ type: [OrderItemSchema], required: true })
  items: OrderItem[];

  @Prop({ type: OrderTotalsSchema, required: true })
  totals: OrderTotals;

  @Prop({ type: PaymentInfoSchema, default: {} })
  paymentInfo: PaymentInfo;

  @Prop()
  deliveryAddress?: string;

  @Prop()
  deliveryNotes?: string;

  @Prop()
  customerPhone?: string;

  @Prop()
  fcmToken?: string;  // Token FCM del dispositivo del cliente (Tienda) — para push de status

  // ─── Satisfacción del cliente ─────────────────────────────────────────────
  @Prop({ type: Number, min: 1, max: 5 })
  rating?: number;        // Calificación 1-5 enviada por WhatsApp post-entrega

  @Prop({ trim: true })
  ratingComment?: string; // Comentario adicional opcional
}

export const OrderSchema = SchemaFactory.createForClass(Order);
