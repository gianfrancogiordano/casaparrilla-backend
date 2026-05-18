import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { BankAccount, BankAccountDocument } from './schemas/bank-account.schema';
import { BankMovement, BankMovementDocument } from './schemas/bank-movement.schema';

@Injectable()
export class BanksService {
  constructor(
    @InjectModel(BankAccount.name) private readonly accountModel: Model<BankAccountDocument>,
    @InjectModel(BankMovement.name) private readonly movementModel: Model<BankMovementDocument>,
  ) {}

  // ══════════════════════════════════════════════════════════════════════
  // CUENTAS BANCARIAS
  // ══════════════════════════════════════════════════════════════════════

  async createAccount(dto: any): Promise<BankAccount> {
    const created = new this.accountModel(dto);
    return created.save();
  }

  async findAllAccounts(): Promise<BankAccount[]> {
    return this.accountModel
      .find()
      .sort({ isActive: -1, name: 1 })
      .exec();
  }

  async findAccountById(id: string): Promise<BankAccount> {
    const account = await this.accountModel.findById(id).exec();
    if (!account) throw new NotFoundException(`Cuenta #${id} no encontrada`);
    return account;
  }

  async updateAccount(id: string, dto: any): Promise<BankAccount> {
    const existing = await this.accountModel
      .findByIdAndUpdate(id, dto, { new: true })
      .exec();
    if (!existing) throw new NotFoundException(`Cuenta #${id} no encontrada`);
    return existing;
  }

  async deleteAccount(id: string): Promise<BankAccount> {
    // Verificar que no tenga movimientos
    const movCount = await this.movementModel.countDocuments({ accountId: id }).exec();
    if (movCount > 0) {
      throw new BadRequestException(
        `No se puede eliminar: la cuenta tiene ${movCount} movimiento(s). Elimínalos primero o desactiva la cuenta.`,
      );
    }
    const deleted = await this.accountModel.findByIdAndDelete(id).exec();
    if (!deleted) throw new NotFoundException(`Cuenta #${id} no encontrada`);
    return deleted;
  }

  // ══════════════════════════════════════════════════════════════════════
  // MOVIMIENTOS
  // ══════════════════════════════════════════════════════════════════════

  async createMovement(dto: any): Promise<BankMovement> {
    // Verificar que la cuenta existe
    const account = await this.accountModel.findById(dto.accountId).exec();
    if (!account) throw new NotFoundException(`Cuenta #${dto.accountId} no encontrada`);

    const created = new this.movementModel(dto);
    const saved = await created.save();

    // Recalcular saldo
    await this.recalculateBalance(dto.accountId);

    return saved;
  }

  async findMovements(
    accountId: string,
    from?: string,
    to?: string,
    type?: string,
  ): Promise<BankMovement[]> {
    const filter: any = { accountId };

    if (type && (type === 'Ingreso' || type === 'Egreso')) {
      filter.type = type;
    }

    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(`${from}T00:00:00-04:00`);
      if (to) filter.date.$lte = new Date(`${to}T23:59:59-04:00`);
    }

