import { Global, Module } from '@nestjs/common';
import { CustomerModule } from '../customer/customer.module';
import { AdminOrdersService } from './admin-orders.service';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';

/** Global karena AdminController & dashboard ikut memakai AdminOrdersService. */
@Global()
@Module({
  imports: [CustomerModule],
  controllers: [OrderController],
  providers: [OrderService, AdminOrdersService],
  exports: [OrderService, AdminOrdersService],
})
export class OrderModule {}
