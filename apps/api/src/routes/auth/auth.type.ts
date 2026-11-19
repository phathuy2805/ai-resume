import type {
  LoginResType,
  RefreshTokenResType,
  RegisterResType,
} from './auth.schema.js';

export interface SessionContext {
  userAgent?: string;
  ip?: string;
}

export type RegisterResult = {
  user: RegisterResType;
  refreshToken: string;
};

export type LoginResult = LoginResType & {
  refreshToken: string;
};

export type RefreshTokenResult = RefreshTokenResType & {
  refreshToken: string;
};
