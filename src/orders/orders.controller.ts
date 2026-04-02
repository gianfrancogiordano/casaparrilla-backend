import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) { }

  @Post()
  create(@Body() createDto: any) {
    return this.ordersService.create(createDto);
  }

  @Get()
  findAll() {
    return this.ordersService.findAll();
  }

  /** Obtiene la orden abierta de una mesa específica */
  @Get('mesa/:tableNumber')
  findOpenOrderByTable(@Param('tableNumber') tableNumber: string) {
    return this.ordersService.findOpenOrderByTable(tableNumber);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: any) {
    return this.ordersService.update(id, updateDto);
  }

  /** Agrega un item a una orden abierta */
  @Post(':id/items')
  addItem(@Param('id') id: string, @Body() item: any) {
    return this.ordersService.addItemToOrder(id, item);
  }

  /** Elimina un item de una orden por índice */
  @Delete(':id/items/:index')
  removeItem(@Param('id') id: string, @Param('index') index: string) {
    return this.ordersService.removeItemFromOrder(id, parseInt(index, 10));
  }

  /** Cobra y cierra la orden */
  @Post(':id/pay')
  payOrder(@Param('id') id: string, @Body() body: { paymentMethod: 'Efectivo' | 'Pago Movil' | 'Binance' | 'Bancolombia' | 'Zelle' }) {
    return this.ordersService.payOrder(id, body.paymentMethod);
  }

  /** Envía los ítems pendientes a cocina */
  @Post(':id/send-to-kitchen')
  sendToKitchen(@Param('id') id: string) {
    return this.ordersService.sendToKitchen(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ordersService.remove(id);
  }
}
