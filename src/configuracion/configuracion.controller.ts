import { Controller, Get, Post, Patch, Body, UsePipes, ValidationPipe } from '@nestjs/common';
import { ConfiguracionService } from './configuracion.service';
import { CreateConfiguracionDto } from './dto/create-configuracion.dto';
import { UpdateConfiguracionDto } from './dto/update-configuracion.dto';

@Controller('configuracion')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class ConfiguracionController {
  constructor(private readonly configuracionService: ConfiguracionService) {}

  /**
   * POST /configuracion
   * Crea la configuración inicial del restaurante (solo una vez).
   */
  @Post()
  create(@Body() dto: CreateConfiguracionDto) {
    return this.configuracionService.create(dto);
  }

  /**
   * GET /configuracion
   * Retorna la configuración actual del restaurante.
   */
  @Get()
  get() {
    return this.configuracionService.get();
  }

  /**
   * PATCH /configuracion
   * Actualiza parcialmente la configuración (tasas, mesas, nombre, etc.)
   */
  @Patch()
  update(@Body() dto: UpdateConfiguracionDto) {
    return this.configuracionService.update(dto);
  }
}
