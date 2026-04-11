import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FixedExpense, FixedExpenseDocument } from './schemas/fixed-expense.schema';

@Injectable()
export class FixedExpensesService {
  constructor(
    @InjectModel(FixedExpense.name)
    private readonly fixedExpenseModel: Model<FixedExpenseDocument>,
  ) {}

  async create(dto: any): Promise<FixedExpense> {
    return new this.fixedExpenseModel(dto).save();
  }

  async findAll(): Promise<FixedExpense[]> {
    return this.fixedExpenseModel.find().sort({ category: 1, name: 1 }).exec();
  }

  async findActive(): Promise<FixedExpense[]> {
    return this.fixedExpenseModel.find({ isActive: true }).sort({ category: 1 }).exec();
  }

  async findOne(id: string): Promise<FixedExpense> {
    const item = await this.fixedExpenseModel.findById(id).exec();
    if (!item) throw new NotFoundException(`Gasto fijo #${id} no encontrado`);
    return item;
  }

  async update(id: string, dto: any): Promise<FixedExpense> {
    const updated = await this.fixedExpenseModel
      .findByIdAndUpdate(id, dto, { new: true })
      .exec();
    if (!updated) throw new NotFoundException(`Gasto fijo #${id} no encontrado`);
    return updated;
  }

  async remove(id: string): Promise<FixedExpense> {
    const deleted = await this.fixedExpenseModel.findByIdAndDelete(id).exec();
    if (!deleted) throw new NotFoundException(`Gasto fijo #${id} no encontrado`);
    return deleted;
  }

  async getTotalFijos(): Promise<number> {
    const activos = await this.findActive();
    return activos.reduce((sum, f) => sum + f.amount, 0);
  }
}
