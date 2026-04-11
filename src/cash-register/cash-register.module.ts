import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CashRegisterController } from './cash-register.controller';
import { CashRegisterService } from './cash-register.service';
import { CashRegister, CashRegisterSchema } from './schemas/cash-register.schema';
import { Order, OrderSchema } from '../orders/schemas/order.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CashRegister.name, schema: CashRegisterSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
  ],
  controllers: [CashRegisterController],
  providers: [CashRegisterService],
  exports: [CashRegisterService],
})
export class CashRegisterModule {}
