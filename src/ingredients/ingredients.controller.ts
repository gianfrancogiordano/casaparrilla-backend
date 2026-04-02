import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { IngredientsService } from './ingredients.service';

@Controller('ingredients')
export class IngredientsController {
  constructor(private readonly ingredientsService: IngredientsService) {}

  @Post()
  create(@Body() createDto: any) {
    return this.ingredientsService.create(createDto);
  }

  @Get('low-stock')
  getLowStock() {
    return this.ingredientsService.getLowStock();
  }

  @Post(':id/adjust-stock')
  adjustStock(@Param('id') id: string, @Body('delta') delta: number) {
    return this.ingredientsService.adjustStock(id, delta);
  }

  @Get()
  findAll() {
    return this.ingredientsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ingredientsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: any) {
    return this.ingredientsService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ingredientsService.remove(id);
  }
}
