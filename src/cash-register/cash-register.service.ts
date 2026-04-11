import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CashRegister, CashRegisterDocument } from './schemas/cash-register.schema';
import { Order, OrderDocument } from '../orders/schemas/order.schema';

@Injectable()
export class CashRegisterService {
  constructor(
    @InjectModel(CashRegister.name) private readonly cashModel: Model<CashRegisterDocument>,
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
  ) {}

  /** Obtener la caja abierta actualmente */
  async getCurrent(): Promise<CashRegister | null> {
    return this.cashModel
      .findOne({ status: 'Abierta' })
      .populate('openedBy', 'name')
      .exec();
  }

  /** Abrir caja */
  async open(userId: string, initialAmount: number): Promise<CashRegister> {
    // Verificar que no haya caja abierta
    const existing = await this.cashModel.findOne({ status: 'Abierta' }).exec();
    if (existing) {
      throw new BadRequestException('Ya hay una caja abierta. Ciérrala antes de abrir una nueva.');
    }

    const cashRegister = new this.cashModel({
      openedAt: new Date(),
      initialAmount,
      openedBy: userId,
      status: 'Abierta',
    });
    return cashRegister.save();
  }

  /** Cerrar caja — calcula las ventas del período automáticamente */
  async close(id: string, userId: string, realAmount: number, notes?: string): Promise<CashRegister> {
    const cash = await this.cashModel.findById(id).exec();
    if (!cash) throw new NotFoundException('Caja no encontrada');
    if (cash.status === 'Cerrada') throw new BadRequestException('Esta caja ya está cerrada');

    // Calcular ventas del período (desde apertura hasta ahora)
    const salesSummary = await this.calculateSalesSummary(cash.openedAt, new Date());

    // Total de retiros
    const totalRetiros = cash.withdrawals.reduce((sum, w) => sum + w.amount, 0);

    // El monto esperado en efectivo es: inicial + ventas efectivo - retiros
    const expectedAmount = cash.initialAmount + salesSummary.efectivo - totalRetiros;

    cash.closedAt = new Date();
    cash.closedBy = userId as any;
    cash.status = 'Cerrada';
    cash.realAmount = realAmount;
    cash.expectedAmount = expectedAmount;
    cash.difference = realAmount - expectedAmount;
    cash.salesSummary = salesSummary;
    cash.notes = notes || '';

    return cash.save();
  }

  /** Registrar retiro de caja */
  async withdraw(id: string, amount: number, reason: string): Promise<CashRegister> {
    const cash = await this.cashModel.findById(id).exec();
    if (!cash) throw new NotFoundException('Caja no encontrada');
    if (cash.status === 'Cerrada') throw new BadRequestException('No se puede retirar de una caja cerrada');

    cash.withdrawals.push({ amount, reason, timestamp: new Date() });
    return cash.save();
  }

  /** Historial de cortes de caja */
  async getHistory(limit = 30): Promise<CashRegister[]> {
    return this.cashModel
      .find({ status: 'Cerrada' })
      .sort({ closedAt: -1 })
      .limit(limit)
      .populate('openedBy', 'name')
      .populate('closedBy', 'name')
      .exec();
  }

  /** Calcula el resumen de ventas entre dos fechas usando las órdenes pagadas */
  private async calculateSalesSummary(from: Date, to: Date) {
    const orders = await this.orderModel.find({
      status: 'Pagado',
      createdAt: { $gte: from, $lte: to },
    }).exec();

    const summary = {
      efectivo: 0,
      pagoMovil: 0,
      zelle: 0,
      binance: 0,
      bancolombia: 0,
      totalVentas: 0,
      cantidadOrdenes: orders.length,
    };

    for (const order of orders) {
      const total = order.totals?.total ?? 0;
      summary.totalVentas += total;

      const method = order.paymentInfo?.method || '';
      switch (method) {
        case 'Efectivo': summary.efectivo += total; break;
        case 'Pago Movil': summary.pagoMovil += total; break;
        case 'Zelle': summary.zelle += total; break;
        case 'Binance': summary.binance += total; break;
        case 'Bancolombia': summary.bancolombia += total; break;
      }
    }

    return summary;
  }
}
