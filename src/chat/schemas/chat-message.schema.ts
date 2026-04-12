import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ChatMessageDocument = ChatMessage & Document;

@Schema({ timestamps: true })
export class ChatMessage {
  @Prop({ required: true })
  sessionPhone: string;

  /** 'user' = cliente, 'ai' = Valentina, 'human' = admin interviniendo */
  @Prop({ required: true, enum: ['user', 'ai', 'human'] })
  role: 'user' | 'ai' | 'human';

  @Prop({ required: true })
  content: string;

  @Prop({ default: 'text', enum: ['text', 'audio', 'image'] })
  type: 'text' | 'audio' | 'image';

  /**
   * TTL index: MongoDB eliminará automáticamente los documentos
   * 30 días después de su creación (2592000 segundos).
   */
  @Prop({ default: () => new Date(), expires: 2592000 })
  createdAt: Date;
}

export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessage);

// Índice para recuperar mensajes de una sesión ordenados por fecha
ChatMessageSchema.index({ sessionPhone: 1, createdAt: 1 });
