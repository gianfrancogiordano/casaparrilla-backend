import { Controller, Get, Post, Patch, Param, Body, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
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
   * Body: { phone, role, content, clientName?, type?, mediaUrl?, lat?, lng? }
   */
  @Post('messages')
  saveMessage(
    @Body() body: {
      phone: string;
      role: 'user' | 'ai' | 'human';
      content: string;
      clientName?: string;
      type?: 'text' | 'audio' | 'image' | 'location';
      mediaUrl?: string;
      lat?: number;
      lng?: number;
    },
  ) {
    return this.chatService.saveMessage(
      body.phone, body.role, body.content, body.clientName,
      body.type ?? 'text', body.mediaUrl, body.lat, body.lng,
    );
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

  /**
   * GET /chat/media-proxy?url=<meta_cdn_url>
   * Proxies media (images, audio) from Meta's CDN by adding the Bearer token
   * that the browser cannot send directly via <img src> or <audio src>.
   * The frontend uses this URL instead of the raw Meta URL.
   */
  @Get('media-proxy')
  async mediaProxy(
    @Query('url') url: string,
    @Res() res: Response,
  ) {
    if (!url || !url.startsWith('https://')) {
      return res.status(400).json({ error: 'Invalid URL' });
    }

    const META_TOKEN = process.env.META_TOKEN;
    if (!META_TOKEN) {
      return res.status(500).json({ error: 'META_TOKEN not configured' });
    }

    try {
      const metaRes = await fetch(url, {
        headers: { Authorization: `Bearer ${META_TOKEN}` },
      });

      if (!metaRes.ok) {
        return res.status(metaRes.status).json({ error: `Meta returned ${metaRes.status}` });
      }

      // Forward content-type and stream body to the browser
      const contentType = metaRes.headers.get('content-type') ?? 'application/octet-stream';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'private, max-age=3600');

      const buffer = await metaRes.arrayBuffer();
      return res.send(Buffer.from(buffer));
    } catch (err) {
      console.error('❌ media-proxy error:', err);
      return res.status(502).json({ error: 'Failed to fetch media from Meta' });
    }
  }
}
