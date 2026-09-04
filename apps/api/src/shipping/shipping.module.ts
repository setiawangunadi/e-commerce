import { Global, Module } from '@nestjs/common';
import { BiteshipProvider } from './biteship.provider';
import { ShippingController } from './shipping.controller';
import { ShippingService } from './shipping.service';
import { TarifLokalProvider } from './tarif-lokal.provider';

@Global()
@Module({
  controllers: [ShippingController],
  providers: [ShippingService, BiteshipProvider, TarifLokalProvider],
  exports: [ShippingService],
})
export class ShippingModule {}
