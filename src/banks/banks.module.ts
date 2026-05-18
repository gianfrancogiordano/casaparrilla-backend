import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BanksController } from './banks.controller';
import { BanksService } from './banks.service';
import { BankAccount, BankAccountSchema } from './schemas/bank-account.schema';
import { BankMovement, BankMovementSchema } from './schemas/bank-movement.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BankAccount.name, schema: BankAccountSchema },
      { name: BankMovement.name, schema: BankMovementSchema },
    ]),
  ],
  controllers: [BanksController],
  providers: [BanksService],
  exports: [BanksService],
})
export class BanksModule {}
