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
