import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ClientDocument = Client & Document;

@Schema()
export class Address {
  @Prop()
  type: string;

  @Prop()
  street: string;

  @Prop()
  reference: string;

  @Prop({ default: true })
  isDefault: boolean;
}

const AddressSchema = SchemaFactory.createForClass(Address);

@Schema({ timestamps: true })
export class Client {
  @Prop({ required: true })
  name: string;

  @Prop()
  phone: string;

  @Prop()
  email: string;

  @Prop({ default: 0 })
  loyaltyPoints: number;

  @Prop({ type: [AddressSchema], default: [] })
  addresses: Address[];
}

export const ClientSchema = SchemaFactory.createForClass(Client);
