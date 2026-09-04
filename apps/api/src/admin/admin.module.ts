import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CustomerModule } from '../customer/customer.module';
import { AdminBrandsService } from './admin-brands.service';
import { AdminCategoriesService } from './admin-categories.service';
import { AdminCustomersService } from './admin-customers.service';
import { AdminController } from './admin.controller';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminProductsService } from './admin-products.service';
import { UploadService } from './upload.service';

@Module({
  imports: [AuthModule, CustomerModule],
  controllers: [AdminController],
  providers: [
    AdminDashboardService,
    AdminProductsService,
    AdminCategoriesService,
    AdminBrandsService,
    AdminCustomersService,
    UploadService,
  ],
})
export class AdminModule {}
