import { IsString, IsNotEmpty, IsEnum, IsNumber, IsPositive, IsOptional, IsUrl, Min, MinLength, MaxLength } from 'class-validator';
import { Moneda } from '../schemas/configuracion.schema';

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
  @IsString()
  direccion?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsUrl({}, { message: 'El logo debe ser una URL válida.' })
  logoUrl?: string;
}
