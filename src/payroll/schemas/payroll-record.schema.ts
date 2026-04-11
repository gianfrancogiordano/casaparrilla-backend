import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { Employee } from './employee.schema';

export type PayrollRecordDocument = PayrollRecord & Document;

@Schema({ _id: false })
export class PayrollDeduction {
  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  amount: number;
}

const PayrollDeductionSchema = SchemaFactory.createForClass(PayrollDeduction);

@Schema({ _id: false })
export class PayrollBonus {
  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  amount: number;
}

const PayrollBonusSchema = SchemaFactory.createForClass(PayrollBonus);

@Schema({ timestamps: true })
export class PayrollRecord {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true })
  employeeId: Employee | mongoose.Types.ObjectId;

  @Prop({ required: true })
  periodStart: Date;

  @Prop({ required: true })
  periodEnd: Date;

  @Prop({ required: true })
  baseSalary: number;

  @Prop({ type: [PayrollBonusSchema], default: [] })
  bonuses: PayrollBonus[];

  @Prop({ type: [PayrollDeductionSchema], default: [] })
  deductions: PayrollDeduction[];

  @Prop({ default: 0 })
  totalBonuses: number;

  @Prop({ default: 0 })
  totalDeductions: number;

  @Prop({ required: true })
  netPay: number;

  @Prop({ enum: ['Pendiente', 'Pagado'], default: 'Pendiente' })
  status: string;

  @Prop()
  paidAt?: Date;

  @Prop({ enum: ['Efectivo', 'Transferencia', 'Pago Movil', ''], default: '' })
  paymentMethod: string;

  @Prop()
  notes: string;
}

export const PayrollRecordSchema = SchemaFactory.createForClass(PayrollRecord);
