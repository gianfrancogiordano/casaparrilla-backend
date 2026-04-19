import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ConfiguracionService } from '../configuracion/configuracion.service';

@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly configuracionService: ConfiguracionService,
  ) {}

  @Post('recalculate-prices')
  async recalculatePrices() {
    const config = await this.configuracionService.get() as any;
    const tasaBs = config.tasaCambioUsdBs || 1;
    const tasaCop = config.tasaCambioUsdCop || 1;
    const updated = await this.productsService.recalculatePrices(tasaBs, tasaCop);
    return { updated, tasaBs, tasaCop };
  }

  @Post()
  create(@Body() createDto: any) {
    return this.productsService.create(createDto);
  }

  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: any) {
    return this.productsService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
