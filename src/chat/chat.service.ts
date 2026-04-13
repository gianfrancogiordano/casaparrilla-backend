import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ChatSession, ChatSessionDocument } from './schemas/chat-session.schema';
import { ChatMessage, ChatMessageDocument } from './schemas/chat-message.schema';
import { ChatGateway } from './chat.gateway';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(ChatSession.name) private sessionModel: Model<ChatSessionDocument>,
    @InjectModel(ChatMessage.name) private messageModel: Model<ChatMessageDocument>,
    private readonly chatGateway: ChatGateway,
  ) {}

  // ─── Save an incoming or outgoing message ───────────────────────────────────
  async saveMessage(
    phone: string,
    role: 'user' | 'ai' | 'human',
    content: string,
    clientName?: string,
  ): Promise<ChatMessage> {
    // Upsert session
    const preview = content.length > 60 ? content.substring(0, 60) + '...' : content;
    const sessionUpdate: any = {
      lastMessagePreview: preview,
      lastMessageAt: new Date(),
    };
    if (clientName) sessionUpdate.clientName = clientName;
    // Increment unread only for messages coming from the client
    if (role === 'user') sessionUpdate.$inc = { unreadCount: 1 };

    const session = await this.sessionModel.findOneAndUpdate(
      { phone },
      role === 'user'
        ? { $set: { lastMessagePreview: preview, lastMessageAt: new Date(), ...(clientName ? { clientName } : {}) }, $inc: { unreadCount: 1 } }
        : { $set: sessionUpdate },
      { upsert: true, new: true },
    );

    // Save message
    const message = await this.messageModel.create({ sessionPhone: phone, role, content });

    // Emit WebSocket events
    this.chatGateway.emitNewMessage({ phone, role, content, timestamp: message['createdAt'] });
    this.chatGateway.emitSessionUpdated(session);

    return message;
  }

  // ─── Get all sessions sorted by lastMessageAt desc ─────────────────────────
  async getSessions(): Promise<ChatSession[]> {
    return this.sessionModel.find().sort({ lastMessageAt: -1 }).exec();
  }

  // ─── Get messages for a specific session ───────────────────────────────────
  async getMessages(phone: string, limit = 300): Promise<ChatMessage[]> {
    return this.messageModel
      .find({ sessionPhone: phone })
      .sort({ createdAt: 1 })
      .limit(limit)
      .exec();
  }

  // ─── Toggle AI mode for a session ──────────────────────────────────────────
  async setAiMode(phone: string, isAiActive: boolean): Promise<ChatSession> {
    const session = await this.sessionModel.findOneAndUpdate(
      { phone },
      { $set: { isAiActive } },
      { upsert: true, new: true },
    );
    this.chatGateway.emitSessionUpdated(session);
    return session;
  }

  // ─── Get AI mode for a specific phone ──────────────────────────────────────
  async isAiActive(phone: string): Promise<boolean> {
    const session = await this.sessionModel.findOne({ phone }).exec();
    // If no session exists yet, default to true (Valentina responds)
    return session ? session.isAiActive : true;
  }

  // ─── Mark all messages in a session as read ─────────────────────────────────
  async markRead(phone: string): Promise<void> {
    await this.sessionModel.findOneAndUpdate(
      { phone },
      { $set: { unreadCount: 0 } },
      { upsert: true, new: true },
    );
    // Update sidebar in real-time
    const session = await this.sessionModel.findOne({ phone });
    if (session) this.chatGateway.emitSessionUpdated(session);
  }
}
