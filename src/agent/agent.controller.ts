import { Controller, Get, Post, Patch, Body } from '@nestjs/common';
import { ConfiguracionService } from '../configuracion/configuracion.service';

/**
 * AgentController — proxy between ClickStore Dashboard and the Valentina agent.
 * Keeps the agent's internal port (3008) unexposed to the frontend.
 */
@Controller('agent')
export class AgentController {
  private readonly AGENT_URL = process.env.AGENT_URL ?? 'http://localhost:3008';

  constructor(private readonly configuracionService: ConfiguracionService) {}

  /** GET /agent/status — global AI toggle state */
  @Get('status')
  async getStatus() {
    const config = await this.configuracionService.get() as any;
    return { enabled: config.agentEnabled ?? true };
  }

  /** PATCH /agent/status — toggle global AI on/off */
  @Patch('status')
  async setStatus(@Body() body: { enabled: boolean }) {
    const config = await this.configuracionService.update({ agentEnabled: body.enabled } as any);
    return { enabled: (config as any).agentEnabled };
  }

  /** GET /agent/knowledge — fetch current knowledge base content */
  @Get('knowledge')
  async getKnowledge() {
    const res = await fetch(`${this.AGENT_URL}/v1/knowledge`);
    return res.json();
  }

  /** POST /agent/knowledge — update knowledge base + trigger RAG re-ingestion */
  @Post('knowledge')
  async updateKnowledge(@Body() body: { content: string }) {
    const res = await fetch(`${this.AGENT_URL}/v1/knowledge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: body.content }),
    });
    return res.json();
  }
}
