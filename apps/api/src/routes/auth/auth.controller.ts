import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
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
  ApiChangePasswordDoc,
  ApiDeleteAvatarDoc,
  ApiForgotPasswordDoc,
  ApiGetProfileDoc,
  ApiLoginDoc,
  ApiLogoutDoc,
  ApiRefreshTokenDoc,
  ApiRegisterDoc,
  ApiResetPasswordDoc,
  ApiUpdateProfileDoc,
  ApiUploadAvatarDoc,
} from './auth.docs.js';
import {
  ChangePasswordBodyDto,
  ForgotPasswordBodyDto,
  GetProfileResDto,
  LoginBodyDto,
  LoginResDto,
  LogoutResDto,
  MessageResDto,
  RefreshTokenBodyDto,
  RefreshTokenResDto,
  RegisterBodyDto,
  RegisterResDto,
  ResetPasswordBodyDto,
  UpdateProfileBodyDto,
  UpdateProfileResDto,
} from './auth.dto.js';
import { AuthService } from './auth.service.js';
import { AvatarUploadInterceptor } from './avatar-upload.interceptor.js';

@ApiAuthController()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiRegisterDoc()
  async register(
    @Body() body: RegisterBodyDto,
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

  @Patch('me')
  @ApiUpdateProfileDoc()
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() body: UpdateProfileBodyDto,
  ): Promise<UpdateProfileResDto> {
    return this.authService.updateProfile(userId, body);
  }

  @Post('me/avatar')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(AvatarUploadInterceptor)
  @ApiUploadAvatarDoc()
  async uploadAvatar(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<UpdateProfileResDto> {
    return this.authService.updateAvatar(userId, file);
  }

  @Delete('me/avatar')
  @ApiDeleteAvatarDoc()
  async deleteAvatar(@CurrentUser('id') userId: string): Promise<UpdateProfileResDto> {
    return this.authService.deleteAvatar(userId);
  }

  @Patch('change-password')
  @ApiChangePasswordDoc()
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() body: ChangePasswordBodyDto,
    @Res({ passthrough: true }) res: Response,
    @UserAgent() userAgent?: string,
    @ClientIp() ip?: string,
  ): Promise<MessageResDto> {
    const { message, refreshToken } = await this.authService.changePassword(userId, body, {
      userAgent,
      ip,
    });
    this.setRefreshCookie(res, refreshToken);
    return { message };
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiForgotPasswordDoc()
  async forgotPassword(@Body() body: ForgotPasswordBodyDto): Promise<MessageResDto> {
    return this.authService.forgotPassword(body);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiResetPasswordDoc()
  async resetPassword(
    @Body() body: ResetPasswordBodyDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<MessageResDto> {
    const result = await this.authService.resetPassword(body);
    res.clearCookie(REFRESH_COOKIE_NAME, this.getRefreshCookieBaseOptions());
    return result;
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
