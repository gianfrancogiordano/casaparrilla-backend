import { Module } from '@nestjs/common';
import { AgentController } from './agent.controller';
import { ConfiguracionModule } from '../configuracion/configuracion.module';

@Module({
  imports: [ConfiguracionModule],
  controllers: [AgentController],
})
export class AgentModule {}
