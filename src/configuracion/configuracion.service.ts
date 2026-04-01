import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Configuracion, ConfiguracionDocument } from './schemas/configuracion.schema';
import { CreateConfiguracionDto } from './dto/create-configuracion.dto';
import { UpdateConfiguracionDto } from './dto/update-configuracion.dto';

@Injectable()
export class ConfiguracionService {
  constructor(
    @InjectModel(Configuracion.name)
    private readonly configuracionModel: Model<ConfiguracionDocument>,
  ) {}

  /**
   * Crea la configuracion inicial del restaurante.
   * Solo puede existir UN registro de configuracion (patrón Singleton de BD).
   */
  async create(dto: CreateConfiguracionDto): Promise<Configuracion> {
    const existing = await this.configuracionModel.findOne().exec();
    if (existing) {
      throw new BadRequestException(
        'Ya existe una configuración del restaurante. Usa el endpoint PATCH para actualizarla.',
      );
    }
    const nueva = new this.configuracionModel(dto);
    return nueva.save();
  }

  /**
   * Obtiene la configuración del restaurante (singleton).
   */
  async get(): Promise<Configuracion> {
    const config = await this.configuracionModel.findOne().exec();
    if (!config) {
      throw new NotFoundException(
        'No hay configuración registrada aún. Por favor, crea una usando POST /configuracion.',
      );
    }
    return config;
  }

  /**
   * Actualiza parcialmente la configuracion del restaurante.
   */
  async update(dto: UpdateConfiguracionDto): Promise<Configuracion> {
    const config = await this.configuracionModel.findOne().exec();
    if (!config) {
      throw new NotFoundException('No hay configuración registrada. Usa POST /configuracion primero.');
    }
    Object.assign(config, dto);
    return config.save();
  }
}
