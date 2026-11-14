import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import type { CookieOptions, Request, Response } from 'express';
import envConfig from '../../shared/config/env.config.js';
import { CurrentUser } from '../../shared/decorators/current-user.decorator.js';
import { Public } from '../../shared/decorators/public.decorator.js';
import { REFRESH_COOKIE_NAME, REFRESH_COOKIE_PATH } from './auth.constant.js';
import {
  ApiAuthController,
  ApiGetProfileDoc,
  ApiLoginDoc,
  ApiLogoutDoc,
  ApiRefreshTokenDoc,
  ApiRegisterDoc,
} from './auth.docs.js';
import {
  AuthResponseDto,
  LoginDto,
  LogoutResponseDto,
  RefreshTokenDto,
  RegisterDto,
  UserProfileResponseDto,
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
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserProfileResponseDto> {
    const result = await this.authService.register(
      dto,
      req.headers['user-agent'],
    );
    this.setRefreshCookie(res, result.refreshToken);
    return result.user;
  }

  @Public()
  @Post('login')
  @ApiLoginDoc()
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const { refreshToken, ...response } = await this.authService.login(
      dto,
      req.headers['user-agent'],
    );
    this.setRefreshCookie(res, refreshToken);
    return response;
  }

  @Get('me')
  @ApiGetProfileDoc()
  async getProfile(
    @CurrentUser('id') userId: string,
  ): Promise<UserProfileResponseDto> {
    return this.authService.getProfile(userId);
  }

  @Public()
  @Post('refresh')
  @ApiRefreshTokenDoc()
  async refreshToken(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const rawRefreshToken = this.extractRefreshToken(req, dto);
    const { refreshToken, ...response } = await this.authService.refreshTokens(
      rawRefreshToken,
      req.headers['user-agent'],
    );
    this.setRefreshCookie(res, refreshToken);
    return response;
  }

  @Public()
  @Post('logout')
  @ApiLogoutDoc()
  async logout(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LogoutResponseDto> {
    const rawRefreshToken = this.extractRefreshToken(req, dto);
    const result = await this.authService.logout(rawRefreshToken);
    res.clearCookie(REFRESH_COOKIE_NAME, this.getRefreshCookieBaseOptions());
    return result;
  }

  private extractRefreshToken(
    req: Request,
    dto?: RefreshTokenDto,
  ): string | undefined {
    const cookies = req.cookies as
      Record<string, string | undefined> | undefined;
    return cookies?.[REFRESH_COOKIE_NAME] ?? dto?.refreshToken;
  }

  private setRefreshCookie(res: Response, refreshToken: string): void {
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
      ...this.getRefreshCookieBaseOptions(),
      maxAge: this.authService.getRefreshCookieMaxAgeMs(),
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
