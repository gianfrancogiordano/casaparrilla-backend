import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { Expense, ExpenseSchema } from '../expenses/schemas/expense.schema';
import { Product, ProductSchema } from '../products/schemas/product.schema';
import { Ingredient, IngredientSchema } from '../ingredients/schemas/ingredient.schema';
import { FixedExpense, FixedExpenseSchema } from '../fixed-expenses/schemas/fixed-expense.schema';
import { PayrollRecord, PayrollRecordSchema } from '../payroll/schemas/payroll-record.schema';
import { PurchaseOrder, PurchaseOrderSchema } from '../purchases/schemas/purchase-order.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Expense.name, schema: ExpenseSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Ingredient.name, schema: IngredientSchema },
      { name: FixedExpense.name, schema: FixedExpenseSchema },
      { name: PayrollRecord.name, schema: PayrollRecordSchema },
      { name: PurchaseOrder.name, schema: PurchaseOrderSchema },
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
