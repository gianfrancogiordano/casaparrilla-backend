import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Ingredient, IngredientDocument } from './schemas/ingredient.schema';

@Injectable()
export class IngredientsService {
  constructor(@InjectModel(Ingredient.name) private readonly ingredientModel: Model<IngredientDocument>) {}

  async create(createDto: any): Promise<Ingredient> {
    const created = new this.ingredientModel(createDto);
    return created.save();
  }

  async findAll(): Promise<Ingredient[]> {
    return this.ingredientModel.find().exec();
  }

  async findOne(id: string): Promise<Ingredient> {
    const item = await this.ingredientModel.findById(id).exec();
    if (!item) {
      throw new NotFoundException(`Ingredient #${id} not found`);
    }
    return item;
  }

  async update(id: string, updateDto: any): Promise<Ingredient> {
    const existing = await this.ingredientModel.findByIdAndUpdate(id, updateDto, { new: true }).exec();
    if (!existing) {
      throw new NotFoundException(`Ingredient #${id} not found`);
    }
    return existing;
  }

  async remove(id: string): Promise<Ingredient> {
    const deleted = await this.ingredientModel.findByIdAndDelete(id).exec();
    if (!deleted) {
      throw new NotFoundException(`Ingredient #${id} not found`);
    }
    return deleted;
  }
}
