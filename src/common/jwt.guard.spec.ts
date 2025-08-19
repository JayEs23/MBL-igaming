import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtGuard } from './jwt.guard';
import { JwtService } from '@nestjs/jwt';

describe('JwtGuard', () => {
  let guard: JwtGuard;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtGuard,
        {
          provide: JwtService,
          useValue: {
            verifyAsync: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<JwtGuard>(JwtGuard);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should return true for valid token', async () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer valid-token',
        },
        user: undefined,
      };

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      const mockPayload = {
        sub: 1,
        username: 'testuser',
      };

      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(mockPayload);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockRequest.user).toEqual({
        id: 1,
        username: 'testuser',
      });
      expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-token');
    });

    it('should throw UnauthorizedException for missing token', async () => {
      const mockRequest = {
        headers: {},
        user: undefined,
      };

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for invalid token format', async () => {
      const mockRequest = {
        headers: {
          authorization: 'InvalidFormat token',
        },
        user: undefined,
      };

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer invalid-token',
        },
        user: undefined,
      };

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      jest.spyOn(jwtService, 'verifyAsync').mockRejectedValue(new Error('Invalid token'));

      await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
    });

    it('should handle undefined authorization header', async () => {
      const mockRequest = {
        headers: {
          authorization: undefined,
        },
        user: undefined,
      };

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from Bearer format', () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer test-token',
        },
      };

      const result = (guard as any).extractTokenFromHeader(mockRequest);

      expect(result).toBe('test-token');
    });

    it('should return undefined for non-Bearer format', () => {
      const mockRequest = {
        headers: {
          authorization: 'Basic dGVzdDp0ZXN0',
        },
      };

      const result = (guard as any).extractTokenFromHeader(mockRequest);

      expect(result).toBeUndefined();
    });

    it('should return undefined for missing authorization header', () => {
      const mockRequest = {
        headers: {},
      };

      const result = (guard as any).extractTokenFromHeader(mockRequest);

      expect(result).toBeUndefined();
    });

    it('should return undefined for undefined authorization header', () => {
      const mockRequest = {
        headers: {
          authorization: undefined,
        },
      };

      const result = (guard as any).extractTokenFromHeader(mockRequest);

      expect(result).toBeUndefined();
    });
  });
});
