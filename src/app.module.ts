import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RolesModule } from './roles/roles.module';
import { UsersModule } from './users/users.module';
import { ClientsModule } from './clients/clients.module';
import { IngredientsModule } from './ingredients/ingredients.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { AuthModule } from './auth/auth.module';
import { ConfiguracionModule } from './configuracion/configuracion.module';
import { PublicModule } from './public/public.module';
import { ExpensesModule } from './expenses/expenses.module';
import { CashRegisterModule } from './cash-register/cash-register.module';
import { ReportsModule } from './reports/reports.module';
import { PurchasesModule } from './purchases/purchases.module';
import { PayrollModule } from './payroll/payroll.module';
import { FixedExpensesModule } from './fixed-expenses/fixed-expenses.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    RolesModule,
    UsersModule,
    ClientsModule,
    IngredientsModule,
    ProductsModule,
    OrdersModule,
    AuthModule,
    ConfiguracionModule,
    PublicModule,
    ExpensesModule,
    CashRegisterModule,
    ReportsModule,
    PurchasesModule,
    PayrollModule,
    FixedExpensesModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
