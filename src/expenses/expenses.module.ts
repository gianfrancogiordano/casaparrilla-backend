import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';
import { Expense, ExpenseSchema } from './schemas/expense.schema';
import { BanksModule } from '../banks/banks.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Expense.name, schema: ExpenseSchema }]),
    BanksModule,
  ],
  controllers: [ExpensesController],
  providers: [ExpensesService],
  exports: [ExpensesService],
})
export class ExpensesModule {}
