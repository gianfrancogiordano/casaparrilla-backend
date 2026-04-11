import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PurchasesController } from './purchases.controller';
import { PurchasesService } from './purchases.service';
import { Supplier, SupplierSchema } from './schemas/supplier.schema';
import { PurchaseOrder, PurchaseOrderSchema } from './schemas/purchase-order.schema';
import { Ingredient, IngredientSchema } from '../ingredients/schemas/ingredient.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Supplier.name, schema: SupplierSchema },
      { name: PurchaseOrder.name, schema: PurchaseOrderSchema },
      { name: Ingredient.name, schema: IngredientSchema },
    ]),
  ],
  controllers: [PurchasesController],
  providers: [PurchasesService],
  exports: [PurchasesService],
})
export class PurchasesModule {}
