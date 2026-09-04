import { Global, Module } from '@nestjs/common';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';

/** Global karena OrderModule ikut memakainya saat mengubah keranjang jadi pesanan. */
@Global()
@Module({
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
