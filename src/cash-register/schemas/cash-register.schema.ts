import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type CashRegisterDocument = CashRegister & Document;

@Schema({ _id: false })
export class CashWithdrawal {
  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  reason: string;

  @Prop({ default: () => new Date() })
  timestamp: Date;
}

const CashWithdrawalSchema = SchemaFactory.createForClass(CashWithdrawal);

@Schema({ _id: false })
export class SalesSummary {
  @Prop({ default: 0 })
  efectivo: number;

  @Prop({ default: 0 })
  pagoMovil: number;

  @Prop({ default: 0 })
  zelle: number;

  @Prop({ default: 0 })
  binance: number;

  @Prop({ default: 0 })
  bancolombia: number;

  @Prop({ default: 0 })
  totalVentas: number;

  @Prop({ default: 0 })
  cantidadOrdenes: number;
}

const SalesSummarySchema = SchemaFactory.createForClass(SalesSummary);

@Schema({ timestamps: true })
export class CashRegister {
  @Prop({ required: true })
  openedAt: Date;

  @Prop()
  closedAt?: Date;

  @Prop({ required: true, default: 0 })
  initialAmount: number;

  @Prop({ default: 0 })
  expectedAmount: number;

  @Prop({ default: 0 })
  realAmount: number;

  @Prop({ default: 0 })
  difference: number;

  @Prop({ enum: ['Abierta', 'Cerrada'], default: 'Abierta' })
  status: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  openedBy: User | mongoose.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  closedBy?: User | mongoose.Types.ObjectId;

  @Prop({ type: [CashWithdrawalSchema], default: [] })
  withdrawals: CashWithdrawal[];

  @Prop({ type: SalesSummarySchema, default: {} })
  salesSummary: SalesSummary;

  @Prop()
  notes?: string;
}

export const CashRegisterSchema = SchemaFactory.createForClass(CashRegister);
