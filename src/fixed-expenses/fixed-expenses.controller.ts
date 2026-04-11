import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { FixedExpensesService } from './fixed-expenses.service';

@Controller('fixed-expenses')
export class FixedExpensesController {
  constructor(private readonly fixedExpensesService: FixedExpensesService) {}

  @Post()
  create(@Body() dto: any) {
    return this.fixedExpensesService.create(dto);
  }

  @Get()
  findAll() {
    return this.fixedExpensesService.findAll();
  }

  @Get('active')
  findActive() {
    return this.fixedExpensesService.findActive();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.fixedExpensesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.fixedExpensesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.fixedExpensesService.remove(id);
  }
}
