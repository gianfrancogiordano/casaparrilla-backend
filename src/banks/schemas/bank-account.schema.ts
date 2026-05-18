import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BankAccountDocument = BankAccount & Document;

@Schema({ timestamps: true })
export class BankAccount {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ enum: ['Corriente', 'Ahorro', 'Digital', 'Efectivo', 'Otro'], default: 'Corriente' })
  accountType: string;

  @Prop({ trim: true })
  accountNumber?: string;

  @Prop({ enum: ['USD', 'BS', 'COP', 'USDT'], default: 'USD' })
  currency: string;

  @Prop({ default: 0 })
  balance: number;

  @Prop({ default: true })
  isActive: boolean;

  // Vinculación manual: un admin asigna qué método de pago deposita aquí
  // Valores válidos: 'Efectivo' | 'Pago Movil' | 'Binance' | 'Bancolombia' | 'Zelle'
  @Prop({ trim: true })
  linkedPaymentMethod?: string;

  @Prop({ trim: true })
  notes?: string;

  @Prop({ trim: true })
  icon?: string;
}

export const BankAccountSchema = SchemaFactory.createForClass(BankAccount);
