import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { BanksService } from './banks.service';

@Controller('banks')
export class BanksController {
  constructor(private readonly banksService: BanksService) {}

  // ── Cuentas ─────────────────────────────────────────────────────────

  @Get('accounts')
  findAllAccounts() {
    return this.banksService.findAllAccounts();
  }

  @Post('accounts')
  createAccount(@Body() dto: any) {
    return this.banksService.createAccount(dto);
  }

  @Patch('accounts/:id')
  updateAccount(@Param('id') id: string, @Body() dto: any) {
    return this.banksService.updateAccount(id, dto);
  }

  @Delete('accounts/:id')
  deleteAccount(@Param('id') id: string) {
    return this.banksService.deleteAccount(id);
  }

  // ── Movimientos ─────────────────────────────────────────────────────

  @Get('accounts/:id/movements')
  findMovements(
    @Param('id') accountId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('type') type?: string,
  ) {
    return this.banksService.findMovements(accountId, from, to, type);
  }

  @Post('movements')
  createMovement(@Body() dto: any) {
    return this.banksService.createMovement(dto);
  }

  @Delete('movements/:id')
  deleteMovement(@Param('id') id: string) {
    return this.banksService.deleteMovement(id);
  }

  // ── Resumen ─────────────────────────────────────────────────────────

  @Get('summary')
  getSummary(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.banksService.getSummary(from, to);
  }
}
