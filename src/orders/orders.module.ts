import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrdersGateway } from './orders.gateway'; // Import the new gateway
import { Order, OrderSchema } from './schemas/order.schema';
import { IngredientsModule } from '../ingredients/ingredients.module';
import { ClientsModule } from '../clients/clients.module';
import { Product, ProductSchema } from '../products/schemas/product.schema';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
    IngredientsModule,
    ClientsModule,
    NotificationsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersGateway], // Register the gateway
  exports: [OrdersService, OrdersGateway], // Export the gateway so it can be used elsewhere
})
export class OrdersModule {}
