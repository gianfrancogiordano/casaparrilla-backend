import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';
import { Employee, EmployeeSchema } from './schemas/employee.schema';
import { PayrollRecord, PayrollRecordSchema } from './schemas/payroll-record.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Employee.name, schema: EmployeeSchema },
      { name: PayrollRecord.name, schema: PayrollRecordSchema },
    ]),
  ],
  controllers: [PayrollController],
  providers: [PayrollService],
  exports: [PayrollService],
})
export class PayrollModule {}
