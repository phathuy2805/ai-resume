import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import type { CookieOptions, Request, Response } from 'express';
import envConfig from '../../shared/config/env.config.js';
import { REFRESH_COOKIE_NAME, REFRESH_COOKIE_PATH } from '../../shared/constants/auth.constant.js';
import { ClientIp } from '../../shared/decorators/client-ip.decorator.js';
import { CurrentUser } from '../../shared/decorators/current-user.decorator.js';
import { Public } from '../../shared/decorators/public.decorator.js';
import { UserAgent } from '../../shared/decorators/user-agent.decorator.js';
import { getRefreshTokenExpiresInMs } from '../../shared/utils/time.util.js';
import {
  ApiAuthController,
  ApiGetProfileDoc,
  ApiLoginDoc,
  ApiLogoutDoc,
  ApiRefreshTokenDoc,
  ApiRegisterDoc,
} from './auth.docs.js';
import {
  GetProfileResDto,
  LoginBodyDto,
  LoginResDto,
  LogoutResDto,
  RefreshTokenBodyDto,
  RefreshTokenResDto,
  RegisterBodyDto,
  RegisterResDto,
} from './auth.dto.js';
import { AuthService } from './auth.service.js';

@ApiAuthController()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiRegisterDoc()
  async register(
    @Body() body: RegisterBodyDto,
    // passthrough: true cho phép gắn cookie qua res
    // nhưng vẫn để NestJS tự xử lý giá trị return
    @Res({ passthrough: true }) res: Response,
    @UserAgent() userAgent?: string,
    @ClientIp() ip?: string,
  ): Promise<RegisterResDto> {
    const result = await this.authService.register(body, {
      userAgent,
      ip,
    });
    this.setRefreshCookie(res, result.refreshToken);
    return result.user;
  }

  @Public()
  @Post('login')
  @ApiLoginDoc()
  async login(
    @Body() body: LoginBodyDto,
    @Res({ passthrough: true }) res: Response,
    @UserAgent() userAgent?: string,
    @ClientIp() ip?: string,
  ): Promise<LoginResDto> {
    const { refreshToken, ...response } = await this.authService.login(body, {
      userAgent,
      ip,
    });
    this.setRefreshCookie(res, refreshToken);
    return response;
  }

  @Get('me')
  @ApiGetProfileDoc()
  async getProfile(@CurrentUser('id') userId: string): Promise<GetProfileResDto> {
    return this.authService.getProfile(userId);
  }

  @Public()
  @Post('refresh')
  @ApiRefreshTokenDoc()
  async refreshToken(
    @Body() body: RefreshTokenBodyDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @UserAgent() userAgent?: string,
    @ClientIp() ip?: string,
  ): Promise<RefreshTokenResDto> {
    const rawRefreshToken = this.extractRefreshToken(req, body);
    const { refreshToken, ...response } = await this.authService.refreshTokens(rawRefreshToken, {
      userAgent,
      ip,
    });
    this.setRefreshCookie(res, refreshToken);
    return response;
  }

  @Public()
  @Post('logout')
  @ApiLogoutDoc()
  async logout(
    @Body() body: RefreshTokenBodyDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LogoutResDto> {
    const rawRefreshToken = this.extractRefreshToken(req, body);
    const result = await this.authService.logout(rawRefreshToken);
    res.clearCookie(REFRESH_COOKIE_NAME, this.getRefreshCookieBaseOptions());
    return result;
  }

  //Utility
  private extractRefreshToken(req: Request, body?: RefreshTokenBodyDto): string | undefined {
    const cookies = req.cookies as Record<string, string | undefined> | undefined;
    return cookies?.[REFRESH_COOKIE_NAME] ?? body?.refreshToken;
  }

  private setRefreshCookie(res: Response, refreshToken: string): void {
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
      ...this.getRefreshCookieBaseOptions(),
      maxAge: getRefreshTokenExpiresInMs(),
    });
  }

  private getRefreshCookieBaseOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: envConfig.COOKIE_SECURE,
      sameSite: 'lax',
      path: REFRESH_COOKIE_PATH,
    };
  }
}
