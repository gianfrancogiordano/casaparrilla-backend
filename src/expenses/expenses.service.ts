import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Expense, ExpenseDocument } from './schemas/expense.schema';

@Injectable()
export class ExpensesService {
  constructor(@InjectModel(Expense.name) private readonly expenseModel: Model<ExpenseDocument>) {}

  async create(createDto: any): Promise<Expense> {
    const created = new this.expenseModel(createDto);
    return created.save();
  }

  async findAll(): Promise<Expense[]> {
    return this.expenseModel.find().sort({ date: -1 }).populate('userId', 'name').exec();
  }

  async findOne(id: string): Promise<Expense> {
    const item = await this.expenseModel.findById(id).populate('userId', 'name').exec();
    if (!item) throw new NotFoundException(`Expense #${id} not found`);
    return item;
  }

  async update(id: string, updateDto: any): Promise<Expense> {
    const existing = await this.expenseModel.findByIdAndUpdate(id, updateDto, { new: true }).exec();
    if (!existing) throw new NotFoundException(`Expense #${id} not found`);
    return existing;
  }

  async remove(id: string): Promise<Expense> {
    const deleted = await this.expenseModel.findByIdAndDelete(id).exec();
    if (!deleted) throw new NotFoundException(`Expense #${id} not found`);
    return deleted;
  }

  /**
   * Resumen de gastos por período
   * @param from fecha inicio (YYYY-MM-DD)
   * @param to fecha fin (YYYY-MM-DD)
   */
  async getSummary(from?: string, to?: string): Promise<any> {
    const filter: any = {};

    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(`${from}T00:00:00-04:00`);
      if (to) filter.date.$lte = new Date(`${to}T23:59:59-04:00`);
    }

    const expenses = await this.expenseModel.find(filter).exec();

    const totalGastos = expenses.reduce((sum, e) => sum + e.amount, 0);

    // Agrupar por categoría
    const porCategoria: Record<string, number> = {};
    expenses.forEach(e => {
      porCategoria[e.category] = (porCategoria[e.category] ?? 0) + e.amount;
    });

    const categorias = Object.entries(porCategoria)
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);

    return {
      totalGastos,
      cantidad: expenses.length,
      categorias,
    };
  }
}
