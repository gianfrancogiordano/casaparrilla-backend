import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FixedExpensesController } from './fixed-expenses.controller';
import { FixedExpensesService } from './fixed-expenses.service';
import { FixedExpense, FixedExpenseSchema } from './schemas/fixed-expense.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FixedExpense.name, schema: FixedExpenseSchema },
    ]),
  ],
  controllers: [FixedExpensesController],
  providers: [FixedExpensesService],
  exports: [FixedExpensesService, MongooseModule],
})
export class FixedExpensesModule {}
