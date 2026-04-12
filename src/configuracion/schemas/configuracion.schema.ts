import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ConfiguracionDocument = Configuracion & Document;

export enum Moneda {
  USD = 'USD',
  BS = 'BS',
  COP = 'COP',
}

// ─── Horario por día ────────────────────────────────────────────────────────
@Schema({ _id: false })
export class HorarioDia {
  @Prop({ default: false })
  activo: boolean;

  @Prop({ default: '12:00' })
  apertura: string; // HH:mm en hora Venezuela (UTC-4)

  @Prop({ default: '22:00' })
  cierre: string;
}
export const HorarioDiaSchema = SchemaFactory.createForClass(HorarioDia);

// Default: Jue(4), Vie(5), Sáb(6), Dom(0) activos 12:00-22:00
const defaultHorario = () => [
  { activo: true,  apertura: '12:00', cierre: '22:00' }, // 0 Domingo
  { activo: false, apertura: '12:00', cierre: '22:00' }, // 1 Lunes
  { activo: false, apertura: '12:00', cierre: '22:00' }, // 2 Martes
  { activo: false, apertura: '12:00', cierre: '22:00' }, // 3 Miércoles
  { activo: true,  apertura: '12:00', cierre: '22:00' }, // 4 Jueves
  { activo: true,  apertura: '12:00', cierre: '22:00' }, // 5 Viernes
  { activo: true,  apertura: '12:00', cierre: '22:00' }, // 6 Sábado
];

@Schema({ timestamps: true })
export class Configuracion {
  @Prop({ required: true, trim: true })
  nombreRestaurante: string;

  @Prop({ required: true, enum: Moneda, default: Moneda.USD })
  monedaPrincipal: Moneda;

  @Prop({ required: true, enum: Moneda, default: Moneda.USD })
  monedaDefaultTienda: Moneda;

  @Prop({ required: true, type: Number, min: 0, default: 1 })
  tasaCambioUsdBs: number;

  @Prop({ required: true, type: Number, min: 0, default: 1 })
  tasaCambioUsdCop: number;

  @Prop({ required: true, type: Number, min: 1, default: 10 })
  cantidadMesas: number;

  // ─── Horario de atención ─────────────────────────────────────────────────
  @Prop({ type: [HorarioDiaSchema], default: defaultHorario })
  horario: HorarioDia[];

  // Campos opcionales
  @Prop({ trim: true })
  direccion?: string;

  @Prop({ trim: true })
  telefono?: string;

  @Prop({ trim: true })
  logoUrl?: string;

  // ─── Datos de pago ────────────────────────────────────────────────────────
  @Prop({ trim: true })
  pagoEfectivo?: string;

  @Prop({ trim: true })
  pagoPagoMovil?: string;

  @Prop({ trim: true })
  pagoBinance?: string;

  @Prop({ trim: true })
  pagoBancolombia?: string;

  @Prop({ trim: true })
  pagoZelle?: string;

  // ─── Delivery ────────────────────────────────────────────────────────────────
  @Prop({ type: Number, default: 0, min: 0 })
  costoDelivery?: number;  // Costo de envío en USD (0 = gratis)

  @Prop({ default: true })
  activo: boolean;
}

export const ConfiguracionSchema = SchemaFactory.createForClass(Configuracion);
