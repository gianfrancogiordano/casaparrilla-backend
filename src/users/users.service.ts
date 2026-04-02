import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  /** Crea un usuario nuevo hasheando la contraseña antes de persistir */
  async create(createDto: any): Promise<User> {
    const { password, ...rest } = createDto;

    if (!password) {
      throw new Error('La contraseña es obligatoria al crear un usuario');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const created = new this.userModel({ ...rest, passwordHash });
    return created.save();
  }

  /** Devuelve todos los usuarios con el rol poblado */
  async findAll(): Promise<User[]> {
    return this.userModel.find().populate('role').exec();
  }

  async findByName(name: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ name }).populate('role').exec();
  }

  async findOne(id: string): Promise<User> {
    const item = await this.userModel.findById(id).populate('role').exec();
    if (!item) {
      throw new NotFoundException(`User #${id} not found`);
    }
    return item;
  }

  /** Actualiza un usuario. Si el body incluye 'password', lo hashea automáticamente */
  async update(id: string, updateDto: any): Promise<User> {
    const { password, ...rest } = updateDto;

    const payload: any = { ...rest };

    // Si viene una nueva contraseña, la hasheamos
    if (password && password.trim() !== '') {
      payload.passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    }

    const existing = await this.userModel
      .findByIdAndUpdate(id, payload, { new: true })
      .populate('role')
      .exec();

    if (!existing) {
      throw new NotFoundException(`User #${id} not found`);
    }
    return existing;
  }

  async remove(id: string): Promise<User> {
    const deleted = await this.userModel.findByIdAndDelete(id).exec();
    if (!deleted) {
      throw new NotFoundException(`User #${id} not found`);
    }
    return deleted;
  }
}
