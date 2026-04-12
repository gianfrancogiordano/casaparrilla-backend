import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Configuracion, ConfiguracionDocument, HorarioDia } from './schemas/configuracion.schema';
import { CreateConfiguracionDto } from './dto/create-configuracion.dto';
import { UpdateConfiguracionDto } from './dto/update-configuracion.dto';

const DIAS_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

@Injectable()
export class ConfiguracionService {
  constructor(
    @InjectModel(Configuracion.name)
    private readonly configuracionModel: Model<ConfiguracionDocument>,
  ) {}

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

  async get(): Promise<Configuracion> {
    const config = await this.configuracionModel.findOne().exec();
    if (!config) {
      throw new NotFoundException(
        'No hay configuración registrada aún. Por favor, crea una usando POST /configuracion.',
      );
    }
    return config;
  }

  async update(dto: UpdateConfiguracionDto): Promise<Configuracion> {
    const config = await this.configuracionModel.findOne().exec();
    if (!config) {
      throw new NotFoundException('No hay configuración registrada. Usa POST /configuracion primero.');
    }
    Object.assign(config, dto);
    return config.save();
  }

  // ─── Lógica de Horario ────────────────────────────────────────────────────

  /**
   * Determina si el restaurante está abierto en este momento.
   * Toda la lógica usa la hora de Venezuela (UTC-4).
   */
  isOpen(horario: HorarioDia[], activo: boolean): { isOpen: boolean; nextOpening: string | null } {
    if (!activo) {
      return { isOpen: false, nextOpening: null };
    }

    const nowVz = this.nowInCaracas();
    const dayIndex = nowVz.getDay();       // 0=Dom ... 6=Sáb
    const currentMinutes = nowVz.getHours() * 60 + nowVz.getMinutes();

    const hoy = horario[dayIndex];
    if (hoy?.activo) {
      const aperturaMin = this.hhmmToMinutes(hoy.apertura);
      const cierreMin   = this.hhmmToMinutes(hoy.cierre);
      if (currentMinutes >= aperturaMin && currentMinutes < cierreMin) {
        return { isOpen: true, nextOpening: null };
      }
    }

    // Calcular próxima apertura (hasta 7 días adelante)
    for (let offset = 1; offset <= 7; offset++) {
      const nextDay = (dayIndex + offset) % 7;
      const nextHorario = horario[nextDay];
      if (nextHorario?.activo) {
        const label = offset === 1 ? 'Mañana' : DIAS_ES[nextDay];
        const hora = this.to12h(nextHorario.apertura);
        return { isOpen: false, nextOpening: `${label} a las ${hora}` };
      }
    }

    return { isOpen: false, nextOpening: null };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private nowInCaracas(): Date {
    return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Caracas' }));
  }

  private hhmmToMinutes(hhmm: string): number {
    const [h, m] = (hhmm || '00:00').split(':').map(Number);
    return h * 60 + (m || 0);
  }

  private to12h(hhmm: string): string {
    const [h, m] = (hhmm || '00:00').split(':').map(Number);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
  }
}
