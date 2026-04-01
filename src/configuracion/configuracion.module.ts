import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfiguracionController } from './configuracion.controller';
import { ConfiguracionService } from './configuracion.service';
import { Configuracion, ConfiguracionSchema } from './schemas/configuracion.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Configuracion.name, schema: ConfiguracionSchema },
    ]),
  ],
  controllers: [ConfiguracionController],
  providers: [ConfiguracionService],
  exports: [ConfiguracionService], // Exportamos para que otros módulos puedan leer la configuración
})
export class ConfiguracionModule {}