    return this.movementModel
      .find(filter)
      .populate('userId', 'name')
      .sort({ date: -1, createdAt: -1 })
      .exec();
  }

  async deleteMovement(id: string): Promise<BankMovement> {
    const movement = await this.movementModel.findById(id).exec();
    if (!movement) throw new NotFoundException(`Movimiento #${id} no encontrado`);

    const accountId = movement.accountId.toString();
    await this.movementModel.findByIdAndDelete(id).exec();

    // Recalcular saldo
    await this.recalculateBalance(accountId);

    return movement;
  }

  // ══════════════════════════════════════════════════════════════════════
  // BALANCE
  // ══════════════════════════════════════════════════════════════════════

  /**
   * Recalcula el saldo de una cuenta sumando ingresos y restando egresos.
   * Se llama internamente después de crear/eliminar movimientos.
   */
  async recalculateBalance(accountId: string): Promise<void> {
    const result = await this.movementModel.aggregate([
      { $match: { accountId: new mongoose.Types.ObjectId(accountId) } },
      {
        $group: {
          _id: null,
          ingresos: { $sum: { $cond: [{ $eq: ['$type', 'Ingreso'] }, '$amount', 0] } },
          egresos: { $sum: { $cond: [{ $eq: ['$type', 'Egreso'] }, '$amount', 0] } },
        },
      },
    ]);

    const balance = result.length > 0
      ? (result[0].ingresos ?? 0) - (result[0].egresos ?? 0)
      : 0;

    await this.accountModel.findByIdAndUpdate(accountId, {
      balance: Math.round(balance * 100) / 100,
    });
  }

  // ══════════════════════════════════════════════════════════════════════
  // RESUMEN
  // ══════════════════════════════════════════════════════════════════════

  async getSummary(from?: string, to?: string): Promise<any> {
    const accounts = await this.findAllAccounts();

    // Calcular ingresos y egresos del período
    const dateFilter: any = {};
    if (from || to) {
      dateFilter.date = {};
      if (from) dateFilter.date.$gte = new Date(`${from}T00:00:00-04:00`);
      if (to) dateFilter.date.$lte = new Date(`${to}T23:59:59-04:00`);
    }

    const periodResult = await this.movementModel.aggregate([
      { $match: dateFilter.date ? { date: dateFilter.date } : {} },
      {
        $group: {
          _id: null,
          ingresos: { $sum: { $cond: [{ $eq: ['$type', 'Ingreso'] }, '$amount', 0] } },
          egresos: { $sum: { $cond: [{ $eq: ['$type', 'Egreso'] }, '$amount', 0] } },
        },
      },
    ]);

    const totalBalance = accounts
      .filter(a => a.isActive)
      .reduce((sum, a) => sum + a.balance, 0);

    return {
      accounts,
      totalBalance: Math.round(totalBalance * 100) / 100,
      totalIngresos: Math.round((periodResult[0]?.ingresos ?? 0) * 100) / 100,
      totalEgresos: Math.round((periodResult[0]?.egresos ?? 0) * 100) / 100,
      cuentasActivas: accounts.filter(a => a.isActive).length,
    };
  }

  // ══════════════════════════════════════════════════════════════════════
  // AUTO-REGISTRO DE VENTAS
  // ══════════════════════════════════════════════════════════════════════

  /**
   * Llamado automáticamente desde OrdersService.payOrder().
   * Busca la cuenta bancaria vinculada al método de pago y crea un ingreso.
   */
  async registerSaleMovement(
    orderId: string,
    orderNumber: string,
    paymentMethod: string,
    amount: number,
  ): Promise<void> {
    // Buscar cuenta vinculada a este método de pago
    const account = await this.accountModel.findOne({
      linkedPaymentMethod: paymentMethod,
      isActive: true,
    }).exec();

    if (!account) {
      console.warn(`⚠️ Bancos: No hay cuenta vinculada al método "${paymentMethod}". Movimiento no registrado.`);
      return;
    }

    // Crear movimiento de ingreso por venta
    const movement = new this.movementModel({
      accountId: account._id,
      type: 'Ingreso',
      amount,
      description: `Venta #${orderNumber}`,
      category: 'Venta',
      date: new Date(),
      orderId: new mongoose.Types.ObjectId(orderId),
    });

    await movement.save();
    await this.recalculateBalance((account as any)._id.toString());
  }

  /**
   * Registra un egreso automático en una cuenta bancaria.
   * Llamado desde ExpensesService, PurchasesService y PayrollService.
   */
  async registerEgressMovement(
    bankAccountId: string,
    description: string,
    amount: number,
    category: 'Gasto' | 'Pago Proveedor' | 'Nómina',
  ): Promise<void> {
    const account = await this.accountModel.findById(bankAccountId).exec();
    if (!account) {
      console.warn(`⚠️ Bancos: Cuenta #${bankAccountId} no encontrada. Egreso no registrado.`);
      return;
    }

    const movement = new this.movementModel({
      accountId: account._id,
      type: 'Egreso',
      amount,
      description,
      category,
      date: new Date(),
    });

    await movement.save();
    await this.recalculateBalance((account as any)._id.toString());
  }
}
