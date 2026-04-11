import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Employee, EmployeeDocument } from './schemas/employee.schema';
import { PayrollRecord, PayrollRecordDocument } from './schemas/payroll-record.schema';

@Injectable()
export class PayrollService {
  constructor(
    @InjectModel(Employee.name) private readonly employeeModel: Model<EmployeeDocument>,
    @InjectModel(PayrollRecord.name) private readonly payrollModel: Model<PayrollRecordDocument>,
  ) {}

  // ─── Empleados ──────────────────────────────────────────────────────

  async createEmployee(dto: any): Promise<Employee> {
    return new this.employeeModel(dto).save();
  }

  async findAllEmployees(): Promise<Employee[]> {
    return this.employeeModel.find().sort({ name: 1 }).populate('userId', 'name email').exec();
  }

  async findActiveEmployees(): Promise<Employee[]> {
    return this.employeeModel.find({ active: true }).sort({ name: 1 }).exec();
  }

  async findOneEmployee(id: string): Promise<Employee> {
    const item = await this.employeeModel.findById(id).populate('userId', 'name email').exec();
    if (!item) throw new NotFoundException(`Empleado #${id} no encontrado`);
    return item;
  }

  async updateEmployee(id: string, dto: any): Promise<Employee> {
    const existing = await this.employeeModel.findByIdAndUpdate(id, dto, { new: true }).exec();
    if (!existing) throw new NotFoundException(`Empleado #${id} no encontrado`);
    return existing;
  }

  async removeEmployee(id: string): Promise<Employee> {
    const deleted = await this.employeeModel.findByIdAndDelete(id).exec();
    if (!deleted) throw new NotFoundException(`Empleado #${id} no encontrado`);
    return deleted;
  }

  // ─── Nómina ─────────────────────────────────────────────────────────

  async createPayroll(dto: any): Promise<PayrollRecord> {
    // Calcular totales
    const totalBonuses = (dto.bonuses || []).reduce((s: number, b: any) => s + (b.amount || 0), 0);
    const totalDeductions = (dto.deductions || []).reduce((s: number, d: any) => s + (d.amount || 0), 0);
    dto.totalBonuses = totalBonuses;
    dto.totalDeductions = totalDeductions;
    dto.netPay = (dto.baseSalary || 0) + totalBonuses - totalDeductions;
    dto.status = 'Pendiente';
    return new this.payrollModel(dto).save();
  }

  async findAllPayrolls(): Promise<PayrollRecord[]> {
    return this.payrollModel
      .find()
      .sort({ periodEnd: -1 })
      .populate('employeeId', 'name position')
      .exec();
  }

  async findPayrollsByEmployee(employeeId: string): Promise<PayrollRecord[]> {
    return this.payrollModel
      .find({ employeeId })
      .sort({ periodEnd: -1 })
      .exec();
  }

  async findOnePayroll(id: string): Promise<PayrollRecord> {
    const item = await this.payrollModel.findById(id).populate('employeeId', 'name position').exec();
    if (!item) throw new NotFoundException(`Registro de nómina #${id} no encontrado`);
    return item;
  }

  async updatePayroll(id: string, dto: any): Promise<PayrollRecord> {
    if (dto.bonuses || dto.deductions || dto.baseSalary !== undefined) {
      const existing = await this.payrollModel.findById(id).exec();
      if (!existing) throw new NotFoundException(`Registro #${id} no encontrado`);

      const bonuses = dto.bonuses ?? existing.bonuses;
      const deductions = dto.deductions ?? existing.deductions;
      const baseSalary = dto.baseSalary ?? existing.baseSalary;

      dto.totalBonuses = bonuses.reduce((s: number, b: any) => s + (b.amount || 0), 0);
      dto.totalDeductions = deductions.reduce((s: number, d: any) => s + (d.amount || 0), 0);
      dto.netPay = baseSalary + dto.totalBonuses - dto.totalDeductions;
    }

    const updated = await this.payrollModel.findByIdAndUpdate(id, dto, { new: true }).exec();
    if (!updated) throw new NotFoundException(`Registro #${id} no encontrado`);
    return updated;
  }

