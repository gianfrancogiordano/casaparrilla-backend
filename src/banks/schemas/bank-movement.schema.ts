import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { BankAccount } from './bank-account.schema';

export type BankMovementDocument = BankMovement & Document;

@Schema({ timestamps: true })
export class BankMovement {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'BankAccount', required: true })
  accountId: BankAccount | mongoose.Types.ObjectId;

  @Prop({ enum: ['Ingreso', 'Egreso'], required: true })
  type: string;

  @Prop({ required: true, min: 0.01 })
  amount: number;

  @Prop({ required: true, trim: true })
  description: string;

  @Prop({
    enum: ['Venta', 'Capital', 'Transferencia', 'Pago Proveedor', 'Nómina', 'Gasto', 'Retiro', 'Ajuste', 'Otro'],
    default: 'Otro',
  })
  category: string;

  @Prop({ trim: true })
  reference?: string;

  @Prop({ required: true })
  date: Date;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  userId?: User | mongoose.Types.ObjectId;

  // Referencia cruzada a la orden que generó este movimiento (auto-registro)
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Order' })
  orderId?: mongoose.Types.ObjectId;

  @Prop({ trim: true })
  notes?: string;
}

export const BankMovementSchema = SchemaFactory.createForClass(BankMovement);
