import { Controller, Get, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('pnl')
  getPnl(@Query('from') from?: string, @Query('to') to?: string) {
    return this.reportsService.getPnl(from, to);
  }

  @Get('break-even')
  getBreakEven(@Query('from') from?: string, @Query('to') to?: string) {
    return this.reportsService.getBreakEven(from, to);
  }

  @Get('trends')
  getTrends(@Query('from') from?: string, @Query('to') to?: string) {
    return this.reportsService.getTrends(from, to);
  }

  @Get('profitability')
  getProfitability() {
    return this.reportsService.getProfitability();
  }
}
