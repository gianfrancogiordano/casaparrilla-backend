import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type EmployeeDocument = Employee & Document;

@Schema({ timestamps: true })
export class Employee {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  userId?: User | mongoose.Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop()
  cedula: string;

  @Prop()
  phone: string;

  @Prop({ required: true })
  position: string;

  @Prop({
    required: true,
    enum: ['Tiempo Completo', 'Medio Tiempo', 'Por Turno'],
    default: 'Tiempo Completo',
  })
  type: string;

  @Prop({ required: true, default: 0 })
  baseSalary: number;

  @Prop({
    required: true,
    enum: ['Semanal', 'Quincenal', 'Mensual'],
    default: 'Quincenal',
  })
  payFrequency: string;

  @Prop()
  startDate: Date;

  @Prop({ default: true })
  active: boolean;

  @Prop()
  bankName: string;

  @Prop()
  bankAccount: string;

  @Prop()
  notes: string;
}

export const EmployeeSchema = SchemaFactory.createForClass(Employee);
