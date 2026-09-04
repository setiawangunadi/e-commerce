import { Global, Module } from '@nestjs/common';
import { LandingController } from './landing.controller';
import { LandingService } from './landing.service';

/** Global karena AdminController ikut memakainya untuk CRUD. */
@Global()
@Module({
  controllers: [LandingController],
  providers: [LandingService],
  exports: [LandingService],
})
export class LandingModule {}
