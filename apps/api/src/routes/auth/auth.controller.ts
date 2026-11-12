import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '../../shared/constants/role.enum.js';
import {
  AuthResponseDto,
  UserProfileResponseDto,
} from './dto/auth-response.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { RegisterDto } from './dto/register.dto.js';

@ApiTags('Auth')
@ApiExtraModels(AuthResponseDto, UserProfileResponseDto)
@Controller('auth')
export class AuthController {
  @Post('register')
  @ApiOperation({ summary: 'Đăng ký tài khoản mới (HR hoặc CANDIDATE)' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Đăng ký thành công',
    type: AuthResponseDto,
  })
  async register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return {
      accessToken: 'mock_access_token_jwt',
      refreshToken: 'mock_refresh_token_jwt',
      user: {
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        email: dto.email,
        fullName: dto.fullName,
        role: dto.role,
        createdAt: new Date().toISOString(),
      },
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng nhập vào hệ thống' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Đăng nhập thành công',
    type: AuthResponseDto,
  })
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return {
      accessToken: 'mock_access_token_jwt',
      refreshToken: 'mock_refresh_token_jwt',
      user: {
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        email: dto.email,
        fullName: 'Nguyễn Văn A',
        role: Role.CANDIDATE,
        createdAt: new Date().toISOString(),
      },
    };
  }

  @Get('me')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Lấy thông tin tài khoản đang đăng nhập' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Thông tin tài khoản cá nhân',
    type: UserProfileResponseDto,
  })
  async getProfile(): Promise<UserProfileResponseDto> {
    return {
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      email: 'current_user@hireflow.com',
      fullName: 'Nguyễn Văn A',
      role: Role.CANDIDATE,
      createdAt: new Date().toISOString(),
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Làm mới Access Token bằng Refresh Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cấp token mới thành công',
    type: AuthResponseDto,
  })
  async refreshToken(@Body() dto: RefreshTokenDto): Promise<AuthResponseDto> {
    return {
      accessToken: 'mock_new_access_token_jwt',
      refreshToken: dto.refreshToken,
      user: {
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        email: 'current_user@hireflow.com',
        fullName: 'Nguyễn Văn A',
        role: Role.CANDIDATE,
        createdAt: new Date().toISOString(),
      },
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Đăng xuất khỏi hệ thống' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Đăng xuất thành công',
    schema: {
      example: {
        message: 'Đăng xuất thành công',
      },
    },
  })
  async logout(): Promise<{ message: string }> {
    return { message: 'Đăng xuất thành công' };
  }
}
