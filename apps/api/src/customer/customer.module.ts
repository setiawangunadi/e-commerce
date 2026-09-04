import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AddressService } from './address.service';
import { CustomerAuthService } from './customer-auth.service';
import { CustomerController } from './customer.controller';
import { CustomerJwtGuard, CustomerOpsionalGuard } from './customer-jwt.guard';
import { CustomerOrdersService } from './customer-orders.service';
import { LoyaltyService } from './loyalty.service';

/**
 * AuthModule diimpor demi JwtModule yang sudah terkonfigurasi — token pelanggan
 * dan admin memakai rahasia yang sama tapi dipisahkan lewat klaim `aud`.
 */
@Module({
  imports: [AuthModule],
  controllers: [CustomerController],
  providers: [
    CustomerAuthService,
    AddressService,
    LoyaltyService,
    CustomerOrdersService,
    CustomerJwtGuard,
    CustomerOpsionalGuard,
  ],
  // AuthModule ikut diekspor karena guard di atas menuntut JwtService: modul
  // yang memakai CustomerOpsionalGuard (mis. OrderModule) harus ikut mendapat
  // plumbing JWT-nya, bukan disuruh mengimpor AuthModule sendiri.
  exports: [
    AuthModule,
    LoyaltyService,
    AddressService,
    CustomerJwtGuard,
    CustomerOpsionalGuard,
  ],
})
export class CustomerModule {}
