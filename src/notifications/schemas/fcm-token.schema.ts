import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type FcmTokenDocument = FcmToken & Document;

@Schema({ timestamps: true })
export class FcmToken {
  @Prop({ required: true })
  token: string;

  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  userName: string;

  @Prop({ required: true })
  role: string; // 'Administrador' | 'Mesero'
}

export const FcmTokenSchema = SchemaFactory.createForClass(FcmToken);

// Un token es único por dispositivo — evitar duplicados
FcmTokenSchema.index({ token: 1 }, { unique: true });
