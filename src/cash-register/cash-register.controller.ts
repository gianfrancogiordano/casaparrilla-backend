import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { CashRegisterService } from './cash-register.service';

@Controller('cash-register')
export class CashRegisterController {
  constructor(private readonly cashRegisterService: CashRegisterService) {}

  @Get('current')
  getCurrent() {
    return this.cashRegisterService.getCurrent();
  }

  @Get('history')
  getHistory(@Query('limit') limit?: string) {
    return this.cashRegisterService.getHistory(limit ? parseInt(limit, 10) : 30);
  }

  @Post('open')
  open(@Body() body: { userId: string; initialAmount: number }) {
    return this.cashRegisterService.open(body.userId, body.initialAmount);
  }

  @Post(':id/close')
  close(
    @Param('id') id: string,
    @Body() body: { userId: string; realAmount: number; notes?: string },
  ) {
    return this.cashRegisterService.close(id, body.userId, body.realAmount, body.notes);
  }

  @Post(':id/withdraw')
  withdraw(
    @Param('id') id: string,
    @Body() body: { amount: number; reason: string },
  ) {
    return this.cashRegisterService.withdraw(id, body.amount, body.reason);
  }
}