  async removePayroll(id: string): Promise<PayrollRecord> {
    const deleted = await this.payrollModel.findByIdAndDelete(id).exec();
    if (!deleted) throw new NotFoundException(`Registro #${id} no encontrado`);
    return deleted;
  }

  /**
   * Marcar nómina como pagada
   */
  async markAsPaid(id: string, paymentMethod: string): Promise<PayrollRecord> {
    const record = await this.payrollModel.findById(id).exec();
    if (!record) throw new NotFoundException(`Registro #${id} no encontrado`);
    if (record.status === 'Pagado') throw new BadRequestException('Esta nómina ya fue pagada');

    record.status = 'Pagado';
    record.paidAt = new Date();
    record.paymentMethod = paymentMethod;
    return record.save();
  }

  /**
   * Generar nómina masiva para todos los empleados activos
   */
  async generateBulk(periodStart: string, periodEnd: string): Promise<PayrollRecord[]> {
    const employees = await this.employeeModel.find({ active: true }).exec();
    if (employees.length === 0) throw new BadRequestException('No hay empleados activos');

    const records: PayrollRecord[] = [];
    for (const emp of employees) {
      const record = new this.payrollModel({
        employeeId: (emp as any)._id,
        periodStart: new Date(`${periodStart}T00:00:00-04:00`),
        periodEnd: new Date(`${periodEnd}T23:59:59-04:00`),
        baseSalary: emp.baseSalary,
        bonuses: [],
        deductions: [],
        totalBonuses: 0,
        totalDeductions: 0,
        netPay: emp.baseSalary,
        status: 'Pendiente',
      });
      const saved = await record.save();
      records.push(saved);
    }

    return records;
  }

  /**
   * Resumen de nómina por período
   */
  async getSummary(from?: string, to?: string) {
    const filter: any = {};
    if (from || to) {
      filter.periodEnd = {};
      if (from) filter.periodEnd.$gte = new Date(`${from}T00:00:00-04:00`);
      if (to) filter.periodEnd.$lte = new Date(`${to}T23:59:59-04:00`);
    }

    const records = await this.payrollModel.find(filter).populate('employeeId', 'name position').exec();
    const employees = await this.employeeModel.find({ active: true }).exec();

    const totalNomina = records.reduce((sum, r) => sum + r.netPay, 0);
    const totalPagado = records.filter(r => r.status === 'Pagado').reduce((sum, r) => sum + r.netPay, 0);
    const totalPendiente = records.filter(r => r.status === 'Pendiente').reduce((sum, r) => sum + r.netPay, 0);

    // By employee
    const porEmpleado: Record<string, { nombre: string; cargo: string; total: number; registros: number }> = {};
    records.forEach(r => {
      const emp = r.employeeId as any;
      const empId = emp?._id?.toString() || 'sin-id';
      if (!porEmpleado[empId]) {
        porEmpleado[empId] = { nombre: emp?.name || 'N/A', cargo: emp?.position || '', total: 0, registros: 0 };
      }
      porEmpleado[empId].total += r.netPay;
      porEmpleado[empId].registros += 1;
    });

    const empleados = Object.values(porEmpleado).sort((a, b) => b.total - a.total);

    // Costo mensual base de toda la plantilla
    const costoMensualBase = employees.reduce((sum, e) => {
      let mensual = e.baseSalary;
      if (e.payFrequency === 'Semanal') mensual = e.baseSalary * 4;
      else if (e.payFrequency === 'Quincenal') mensual = e.baseSalary * 2;
      return sum + mensual;
    }, 0);

    return {
      totalNomina,
      totalPagado,
      totalPendiente,
      cantidadRegistros: records.length,
      cantidadEmpleados: employees.length,
      costoMensualBase: Math.round(costoMensualBase * 100) / 100,
      empleados,
    };
  }
}
