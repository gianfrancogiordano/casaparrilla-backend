import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { Supplier } from './supplier.schema';
import { Ingredient } from '../../ingredients/schemas/ingredient.schema';
import { User } from '../../users/schemas/user.schema';

export type PurchaseOrderDocument = PurchaseOrder & Document;

@Schema({ _id: false })
export class PurchaseItem {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', required: true })
  ingredientId: Ingredient | mongoose.Types.ObjectId;

  @Prop({ required: true })
  ingredientName: string;

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  unitMeasure: string;

  @Prop({ required: true })
  unitCost: number;

  @Prop({ required: true })
  subtotal: number;
}

const PurchaseItemSchema = SchemaFactory.createForClass(PurchaseItem);

@Schema({ timestamps: true })
export class PurchaseOrder {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true })
  supplierId: Supplier | mongoose.Types.ObjectId;

  @Prop({ required: true })
  date: Date;

  @Prop({ type: [PurchaseItemSchema], required: true })
  items: PurchaseItem[];

  @Prop({ required: true, default: 0 })
  total: number;

  @Prop({ enum: ['Pendiente', 'Confirmada', 'Cancelada'], default: 'Pendiente' })
  status: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  createdBy: User | mongoose.Types.ObjectId;

  @Prop()
  notes: string;
}

export const PurchaseOrderSchema = SchemaFactory.createForClass(PurchaseOrder);
