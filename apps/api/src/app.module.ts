import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { BannerModule } from './banner/banner.module';
import { CartModule } from './cart/cart.module';
import { CatalogModule } from './catalog/catalog.module';
import { CustomerModule } from './customer/customer.module';
import { HealthController } from './health.controller';
import { LandingModule } from './landing/landing.module';
import { OrderModule } from './order/order.module';
import { PaymentModule } from './payment/payment.module';
import { PrismaModule } from './prisma/prisma.module';
import { ShippingModule } from './shipping/shipping.module';
import { VoucherModule } from './voucher/voucher.module';
import { validasiEnv } from './config/env.skema';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      // Konfigurasi yang salah menghentikan proses di sini, sebelum satu pun
      // request masuk — lihat src/config/env.skema.ts.
      validate: validasiEnv,
    }),

    /**
     * Pembatasan laju bawaan untuk seluruh endpoint.
     *
     * Penyimpanannya in-memory, jadi batasnya berlaku per instance. Untuk
     * skala sekarang itu memadai; bila API dijalankan lebih dari satu instance,
     * pindahkan ke storage Redis agar batasnya benar-benar global.
     */
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            name: 'umum',
            ttl: 60_000,
            limit: config.get<number>('RATE_LIMIT_UMUM', 300),
          },
        ],
      }),
    }),

    ScheduleModule.forRoot(), // menjalankan penutupan pesanan kedaluwarsa
    PrismaModule,
    BannerModule,
    LandingModule,
    VoucherModule,
    CartModule,
    ShippingModule,
    PaymentModule,
    AuthModule,
    CustomerModule,
    CatalogModule,
    OrderModule,
    AdminModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
