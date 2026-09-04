import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CurrentAdmin } from './current-admin.decorator';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { BatasiPercobaanLogin } from '../common/batas-login.decorator';
import type { AdminJwtPayload } from './auth.types';

@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @BatasiPercobaanLogin()
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentAdmin() admin: AdminJwtPayload) {
    return this.auth.profil(admin.sub);
  }
}
