import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Supplier, SupplierDocument } from './schemas/supplier.schema';
import { PurchaseOrder, PurchaseOrderDocument } from './schemas/purchase-order.schema';
import { Ingredient, IngredientDocument } from '../ingredients/schemas/ingredient.schema';

@Injectable()
export class PurchasesService {
  constructor(
    @InjectModel(Supplier.name) private readonly supplierModel: Model<SupplierDocument>,
    @InjectModel(PurchaseOrder.name) private readonly purchaseModel: Model<PurchaseOrderDocument>,
    @InjectModel(Ingredient.name) private readonly ingredientModel: Model<IngredientDocument>,
  ) {}

  // ─── Proveedores ────────────────────────────────────────────────────

  async createSupplier(dto: any): Promise<Supplier> {
    return new this.supplierModel(dto).save();
  }

  async findAllSuppliers(): Promise<Supplier[]> {
    return this.supplierModel.find().sort({ name: 1 }).exec();
  }

  async findOneSupplier(id: string): Promise<Supplier> {
    const item = await this.supplierModel.findById(id).exec();
    if (!item) throw new NotFoundException(`Proveedor #${id} no encontrado`);
    return item;
  }

  async updateSupplier(id: string, dto: any): Promise<Supplier> {
    const existing = await this.supplierModel.findByIdAndUpdate(id, dto, { new: true }).exec();
    if (!existing) throw new NotFoundException(`Proveedor #${id} no encontrado`);
    return existing;
  }

  async removeSupplier(id: string): Promise<Supplier> {
    const deleted = await this.supplierModel.findByIdAndDelete(id).exec();
    if (!deleted) throw new NotFoundException(`Proveedor #${id} no encontrado`);
    return deleted;
  }

  // ─── Órdenes de Compra ──────────────────────────────────────────────

  async createPurchase(dto: any): Promise<PurchaseOrder> {
    // Calcular subtotales y total
    if (dto.items) {
      dto.items = dto.items.map((item: any) => ({
        ...item,
        subtotal: item.quantity * item.unitCost,
      }));
      dto.total = dto.items.reduce((sum: number, item: any) => sum + item.subtotal, 0);
    }
    dto.status = 'Pendiente';
    return new this.purchaseModel(dto).save();
  }

  async findAllPurchases(): Promise<PurchaseOrder[]> {
    return this.purchaseModel
      .find()
      .sort({ date: -1 })
      .populate('supplierId', 'name phone')
      .populate('createdBy', 'name')
      .exec();
  }

  async findOnePurchase(id: string): Promise<PurchaseOrder> {
    const item = await this.purchaseModel
      .findById(id)
      .populate('supplierId', 'name phone')
      .populate('createdBy', 'name')
      .exec();
    if (!item) throw new NotFoundException(`Orden de compra #${id} no encontrada`);
    return item;
  }

  async updatePurchase(id: string, dto: any): Promise<PurchaseOrder> {
    // Recalcular si hay items
    if (dto.items) {
      dto.items = dto.items.map((item: any) => ({
        ...item,
        subtotal: item.quantity * item.unitCost,
      }));
      dto.total = dto.items.reduce((sum: number, item: any) => sum + item.subtotal, 0);
    }
    const existing = await this.purchaseModel.findByIdAndUpdate(id, dto, { new: true }).exec();
    if (!existing) throw new NotFoundException(`Orden de compra #${id} no encontrada`);
    return existing;
  }

  async removePurchase(id: string): Promise<PurchaseOrder> {
    const deleted = await this.purchaseModel.findByIdAndDelete(id).exec();
    if (!deleted) throw new NotFoundException(`Orden de compra #${id} no encontrada`);
    return deleted;
  }

  /**
   * Confirmar compra: actualiza stock e ingrediente unitCost
   */
  async confirmPurchase(id: string): Promise<PurchaseOrder> {
    const purchase = await this.purchaseModel.findById(id).exec();
    if (!purchase) throw new NotFoundException(`Orden de compra #${id} no encontrada`);
    if (purchase.status === 'Confirmada') throw new BadRequestException('Esta compra ya fue confirmada');
    if (purchase.status === 'Cancelada') throw new BadRequestException('No se puede confirmar una compra cancelada');

    // Actualizar stock y costo unitario de cada ingrediente
    for (const item of purchase.items) {
      const ingredient = await this.ingredientModel.findById(item.ingredientId).exec();
      if (ingredient) {
        ingredient.currentStock += item.quantity;
        ingredient.unitCost = item.unitCost; // Actualizar al último costo
        await ingredient.save();
      }
    }

    purchase.status = 'Confirmada';
    return purchase.save();
  }

  /**
   * Cancelar compra
   */
  async cancelPurchase(id: string): Promise<PurchaseOrder> {
    const purchase = await this.purchaseModel.findById(id).exec();
    if (!purchase) throw new NotFoundException(`Orden de compra #${id} no encontrada`);
    if (purchase.status === 'Confirmada') throw new BadRequestException('No se puede cancelar una compra ya confirmada');

    purchase.status = 'Cancelada';
    return purchase.save();
  }

  /**
   * Resumen de compras por período
   */
  async getSummary(from?: string, to?: string) {
    const filter: any = { status: 'Confirmada' };
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(`${from}T00:00:00-04:00`);
      if (to) filter.date.$lte = new Date(`${to}T23:59:59-04:00`);
    }

    const purchases = await this.purchaseModel.find(filter).populate('supplierId', 'name').exec();

    const totalCompras = purchases.reduce((sum, p) => sum + p.total, 0);

    // Agrupar por proveedor
    const porProveedor: Record<string, { nombre: string; total: number; cantidad: number }> = {};
    purchases.forEach(p => {
      const suppId = (p.supplierId as any)?._id?.toString() || 'sin-proveedor';
      const suppName = (p.supplierId as any)?.name || 'Sin proveedor';
      if (!porProveedor[suppId]) porProveedor[suppId] = { nombre: suppName, total: 0, cantidad: 0 };
      porProveedor[suppId].total += p.total;
      porProveedor[suppId].cantidad += 1;
    });

    const proveedores = Object.values(porProveedor).sort((a, b) => b.total - a.total);

    // Agrupar por ingrediente
    const porIngrediente: Record<string, { nombre: string; total: number; cantidadComprada: number; unidad: string }> = {};
    purchases.forEach(p => {
      p.items.forEach(item => {
        const ingId = item.ingredientId?.toString() || item.ingredientName;
        if (!porIngrediente[ingId]) {
          porIngrediente[ingId] = { nombre: item.ingredientName, total: 0, cantidadComprada: 0, unidad: item.unitMeasure };
        }
        porIngrediente[ingId].total += item.subtotal;
        porIngrediente[ingId].cantidadComprada += item.quantity;
      });
    });

    const ingredientes = Object.values(porIngrediente).sort((a, b) => b.total - a.total);

    return {
      totalCompras,
      cantidadOrdenes: purchases.length,
      proveedores,
      ingredientes,
    };
  }
}
