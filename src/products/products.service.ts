import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from './schemas/product.schema';

@Injectable()
export class ProductsService {
  constructor(@InjectModel(Product.name) private readonly productModel: Model<ProductDocument>) {}

  async create(createDto: any): Promise<Product> {
    const created = new this.productModel(createDto);
    return created.save();
  }

  async findAll(): Promise<Product[]> {
    return this.productModel.find().exec();
  }

  async findOne(id: string): Promise<Product> {
    const item = await this.productModel.findById(id).exec();
    if (!item) {
      throw new NotFoundException(`Product #${id} not found`);
    }
    return item;
  }

  async update(id: string, updateDto: any): Promise<Product> {
    const existing = await this.productModel.findByIdAndUpdate(id, updateDto, { new: true }).exec();
    if (!existing) {
      throw new NotFoundException(`Product #${id} not found`);
    }
    return existing;
  }

  async remove(id: string): Promise<Product> {
    const deleted = await this.productModel.findByIdAndDelete(id).exec();
    if (!deleted) {
      throw new NotFoundException(`Product #${id} not found`);
    }
    return deleted;
  }
}
