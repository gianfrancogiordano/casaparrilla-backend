import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /** GET /chat/sessions — list all active WhatsApp conversations */
  @Get('sessions')
  getSessions() {
    return this.chatService.getSessions();
  }

  /** GET /chat/sessions/:phone/messages — message history for a session */
  @Get('sessions/:phone/messages')
  getMessages(@Param('phone') phone: string) {
    return this.chatService.getMessages(phone);
  }

  /**
   * POST /chat/messages — called by the AI agent (Valentina) to sync messages.
   * Body: { phone, role, content, clientName? }
   */
  @Post('messages')
  saveMessage(
    @Body() body: { phone: string; role: 'user' | 'ai' | 'human'; content: string; clientName?: string },
  ) {
    return this.chatService.saveMessage(body.phone, body.role, body.content, body.clientName);
  }

  /**
   * PATCH /chat/sessions/:phone/ai-mode — toggle AI on/off for a chat.
   * Body: { isAiActive: boolean }
   */
  @Patch('sessions/:phone/ai-mode')
  setAiMode(@Param('phone') phone: string, @Body() body: { isAiActive: boolean }) {
    return this.chatService.setAiMode(phone, body.isAiActive);
  }

  /**
   * GET /chat/sessions/:phone/ai-mode — query AI mode (used by Valentina to check before responding).
   */
  @Get('sessions/:phone/ai-mode')
  async getAiMode(@Param('phone') phone: string) {
    const isAiActive = await this.chatService.isAiActive(phone);
    return { phone, isAiActive };
  }

  /** PATCH /chat/sessions/:phone/read — mark session as read */
  @Patch('sessions/:phone/read')
  markRead(@Param('phone') phone: string) {
    return this.chatService.markRead(phone);
  }

  /**
   * POST /chat/sessions/:phone/send — human admin sends a message from the dashboard.
   * Body: { content: string }
   * This endpoint calls the AI agent's outbound HTTP endpoint to deliver the message.
   */
  @Post('sessions/:phone/send')
  async sendHumanMessage(
    @Param('phone') phone: string,
    @Body() body: { content: string },
  ) {
    const AGENT_URL = process.env.AGENT_URL ?? 'http://localhost:3008';

    // 1. Save to our DB
    await this.chatService.saveMessage(phone, 'human', body.content);

    // 2. Forward to the agent so it sends via WhatsApp
    try {
      await fetch(`${AGENT_URL}/v1/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: phone, message: body.content }),
      });
    } catch (e) {
      console.error('❌ Error forwarding human message to agent:', e);
    }

    return { ok: true };
  }
}
