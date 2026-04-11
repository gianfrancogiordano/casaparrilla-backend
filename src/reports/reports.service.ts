import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { Expense, ExpenseDocument } from '../expenses/schemas/expense.schema';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { Ingredient, IngredientDocument } from '../ingredients/schemas/ingredient.schema';
import { FixedExpense, FixedExpenseDocument } from '../fixed-expenses/schemas/fixed-expense.schema';
import { PayrollRecord, PayrollRecordDocument } from '../payroll/schemas/payroll-record.schema';
import { PurchaseOrder, PurchaseOrderDocument } from '../purchases/schemas/purchase-order.schema';

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Expense.name) private readonly expenseModel: Model<ExpenseDocument>,
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    @InjectModel(Ingredient.name) private readonly ingredientModel: Model<IngredientDocument>,
    @InjectModel(FixedExpense.name) private readonly fixedExpenseModel: Model<FixedExpenseDocument>,
    @InjectModel(PayrollRecord.name) private readonly payrollModel: Model<PayrollRecordDocument>,
    @InjectModel(PurchaseOrder.name) private readonly purchaseModel: Model<PurchaseOrderDocument>,
  ) {}

  /**
   * Estado de Resultados (P&L) — Integrado con 4 fuentes de egreso
   */
  async getPnl(from?: string, to?: string) {
    const dateFilter = this.buildDateFilter(from, to);

    // ── 1. INGRESOS ─────────────────────────────────────────────────────────
    const ordenes = await this.orderModel.find({
      status: 'Pagado',
      ...(dateFilter ? { createdAt: dateFilter } : {}),
    }).exec();

    const ingresos = ordenes.reduce((sum, o) => sum + (o.totals?.total ?? 0), 0);
    const cantidadOrdenes = ordenes.length;
    const ticketPromedio = cantidadOrdenes > 0 ? ingresos / cantidadOrdenes : 0;

    // ── 2. COSTO DE VENTA (Food Cost teórico — basado en recetas) ────────────
    const costoVenta = await this.calculateFoodCostForOrders(ordenes);

    // ── 3. EGRESOS: Gastos Variables (expenses del período) ──────────────────
    const gastosVariablesDoc = await this.expenseModel.find(
      dateFilter ? { date: dateFilter } : {},
    ).exec();

    const totalVariables = gastosVariablesDoc.reduce((sum, g) => sum + g.amount, 0);

    const gastosPorCategoria: Record<string, number> = {};
    gastosVariablesDoc.forEach(g => {
      gastosPorCategoria[g.category] = (gastosPorCategoria[g.category] ?? 0) + g.amount;
    });

    // ── 4. EGRESOS: Gastos Fijos (catálogo permanente — siempre activos) ──────
    const gastosFijosDoc = await this.fixedExpenseModel.find({ isActive: true }).exec();
    const totalFijos = gastosFijosDoc.reduce((sum, f) => sum + f.amount, 0);

    // Agregar fijos al desglose por categoría
    gastosFijosDoc.forEach(f => {
      gastosPorCategoria[f.category] = (gastosPorCategoria[f.category] ?? 0) + f.amount;
    });

    // ── 5. EGRESOS: Nómina (payroll records pagados del período) ─────────────
    const nominaFilter: any = { status: 'Pagado' };
    if (dateFilter) nominaFilter.periodEnd = dateFilter;
    const nominaDoc = await this.payrollModel.find(nominaFilter).exec();
    const totalNomina = nominaDoc.reduce((sum, n) => sum + n.netPay, 0);

    // ── 6. EGRESOS: Compras a proveedores (órdenes confirmadas del período) ──
    const comprasFilter: any = { status: 'Confirmada' };
    if (dateFilter) comprasFilter.date = dateFilter;
    const comprasDoc = await this.purchaseModel.find(comprasFilter).exec();
    const totalCompras = comprasDoc.reduce((sum, c) => sum + c.total, 0);

    // ── 7. TOTALES ──────────────────────────────────────────────────────────
    const totalEgresos = totalVariables + totalFijos + totalNomina + totalCompras;

    const utilidadBruta = ingresos - costoVenta;
    const utilidadNeta  = ingresos - costoVenta - totalEgresos;

    const margenBruto = ingresos > 0 ? (utilidadBruta / ingresos) * 100 : 0;
    const margenNeto  = ingresos > 0 ? (utilidadNeta  / ingresos) * 100 : 0;
    const foodCostPct = ingresos > 0 ? (costoVenta    / ingresos) * 100 : 0;

    // Desglose por método de pago
    const ventasPorMetodo: Record<string, number> = {};
    ordenes.forEach(o => {
      const method = o.paymentInfo?.method || 'Sin definir';
      ventasPorMetodo[method] = (ventasPorMetodo[method] ?? 0) + (o.totals?.total ?? 0);
    });

    // Desglose por tipo de orden
    const ventasPorTipo: Record<string, { ingresos: number; cantidad: number }> = {};
    ordenes.forEach(o => {
      const tipo = o.orderType || 'Local';
      if (!ventasPorTipo[tipo]) ventasPorTipo[tipo] = { ingresos: 0, cantidad: 0 };
      ventasPorTipo[tipo].ingresos += o.totals?.total ?? 0;
      ventasPorTipo[tipo].cantidad += 1;
    });

    return {
      periodo: { from: from || 'Todo', to: to || 'Todo' },
      // Ingresos
      ingresos,
      cantidadOrdenes,
      ticketPromedio: Math.round(ticketPromedio * 100) / 100,
      // Food cost teórico
      costoVenta,
      foodCostPct: Math.round(foodCostPct * 100) / 100,
      // Egresos desglosados
      gastosVariables: Math.round(totalVariables * 100) / 100,
      gastosFijos:     Math.round(totalFijos    * 100) / 100,
      nominaPeriodo:   Math.round(totalNomina   * 100) / 100,
      comprasPeriodo:  Math.round(totalCompras  * 100) / 100,
      totalEgresos:    Math.round(totalEgresos  * 100) / 100,
      // Utilidades
      utilidadBruta: Math.round(utilidadBruta * 100) / 100,
      utilidadNeta:  Math.round(utilidadNeta  * 100) / 100,
      margenBruto:   Math.round(margenBruto   * 100) / 100,
      margenNeto:    Math.round(margenNeto    * 100) / 100,
      // Desgloses
      ventasPorMetodo,
      ventasPorTipo,
      gastosPorCategoria,
    };
  }

  /**
   * Punto de Equilibrio — usa costos fijos reales del catálogo + nómina
   */
  async getBreakEven(from?: string, to?: string) {
    const pnl = await this.getPnl(from, to);

    // Costos de estructura = fijos permanentes + nómina del período
    const costosFijosEstructura = pnl.gastosFijos + pnl.nominaPeriodo;

    // Costos variables = expenses variables + compras + food cost
    const costosVariablesTotales = pnl.gastosVariables + pnl.comprasPeriodo + pnl.costoVenta;

    const ratioVariable = pnl.ingresos > 0 ? costosVariablesTotales / pnl.ingresos : 0;
    const margenContribucion = 1 - ratioVariable;

    const puntoEquilibrioDolares = margenContribucion > 0
      ? costosFijosEstructura / margenContribucion
      : 0;

    const puntoEquilibrioOrdenes = pnl.ticketPromedio > 0
      ? puntoEquilibrioDolares / pnl.ticketPromedio
      : 0;

    let semaforo: 'rojo' | 'amarillo' | 'verde';
    if (pnl.ingresos < puntoEquilibrioDolares * 0.8) {
      semaforo = 'rojo';
    } else if (pnl.ingresos < puntoEquilibrioDolares) {
      semaforo = 'amarillo';
    } else {
      semaforo = 'verde';
    }

    return {
      costosFijos:              Math.round(costosFijosEstructura  * 100) / 100,
      costosVariables:          Math.round(costosVariablesTotales * 100) / 100,
      margenContribucion:       Math.round(margenContribucion * 10000) / 100,
      puntoEquilibrioDolares:   Math.round(puntoEquilibrioDolares   * 100) / 100,
      puntoEquilibrioOrdenes:   Math.ceil(puntoEquilibrioOrdenes),
      ventasActuales:           pnl.ingresos,
      diferencia:               Math.round((pnl.ingresos - puntoEquilibrioDolares) * 100) / 100,
      semaforo,
      ticketPromedio:           pnl.ticketPromedio,
    };
  }

  /**
   * Tendencias de ventas — ventas agrupadas por día
   */
  async getTrends(from?: string, to?: string) {
    const dateFilter = this.buildDateFilter(from, to);

    const ordenes = await this.orderModel.find({
      status: 'Pagado',
      ...(dateFilter ? { createdAt: dateFilter } : {}),
    }).sort({ createdAt: 1 }).exec();

    const porDia: Record<string, { ventas: number; ordenes: number }> = {};
    ordenes.forEach(o => {
      const dia = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'America/Caracas',
        year: 'numeric', month: '2-digit', day: '2-digit',
      }).format(new Date((o as any).createdAt));

      if (!porDia[dia]) porDia[dia] = { ventas: 0, ordenes: 0 };
      porDia[dia].ventas  += o.totals?.total ?? 0;
      porDia[dia].ordenes += 1;
    });

    const tendencia = Object.entries(porDia).map(([fecha, data]) => ({
      fecha,
      ventas:  Math.round(data.ventas * 100) / 100,
      ordenes: data.ordenes,
    }));

    return { tendencia };
  }

  /**
   * Rentabilidad por producto — los más rentables, no los más vendidos
   */
  async getProfitability() {
    const products    = await this.productModel.find().exec();
    const ingredients = await this.ingredientModel.find().exec();

    const ingredientCostMap: Record<string, number> = {};
    ingredients.forEach(ing => {
      ingredientCostMap[(ing as any)._id.toString()] = ing.unitCost;
    });

    const profitability = products.map(product => {
      const costRecipe = (product.recipe || []).reduce((sum, r) => {
        const ingredientCost = ingredientCostMap[r.ingredientId?.toString()] ?? 0;
        return sum + (r.quantityRequired * ingredientCost);
      }, 0);

      const sellPrice = product.sellPrice;
      const margin    = sellPrice - costRecipe;
      const marginPct = sellPrice > 0 ? (margin    / sellPrice) * 100 : 0;
      const foodCostPct = sellPrice > 0 ? (costRecipe / sellPrice) * 100 : 0;

      return {
        nombre:      product.name,
        categoria:   product.category || 'Sin categoría',
        precioVenta: sellPrice,
        costoReceta: Math.round(costRecipe  * 100) / 100,
        margen:      Math.round(margin      * 100) / 100,
        margenPct:   Math.round(marginPct   * 100) / 100,
        foodCostPct: Math.round(foodCostPct * 100) / 100,
        disponible:  product.available,
      };
    }).sort((a, b) => b.margenPct - a.margenPct);

    const totalCostos = profitability.reduce((sum, p) => sum + p.costoReceta, 0);
    const totalPrecios = profitability.reduce((sum, p) => sum + p.precioVenta, 0);
    const foodCostGlobal = totalPrecios > 0 ? (totalCostos / totalPrecios) * 100 : 0;

    return {
      productos:       profitability,
      foodCostGlobal:  Math.round(foodCostGlobal * 100) / 100,
      enRiesgo:        profitability.filter(p => p.foodCostPct > 35).length,
    };
  }

  // ── Helpers privados ─────────────────────────────────────────────────────

  private async calculateFoodCostForOrders(ordenes: any[]): Promise<number> {
    const products    = await this.productModel.find().exec();
    const ingredients = await this.ingredientModel.find().exec();

    const ingredientCostMap: Record<string, number> = {};
    ingredients.forEach(ing => {
      ingredientCostMap[(ing as any)._id.toString()] = ing.unitCost;
    });

    const productCostMap: Record<string, number> = {};
    products.forEach(product => {
      const cost = (product.recipe || []).reduce((sum, r) => {
        const ingredientCost = ingredientCostMap[r.ingredientId?.toString()] ?? 0;
        return sum + (r.quantityRequired * ingredientCost);
      }, 0);
      productCostMap[(product as any)._id.toString()] = cost;
    });

    let totalFoodCost = 0;
    ordenes.forEach(order => {
      (order.items || []).forEach((item: any) => {
        const productCost = productCostMap[item.productId?.toString()] ?? 0;
        totalFoodCost += productCost * item.quantity;
      });
    });

    return Math.round(totalFoodCost * 100) / 100;
  }

  private buildDateFilter(from?: string, to?: string) {
    if (!from && !to) return null;
    const filter: any = {};
    if (from) filter.$gte = new Date(`${from}T00:00:00-04:00`);
    if (to)   filter.$lte = new Date(`${to}T23:59:59-04:00`);
    return filter;
  }
}
