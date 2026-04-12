import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ChatSessionDocument = ChatSession & Document;

@Schema({ timestamps: true })
export class ChatSession {
  @Prop({ required: true, unique: true })
  phone: string;

  @Prop({ default: 'Cliente' })
  clientName: string;

  @Prop({ default: true })
  isAiActive: boolean;

  @Prop({ default: 0 })
  unreadCount: number;

  @Prop({ default: '' })
  lastMessagePreview: string;

  @Prop({ default: () => new Date() })
  lastMessageAt: Date;
}

export const ChatSessionSchema = SchemaFactory.createForClass(ChatSession);
