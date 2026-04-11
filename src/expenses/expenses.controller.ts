import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ExpensesService } from './expenses.service';

@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  create(@Body() createDto: any) {
    return this.expensesService.create(createDto);
  }

  @Get('summary')
  getSummary(@Query('from') from?: string, @Query('to') to?: string) {
    return this.expensesService.getSummary(from, to);
  }

  @Get()
  findAll() {
    return this.expensesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.expensesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: any) {
    return this.expensesService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.expensesService.remove(id);
  }
}
