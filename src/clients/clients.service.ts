import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Client, ClientDocument } from './schemas/client.schema';

@Injectable()
export class ClientsService {
  constructor(@InjectModel(Client.name) private readonly clientModel: Model<ClientDocument>) {}

  async create(createDto: any): Promise<Client> {
    const created = new this.clientModel(createDto);
    return created.save();
  }

  /** Acumular o deducir puntos de fidelidad */
  async addPoints(id: string, points: number): Promise<Client> {
    const client = await this.clientModel.findById(id);
    if (!client) throw new NotFoundException(`Client #${id} not found`);

    client.loyaltyPoints = (client.loyaltyPoints || 0) + Math.floor(points);
    return client.save();
  }

  async findAll(): Promise<Client[]> {
    return this.clientModel.find().exec();
  }

  async findOne(id: string): Promise<Client> {
    const item = await this.clientModel.findById(id).exec();
    if (!item) {
      throw new NotFoundException(`Client #${id} not found`);
    }
    return item;
  }

  async findByPhone(phone: string): Promise<Client | null> {
    return this.clientModel.findOne({ phone }).exec();
  }

  async findOrCreateByPhone(phone: string, name: string): Promise<Client> {
    const existing = await this.findByPhone(phone);
    if (existing) return existing;
    return this.create({ name, phone, loyaltyPoints: 0, addresses: [] });
  }

  async update(id: string, updateDto: any): Promise<Client> {
    const existing = await this.clientModel.findByIdAndUpdate(id, updateDto, { new: true }).exec();
    if (!existing) {
      throw new NotFoundException(`Client #${id} not found`);
    }
    return existing;
  }

  async remove(id: string): Promise<Client> {
    const deleted = await this.clientModel.findByIdAndDelete(id).exec();
    if (!deleted) {
      throw new NotFoundException(`Client #${id} not found`);
    }
    return deleted;
  }
}
