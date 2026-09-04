import { Controller, Get, Param } from '@nestjs/common';
import { LandingService } from './landing.service';

/** Endpoint publik landing page kampanye — tanpa autentikasi. */
@Controller({ path: 'landing', version: '1' })
export class LandingController {
  constructor(private readonly landing: LandingService) {}

  @Get(':slug')
  tayang(@Param('slug') slug: string) {
    return this.landing.tayang(slug);
  }
}
