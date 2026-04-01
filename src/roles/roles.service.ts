import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role, RoleDocument } from './schemas/role.schema';

@Injectable()
export class RolesService {
  constructor(@InjectModel(Role.name) private readonly roleModel: Model<RoleDocument>) {}

  async create(createDto: any): Promise<Role> {
    const created = new this.roleModel(createDto);
    return created.save();
  }

  async findAll(): Promise<Role[]> {
    return this.roleModel.find().exec();
  }

  async findOne(id: string): Promise<Role> {
    const item = await this.roleModel.findById(id).exec();
    if (!item) {
      throw new NotFoundException(`Role #${id} not found`);
    }
    return item;
  }

  async update(id: string, updateDto: any): Promise<Role> {
    const existing = await this.roleModel.findByIdAndUpdate(id, updateDto, { new: true }).exec();
    if (!existing) {
      throw new NotFoundException(`Role #${id} not found`);
    }
    return existing;
  }

  async remove(id: string): Promise<Role> {
    const deleted = await this.roleModel.findByIdAndDelete(id).exec();
    if (!deleted) {
      throw new NotFoundException(`Role #${id} not found`);
    }
    return deleted;
  }
}
