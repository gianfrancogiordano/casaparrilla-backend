import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type IngredientDocument = Ingredient & Document;

@Schema({ timestamps: true })
export class Ingredient {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true })
  unitMeasure: string;

  @Prop({ required: true, default: 0 })
  unitCost: number;

  @Prop({ required: true, default: 0 })
  currentStock: number;

  @Prop({ default: 0 })
  minStock: number;
}

export const IngredientSchema = SchemaFactory.createForClass(Ingredient);
