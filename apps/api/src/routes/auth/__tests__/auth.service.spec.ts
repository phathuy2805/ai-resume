import { BadRequestException } from '@nestjs/common';
import { hash } from 'bcryptjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Role } from '../../../shared/constants/auth.constant.js';
import { AVATAR_URL_EXPIRES_SEC } from '../../../shared/constants/storage.constant.js';
import type {
  SafeUser,
  SharedUserRepository,
} from '../../../shared/repositories/shared-user.repository.js';
import type { MailService } from '../../../shared/notification/mail.service.js';
import type { StorageService } from '../../../shared/services/storage.service.js';
import type { TokenService } from '../../../shared/services/token.service.js';
import { hashToken } from '../../../shared/utils/crypto.util.js';
import { AuthErrorCode } from '../auth.error.js';
import type { AuthRepository } from '../auth.repository.js';
import { AuthService } from '../auth.service.js';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const PNG_BUFFER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);

function makeSafeUser(overrides: Partial<SafeUser> = {}): SafeUser {
  const now = new Date('2026-11-28T01:00:00.000Z');
  return {
    id: USER_ID,
    email: 'user@hireflow.vn',
    fullName: 'Nguyễn Văn A',
    phone: '0901234567',
    bio: 'Backend developer',
    avatarS3Key: null,
    role: Role.CANDIDATE,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('AuthService (Account Management)', () => {
  let sharedUserRepo: {
    findByEmail: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    findByIdWithPassword: ReturnType<typeof vi.fn>;
    createUser: ReturnType<typeof vi.fn>;
    updateProfile: ReturnType<typeof vi.fn>;
    updateAvatarKey: ReturnType<typeof vi.fn>;
  };
  let authRepo: {
    createRefreshToken: ReturnType<typeof vi.fn>;
    findByTokenHash: ReturnType<typeof vi.fn>;
    revokeAllUserTokens: ReturnType<typeof vi.fn>;
    rotateRefreshToken: ReturnType<typeof vi.fn>;
    revokeByTokenHash: ReturnType<typeof vi.fn>;
    replacePasswordAndRotateSession: ReturnType<typeof vi.fn>;
    replacePasswordResetOtp: ReturnType<typeof vi.fn>;
    findLatestActivePasswordResetOtp: ReturnType<typeof vi.fn>;
    incrementOtpAttempt: ReturnType<typeof vi.fn>;
    consumeOtpAndResetPassword: ReturnType<typeof vi.fn>;
  };
  let tokenService: {
    signAccessToken: ReturnType<typeof vi.fn>;
    signRefreshToken: ReturnType<typeof vi.fn>;
    verifyRefreshToken: ReturnType<typeof vi.fn>;
  };
  let storage: {
    putObject: ReturnType<typeof vi.fn>;
    deleteObject: ReturnType<typeof vi.fn>;
    getSignedUrl: ReturnType<typeof vi.fn>;
  };
  let mailService: {
    sendPasswordResetOtp: ReturnType<typeof vi.fn>;
  };
  let service: AuthService;

  beforeEach(() => {
    sharedUserRepo = {
      findByEmail: vi.fn(),
      findById: vi.fn(),
      findByIdWithPassword: vi.fn(),
      createUser: vi.fn(),
      updateProfile: vi.fn(),
      updateAvatarKey: vi.fn(),
    };
    authRepo = {
      createRefreshToken: vi.fn(),
      findByTokenHash: vi.fn(),
      revokeAllUserTokens: vi.fn(),
      rotateRefreshToken: vi.fn(),
      revokeByTokenHash: vi.fn(),
      replacePasswordAndRotateSession: vi.fn(),
      replacePasswordResetOtp: vi.fn(),
      findLatestActivePasswordResetOtp: vi.fn(),
      incrementOtpAttempt: vi.fn(),
      consumeOtpAndResetPassword: vi.fn(),
    };
    tokenService = {
      signAccessToken: vi.fn().mockResolvedValue('access-jwt'),
      signRefreshToken: vi.fn().mockResolvedValue('refresh-jwt-new'),
      verifyRefreshToken: vi.fn(),
    };
    storage = {
      putObject: vi.fn().mockResolvedValue(undefined),
      deleteObject: vi.fn().mockResolvedValue(undefined),
      getSignedUrl: vi.fn().mockResolvedValue('https://s3.example.com/avatar-signed.png'),
    };
    mailService = {
      sendPasswordResetOtp: vi.fn().mockResolvedValue({ deliveredVia: 'console' }),
    };

    service = new AuthService(
      sharedUserRepo as unknown as SharedUserRepository,
      authRepo as unknown as AuthRepository,
      tokenService as unknown as TokenService,
      storage as unknown as StorageService,
      mailService as unknown as MailService,
    );
  });

  describe('getProfile & updateProfile', () => {
    it('returns presigned avatarUrl (1h) without leaking avatarS3Key', async () => {
      sharedUserRepo.findById.mockResolvedValueOnce(
        makeSafeUser({ avatarS3Key: `avatars/${USER_ID}/abc.png` }),
      );

      const profile = await service.getProfile(USER_ID);

      expect(storage.getSignedUrl).toHaveBeenCalledWith(
        `avatars/${USER_ID}/abc.png`,
        AVATAR_URL_EXPIRES_SEC,
      );
      expect(profile.avatarUrl).toBe('https://s3.example.com/avatar-signed.png');
      expect(profile).not.toHaveProperty('avatarS3Key');
    });

    it('updates fullName, phone, and bio', async () => {
      sharedUserRepo.findById.mockResolvedValueOnce(makeSafeUser());
      sharedUserRepo.updateProfile.mockResolvedValueOnce(
        makeSafeUser({ fullName: 'Trần Minh B', phone: '0988777666', bio: 'Fullstack' }),
      );

      const res = await service.updateProfile(USER_ID, {
        fullName: 'Trần Minh B',
        phone: '0988777666',
        bio: 'Fullstack',
      });

      expect(sharedUserRepo.updateProfile).toHaveBeenCalledWith(USER_ID, {
        fullName: 'Trần Minh B',
        phone: '0988777666',
        bio: 'Fullstack',
      });
      expect(res.fullName).toBe('Trần Minh B');
      expect(res.phone).toBe('0988777666');
      expect(res.bio).toBe('Fullstack');
    });
  });

  describe('updateAvatar & deleteAvatar', () => {
    it('uploads new avatar to S3, updates DB, deletes old S3 avatar, and returns presigned URL', async () => {
      const oldKey = `avatars/${USER_ID}/old.png`;
      sharedUserRepo.findById.mockResolvedValueOnce(makeSafeUser({ avatarS3Key: oldKey }));
      sharedUserRepo.updateAvatarKey.mockImplementationOnce(async (_id: string, key: string) =>
        makeSafeUser({ avatarS3Key: key }),
      );

      const res = await service.updateAvatar(USER_ID, {
        buffer: PNG_BUFFER,
        size: PNG_BUFFER.length,
        mimetype: 'image/png',
        originalname: 'me.png',
      } as Express.Multer.File);

      expect(storage.putObject).toHaveBeenCalledWith(
        expect.stringMatching(new RegExp(`^avatars/${USER_ID}/.+\\.png$`)),
        PNG_BUFFER,
        'image/png',
      );
      expect(storage.deleteObject).toHaveBeenCalledWith(oldKey);
      expect(res.avatarUrl).toBe('https://s3.example.com/avatar-signed.png');
    });

    it('deletes orphan uploaded S3 object when DB update fails', async () => {
      sharedUserRepo.findById.mockResolvedValueOnce(makeSafeUser());
      sharedUserRepo.updateAvatarKey.mockRejectedValueOnce(new Error('DB write error'));

      await expect(
        service.updateAvatar(USER_ID, {
          buffer: PNG_BUFFER,
          size: PNG_BUFFER.length,
          mimetype: 'image/png',
        } as Express.Multer.File),
      ).rejects.toThrow('DB write error');

      const uploadedKey = storage.putObject.mock.calls[0][0] as string;
      expect(storage.deleteObject).toHaveBeenCalledWith(uploadedKey);
    });

    it('removes avatar from DB and cleans up S3 object on deleteAvatar', async () => {
      const oldKey = `avatars/${USER_ID}/old.png`;
      sharedUserRepo.findById.mockResolvedValueOnce(makeSafeUser({ avatarS3Key: oldKey }));
      sharedUserRepo.updateAvatarKey.mockResolvedValueOnce(makeSafeUser({ avatarS3Key: null }));

      const res = await service.deleteAvatar(USER_ID);

      expect(sharedUserRepo.updateAvatarKey).toHaveBeenCalledWith(USER_ID, null);
      expect(storage.deleteObject).toHaveBeenCalledWith(oldKey);
      expect(res.avatarUrl).toBeNull();
    });
  });

  describe('changePassword', () => {
    it('rejects wrong current password with INVALID_CURRENT_PASSWORD', async () => {
      const passwordHash = await hash('OldPass123!', 4);
      sharedUserRepo.findByIdWithPassword.mockResolvedValueOnce({
        ...makeSafeUser(),
        passwordHash,
      });

      const err = await service
        .changePassword(USER_ID, { currentPassword: 'WrongPassword!', newPassword: 'NewPass456!' })
        .catch((e) => e);

      expect(err).toBeInstanceOf(BadRequestException);
      expect((err as BadRequestException).getResponse()).toMatchObject({
        code: AuthErrorCode.INVALID_CURRENT_PASSWORD,
      });
    });

    it('rejects when newPassword equals currentPassword', async () => {
      const passwordHash = await hash('SamePass123!', 4);
      sharedUserRepo.findByIdWithPassword.mockResolvedValueOnce({
        ...makeSafeUser(),
        passwordHash,
      });

      const err = await service
        .changePassword(USER_ID, { currentPassword: 'SamePass123!', newPassword: 'SamePass123!' })
        .catch((e) => e);

      expect(err).toBeInstanceOf(BadRequestException);
      expect((err as BadRequestException).getResponse()).toMatchObject({
        code: AuthErrorCode.SAME_AS_CURRENT_PASSWORD,
      });
    });

    it('updates password hash, revokes old tokens, and rotates current refresh token', async () => {
      const passwordHash = await hash('OldPass123!', 4);
      sharedUserRepo.findByIdWithPassword.mockResolvedValueOnce({
        ...makeSafeUser(),
        passwordHash,
      });

      const res = await service.changePassword(
        USER_ID,
        { currentPassword: 'OldPass123!', newPassword: 'NewPass456!' },
        { ip: '127.0.0.1', userAgent: 'Vitest' },
      );

      expect(authRepo.replacePasswordAndRotateSession).toHaveBeenCalledWith(
        USER_ID,
        expect.any(String),
        expect.objectContaining({
          userId: USER_ID,
          tokenHash: hashToken('refresh-jwt-new'),
          ip: '127.0.0.1',
          userAgent: 'Vitest',
        }),
      );
      expect(res.refreshToken).toBe('refresh-jwt-new');
    });
  });

  describe('forgotPassword & resetPassword', () => {
    it('returns generic success message without sending email when email is not registered', async () => {
      sharedUserRepo.findByEmail.mockResolvedValueOnce(null);

      const res = await service.forgotPassword({ email: 'unknown@hireflow.vn' });

      expect(res.message).toContain('OTP');
      expect(authRepo.replacePasswordResetOtp).not.toHaveBeenCalled();
      expect(mailService.sendPasswordResetOtp).not.toHaveBeenCalled();
    });

    it('generates 6-digit OTP, stores SHA-256 hash, and sends email via MailService', async () => {
      sharedUserRepo.findByEmail.mockResolvedValueOnce({
        ...makeSafeUser(),
        passwordHash: 'hash',
      });

      await service.forgotPassword({ email: 'user@hireflow.vn' });

      expect(mailService.sendPasswordResetOtp).toHaveBeenCalledTimes(1);
      const sentInput = mailService.sendPasswordResetOtp.mock.calls[0][0] as {
        to: string;
        otp: string;
        expiresInMinutes: number;
      };
      expect(sentInput.to).toBe('user@hireflow.vn');
      expect(sentInput.otp).toMatch(/^\d{6}$/);
      expect(sentInput.expiresInMinutes).toBe(10);

      expect(authRepo.replacePasswordResetOtp).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: USER_ID,
          codeHash: hashToken(sentInput.otp),
        }),
      );
    });

    it('increments attempt counter on wrong OTP and locks after 5 attempts', async () => {
      sharedUserRepo.findByEmail.mockResolvedValue({
        ...makeSafeUser(),
        passwordHash: 'hash',
      });
      authRepo.findLatestActivePasswordResetOtp.mockResolvedValue({
        id: 'otp-1',
        userId: USER_ID,
        codeHash: hashToken('123456'),
        attempts: 4,
        expiresAt: new Date(Date.now() + 60_000),
        usedAt: null,
      });
      authRepo.incrementOtpAttempt.mockResolvedValueOnce(5);

      const err = await service
        .resetPassword({
          email: 'user@hireflow.vn',
          otp: '000000',
          newPassword: 'ResetPassword123!',
        })
        .catch((e) => e);

      expect(authRepo.incrementOtpAttempt).toHaveBeenCalledWith('otp-1', 5);
      expect(err).toBeInstanceOf(BadRequestException);
      expect((err as BadRequestException).getResponse()).toMatchObject({
        code: AuthErrorCode.OTP_TOO_MANY_ATTEMPTS,
      });
    });

    it('consumes OTP, resets password, and revokes all refresh tokens on valid OTP', async () => {
      sharedUserRepo.findByEmail.mockResolvedValueOnce({
        ...makeSafeUser(),
        passwordHash: 'old-hash',
      });
      authRepo.findLatestActivePasswordResetOtp.mockResolvedValueOnce({
        id: 'otp-1',
        userId: USER_ID,
        codeHash: hashToken('654321'),
        attempts: 0,
        expiresAt: new Date(Date.now() + 60_000),
        usedAt: null,
      });
      authRepo.consumeOtpAndResetPassword.mockResolvedValueOnce(true);

      const res = await service.resetPassword({
        email: 'user@hireflow.vn',
        otp: '654321',
        newPassword: 'ResetPassword123!',
      });

      expect(authRepo.consumeOtpAndResetPassword).toHaveBeenCalledWith(
        'otp-1',
        USER_ID,
        expect.any(String),
      );
      expect(res.message).toContain('thành công');
    });
  });
});
