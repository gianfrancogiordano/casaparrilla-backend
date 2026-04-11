import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { PurchasesService } from './purchases.service';

@Controller('purchases')
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  // ─── Proveedores ────────────────────────────────────────────────────

  @Post('suppliers')
  createSupplier(@Body() dto: any) {
    return this.purchasesService.createSupplier(dto);
  }

  @Get('suppliers')
  findAllSuppliers() {
    return this.purchasesService.findAllSuppliers();
  }

  @Get('suppliers/:id')
  findOneSupplier(@Param('id') id: string) {
    return this.purchasesService.findOneSupplier(id);
  }

  @Patch('suppliers/:id')
  updateSupplier(@Param('id') id: string, @Body() dto: any) {
    return this.purchasesService.updateSupplier(id, dto);
  }

  @Delete('suppliers/:id')
  removeSupplier(@Param('id') id: string) {
    return this.purchasesService.removeSupplier(id);
  }

  // ─── Órdenes de Compra ──────────────────────────────────────────────

  @Get('summary')
  getSummary(@Query('from') from?: string, @Query('to') to?: string) {
    return this.purchasesService.getSummary(from, to);
  }

  @Post()
  createPurchase(@Body() dto: any) {
    return this.purchasesService.createPurchase(dto);
  }

  @Get()
  findAllPurchases() {
    return this.purchasesService.findAllPurchases();
  }

  @Get(':id')
  findOnePurchase(@Param('id') id: string) {
    return this.purchasesService.findOnePurchase(id);
  }

  @Patch(':id')
  updatePurchase(@Param('id') id: string, @Body() dto: any) {
    return this.purchasesService.updatePurchase(id, dto);
  }

  @Delete(':id')
  removePurchase(@Param('id') id: string) {
    return this.purchasesService.removePurchase(id);
  }

  @Post(':id/confirm')
  confirmPurchase(@Param('id') id: string) {
    return this.purchasesService.confirmPurchase(id);
  }

  @Post(':id/cancel')
  cancelPurchase(@Param('id') id: string) {
    return this.purchasesService.cancelPurchase(id);
  }
}
