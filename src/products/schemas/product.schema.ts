import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { Ingredient } from '../../ingredients/schemas/ingredient.schema';

export type ProductDocument = Product & Document;

@Schema({ _id: false })
export class RecipeItem {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', required: true })
  ingredientId: Ingredient | mongoose.Types.ObjectId;

  @Prop({ required: true })
  ingredientName: string;

  @Prop({ required: true })
  quantityRequired: number;

  @Prop({ required: true })
  unitMeasure: string;
}

const RecipeItemSchema = SchemaFactory.createForClass(RecipeItem);

@Schema({ timestamps: true })
export class Product {
  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  @Prop({ required: true })
  sellPrice: number;

  @Prop()
  category: string;

  @Prop()
  imageUrl: string;

  @Prop({ default: true })
  available: boolean;

  @Prop({ type: [RecipeItemSchema], default: [] })
  recipe: RecipeItem[];
}

export const ProductSchema = SchemaFactory.createForClass(Product);
