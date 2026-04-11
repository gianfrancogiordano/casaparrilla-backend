import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { PayrollService } from './payroll.service';

@Controller('payroll')
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  // ─── Empleados ──────────────────────────────────────────────────────

  @Post('employees')
  createEmployee(@Body() dto: any) {
    return this.payrollService.createEmployee(dto);
  }

  @Get('employees')
  findAllEmployees() {
    return this.payrollService.findAllEmployees();
  }

  @Get('employees/active')
  findActiveEmployees() {
    return this.payrollService.findActiveEmployees();
  }

  @Get('employees/:id')
  findOneEmployee(@Param('id') id: string) {
    return this.payrollService.findOneEmployee(id);
  }

  @Patch('employees/:id')
  updateEmployee(@Param('id') id: string, @Body() dto: any) {
    return this.payrollService.updateEmployee(id, dto);
  }

  @Delete('employees/:id')
  removeEmployee(@Param('id') id: string) {
    return this.payrollService.removeEmployee(id);
  }

  // ─── Nómina ─────────────────────────────────────────────────────────

  @Get('summary')
  getSummary(@Query('from') from?: string, @Query('to') to?: string) {
    return this.payrollService.getSummary(from, to);
  }

  @Post('generate')
  generateBulk(@Body() body: { periodStart: string; periodEnd: string }) {
    return this.payrollService.generateBulk(body.periodStart, body.periodEnd);
  }

  @Post()
  createPayroll(@Body() dto: any) {
    return this.payrollService.createPayroll(dto);
  }

  @Get()
  findAllPayrolls() {
    return this.payrollService.findAllPayrolls();
  }

  @Get('employee/:employeeId')
  findByEmployee(@Param('employeeId') employeeId: string) {
    return this.payrollService.findPayrollsByEmployee(employeeId);
  }

  @Get(':id')
  findOnePayroll(@Param('id') id: string) {
    return this.payrollService.findOnePayroll(id);
  }

  @Patch(':id')
  updatePayroll(@Param('id') id: string, @Body() dto: any) {
    return this.payrollService.updatePayroll(id, dto);
  }

  @Delete(':id')
  removePayroll(@Param('id') id: string) {
    return this.payrollService.removePayroll(id);
  }

  @Post(':id/pay')
  markAsPaid(@Param('id') id: string, @Body() body: { paymentMethod: string }) {
    return this.payrollService.markAsPaid(id, body.paymentMethod);
  }
}
