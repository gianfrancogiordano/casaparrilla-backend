import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SupplierDocument = Supplier & Document;

@Schema({ timestamps: true })
export class Supplier {
  @Prop({ required: true })
  name: string;

  @Prop()
  phone: string;

  @Prop()
  email: string;

  @Prop()
  contactPerson: string;

  @Prop()
  address: string;

  @Prop({ type: [String], default: [] })
  ingredientsSupplied: string[];

  @Prop()
  notes: string;

  @Prop({ default: true })
  active: boolean;
}

export const SupplierSchema = SchemaFactory.createForClass(Supplier);
