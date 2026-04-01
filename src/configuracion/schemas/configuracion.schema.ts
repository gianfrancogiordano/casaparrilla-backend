import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ConfiguracionDocument = Configuracion & Document;

export enum Moneda {
  USD = 'USD',
  BS = 'BS',
  COP = 'COP',
}

@Schema({ timestamps: true })
export class Configuracion {
  @Prop({ required: true, trim: true })
  nombreRestaurante: string;

  @Prop({ required: true, enum: Moneda, default: Moneda.USD })
  monedaPrincipal: Moneda;

  @Prop({ required: true, type: Number, min: 0, default: 1 })
  tasaCambioUsdBs: number; // Cuántos Bs equivale 1 USD

  @Prop({ required: true, type: Number, min: 0, default: 1 })
  tasaCambioUsdCop: number; // Cuántos COP equivale 1 USD

  @Prop({ required: true, type: Number, min: 1, default: 10 })
  cantidadMesas: number;

  // Campos opcionales para futuras expansiones
  @Prop({ trim: true })
  direccion?: string;

  @Prop({ trim: true })
  telefono?: string;

  @Prop({ trim: true })
  logoUrl?: string;

  @Prop({ default: true })
  activo: boolean;
}

export const ConfiguracionSchema = SchemaFactory.createForClass(Configuracion);
