import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type FixedExpenseDocument = FixedExpense & Document;

@Schema({ timestamps: true })
export class FixedExpense {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  amount: number;

  @Prop({
    required: true,
    enum: ['Alquiler', 'Servicios', 'Gas', 'Limpieza', 'Mantenimiento', 'Marketing', 'Nómina', 'Transporte', 'Otros'],
    default: 'Otros',
  })
  category: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  notes?: string;
}

export const FixedExpenseSchema = SchemaFactory.createForClass(FixedExpense);
