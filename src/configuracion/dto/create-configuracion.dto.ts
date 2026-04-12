import {
  IsString, IsNotEmpty, IsEnum, IsNumber, IsPositive, IsOptional,
  IsUrl, IsBoolean, IsArray, ValidateNested, Matches, Min, MinLength, MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Moneda } from '../schemas/configuracion.schema';

export class HorarioDiaDto {
  @IsBoolean()
  activo: boolean;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'La hora debe tener formato HH:mm (ej: 12:00)' })
  apertura: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'La hora debe tener formato HH:mm (ej: 22:00)' })
  cierre: string;
}

export class CreateConfiguracionDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre del restaurante es obligatorio.' })
  @MinLength(2)
  @MaxLength(100)
  nombreRestaurante: string;

  @IsEnum(Moneda, { message: 'La moneda principal debe ser USD, BS o COP.' })
  monedaPrincipal: Moneda;

  @IsEnum(Moneda, { message: 'La moneda por defecto de la tienda debe ser USD, BS o COP.' })
  monedaDefaultTienda: Moneda;

  @IsNumber({}, { message: 'La tasa USD→BS debe ser un número.' })
  @IsPositive({ message: 'La tasa USD→BS debe ser mayor a 0.' })
  tasaCambioUsdBs: number;

  @IsNumber({}, { message: 'La tasa USD→COP debe ser un número.' })
  @IsPositive({ message: 'La tasa USD→COP debe ser mayor a 0.' })
  tasaCambioUsdCop: number;

  @IsNumber({}, { message: 'La cantidad de mesas debe ser un número.' })
  @Min(1, { message: 'Debe haber al menos 1 mesa.' })
  cantidadMesas: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HorarioDiaDto)
  horario?: HorarioDiaDto[];

  @IsOptional()
  @IsString()
  direccion?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsUrl({}, { message: 'El logo debe ser una URL válida.' })
  logoUrl?: string;

  @IsOptional()
  @IsString()
  pagoEfectivo?: string;

  @IsOptional()
  @IsString()
  pagoPagoMovil?: string;

  @IsOptional()
  @IsString()
  pagoBinance?: string;

  @IsOptional()
  @IsString()
  pagoBancolombia?: string;

  @IsOptional()
  @IsString()
  pagoZelle?: string;
}
