import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { ProductsModule } from '../products/products.module';
import { OrdersModule } from '../orders/orders.module';
import { ClientsModule } from '../clients/clients.module';
import { ConfiguracionModule } from '../configuracion/configuracion.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    ProductsModule,
    OrdersModule,
    ClientsModule,
    ConfiguracionModule,
    UsersModule,
  ],
  controllers: [PublicController],
})
export class PublicModule {}
