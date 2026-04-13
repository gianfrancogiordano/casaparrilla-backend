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
   * Estado de Resultados (P&L) — Arquitectura contable correcta de 4 niveles:
   *   Ingresos
   *   − COGS (Costo de Ventas = Compras reales a proveedores del período)
   *   ════════════════════
   *   = Utilidad Bruta
   *   − Gastos Operativos (Variables + Fijos prorrateados + Nómina pagada)
   *   ════════════════════
   *   = Utilidad Neta (EBIT)
   *
   *   KPI Analítico: Food Cost Teórico % (basado en recetas — no resta utilidad)
   */
  async getPnl(from?: string, to?: string) {
    const dateFilter = this.buildDateFilter(from, to);

    // ── Calcular factor de prorrateo de gastos fijos ──────────────────────────
    // Los gastos fijos están registrados como valores MENSUALES.
    // Si el usuario filtra por N días, se aplica la proporción N/30.
    const diasPeriodo = (from && to)
      ? Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / 86400000) + 1
      : 30;
    const factorProrrateo = Math.min(diasPeriodo / 30, 1);

    // ── 1. INGRESOS ─────────────────────────────────────────────────────────
    // CORRECCIÓN: captura tanto pedidos presenciales (status='Pagado')
    // como pedidos de Delivery (paymentInfo.status='Pagado', status='Entregado')
    const ordenes = await this.orderModel.find({
      $or: [
        { status: 'Pagado' },
        { 'paymentInfo.status': 'Pagado' },
      ],
      ...(dateFilter ? { createdAt: dateFilter } : {}),
    }).exec();

    const ingresos = ordenes.reduce((sum, o) => sum + (o.totals?.total ?? 0), 0);
    const cantidadOrdenes = ordenes.length;
    const ticketPromedio = cantidadOrdenes > 0 ? ingresos / cantidadOrdenes : 0;

    // ── 2. COGS — Costo de Ventas REAL (Compras a proveedores del período) ───
    // Las compras reales representan el dinero que salió de caja para adquirir
    // la materia prima que se vendió en el período. Este es el COGS correcto.
    const comprasFilter: any = { status: 'Confirmada' };
    if (dateFilter) comprasFilter.date = dateFilter;
    const comprasDoc = await this.purchaseModel.find(comprasFilter).exec();
    const totalCompras = comprasDoc.reduce((sum, c) => sum + c.total, 0);

    // ── 3. KPI ANALÍTICO: Food Cost Teórico (basado en recetas) ─────────────
    // Este número NO entra en el cálculo de utilidades; es un indicador de
    // eficiencia de cocina que compara el costo teórico vs. el COGS real.
    const foodCostTeorico = await this.calculateFoodCostForOrders(ordenes);
    const foodCostPct = ingresos > 0 ? (foodCostTeorico / ingresos) * 100 : 0;

    // ── 4. GASTOS OPERATIVOS ─────────────────────────────────────────────────

    // 4a. Gastos Variables (expenses del período)
    const gastosVariablesDoc = await this.expenseModel.find(
      dateFilter ? { date: dateFilter } : {},
    ).exec();
    const totalVariables = gastosVariablesDoc.reduce((sum, g) => sum + g.amount, 0);

    const gastosPorCategoria: Record<string, number> = {};
    gastosVariablesDoc.forEach(g => {
      gastosPorCategoria[g.category] = (gastosPorCategoria[g.category] ?? 0) + g.amount;
    });

    // 4b. Gastos Fijos (catálogo permanente — PRORRATEADOS al período)
    // Si el período es de N días, se aplica N/30 del valor mensual registrado.
    const gastosFijosDoc = await this.fixedExpenseModel.find({ isActive: true }).exec();
    const totalFijosMensual = gastosFijosDoc.reduce((sum, f) => sum + f.amount, 0);
    const totalFijos = totalFijosMensual * factorProrrateo;

    // Agregar fijos al desglose por categoría (con prorrateo aplicado)
    gastosFijosDoc.forEach(f => {
      const montoProrrateado = f.amount * factorProrrateo;
      gastosPorCategoria[f.category] = (gastosPorCategoria[f.category] ?? 0) + montoProrrateado;
    });

    // 4c. Nómina — solo registros efectivamente PAGADOS, filtrados por la
    // fecha real en que se realizó el pago (paidAt), no por el período laboral.
    const nominaFilter: any = { status: 'Pagado' };
    if (dateFilter) nominaFilter.paidAt = dateFilter;
    const nominaDoc = await this.payrollModel.find(nominaFilter).exec();
    const totalNomina = nominaDoc.reduce((sum, n) => sum + n.netPay, 0);

    // ── 5. TOTALES (estructura de 4 niveles) ─────────────────────────────────
    const utilidadBruta = ingresos - totalCompras;
    const gastosOperativos = totalVariables + totalFijos + totalNomina;
    const utilidadNeta = utilidadBruta - gastosOperativos;

    const margenBruto = ingresos > 0 ? (utilidadBruta / ingresos) * 100 : 0;
    const margenNeto  = ingresos > 0 ? (utilidadNeta  / ingresos) * 100 : 0;
    const margenBruto_COGS = ingresos > 0 ? (totalCompras / ingresos) * 100 : 0;

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
      periodo: { from: from || 'Todo', to: to || 'Todo', diasPeriodo, factorProrrateo: Math.round(factorProrrateo * 100) },

      // ── Nivel 1: Ingresos ────────────────────────────────────────────────
      ingresos:           Math.round(ingresos           * 100) / 100,
      cantidadOrdenes,
      ticketPromedio:     Math.round(ticketPromedio      * 100) / 100,

      // ── Nivel 2: COGS ────────────────────────────────────────────────────
      costoVentas:        Math.round(totalCompras        * 100) / 100,  // COGS real
      costoVentasPct:     Math.round(margenBruto_COGS    * 100) / 100,

      // ── KPI Analítico (no entra en utilidad) ─────────────────────────────
      foodCostTeorico:    Math.round(foodCostTeorico     * 100) / 100,
      foodCostPct:        Math.round(foodCostPct         * 100) / 100,

      // ── Nivel 3: Utilidad Bruta ──────────────────────────────────────────
      utilidadBruta:      Math.round(utilidadBruta       * 100) / 100,
      margenBruto:        Math.round(margenBruto         * 100) / 100,

      // ── Gastos Operativos desglosados ────────────────────────────────────
      gastosVariables:    Math.round(totalVariables      * 100) / 100,
      gastosFijos:        Math.round(totalFijos          * 100) / 100,  // prorrateado
      gastosFijosMensual: Math.round(totalFijosMensual   * 100) / 100,  // referencia
      nominaPeriodo:      Math.round(totalNomina         * 100) / 100,
      gastosOperativos:   Math.round(gastosOperativos    * 100) / 100,

      // ── Nivel 4: Utilidad Neta ───────────────────────────────────────────
      utilidadNeta:       Math.round(utilidadNeta        * 100) / 100,
      margenNeto:         Math.round(margenNeto          * 100) / 100,

      // ── Desgloses ────────────────────────────────────────────────────────
      ventasPorMetodo,
      ventasPorTipo,
      gastosPorCategoria,
    };
  }

  /**
   * Punto de Equilibrio — usa la misma arquitectura contable del PnL corregido
   */
  async getBreakEven(from?: string, to?: string) {
    const pnl = await this.getPnl(from, to);

    // Costos Fijos de estructura = Gastos Fijos (prorrateados) + Nómina
    const costosFijosEstructura = pnl.gastosFijos + pnl.nominaPeriodo;

    // Costos Variables = Gastos Variables del período + COGS (compras)
    // Las compras son el costo variable más importante del negocio (si no vendes, no compras)
    const costosVariablesTotales = pnl.gastosVariables + pnl.costoVentas;

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
   * CORRECCIÓN: ahora incluye pedidos de Delivery pagados
   */
  async getTrends(from?: string, to?: string) {
    const dateFilter = this.buildDateFilter(from, to);

    const ordenes = await this.orderModel.find({
      $or: [
        { status: 'Pagado' },
        { 'paymentInfo.status': 'Pagado' },
      ],
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
   * Rentabilidad por producto — análisis de pricing basado en recetas actuales.
   * NOTA: Este análisis es estático (no depende del período); muestra el margen
   * teórico que debería tener cada producto según sus ingredientes actuales.
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
      nota:            'Análisis basado en precios actuales de insumos. No refleja datos históricos.',
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
