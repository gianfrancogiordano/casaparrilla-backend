import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type ExpenseDocument = Expense & Document;

@Schema({ timestamps: true })
export class Expense {
  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  amount: number;

  @Prop({
    required: true,
    enum: ['Alquiler', 'Servicios', 'Gas', 'Limpieza', 'Mantenimiento', 'Marketing', 'Nómina', 'Compras Insumos', 'Transporte', 'Otros'],
  })
  category: string;

  @Prop({ required: true })
  date: Date;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  userId: User | mongoose.Types.ObjectId;

  @Prop()
  receiptUrl?: string;

  @Prop()
  notes?: string;

  // Cuenta bancaria de la que se descuenta este gasto
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'BankAccount' })
  bankAccountId?: mongoose.Types.ObjectId;
}

export const ExpenseSchema = SchemaFactory.createForClass(Expense);
