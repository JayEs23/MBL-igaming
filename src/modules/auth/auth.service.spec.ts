import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/prisma.service';
import { TestDatabase } from '../../../test/utils/test-database';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;
  let prismaService: PrismaService;
  let testDb: TestDatabase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByUsername: jest.fn(),
            create: jest.fn(),
            userHasActiveSession: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            user: {
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
    prismaService = module.get<PrismaService>(PrismaService);
    testDb = new TestDatabase();
  });

  afterEach(async () => {
    await testDb.cleanDatabase();
    await testDb.disconnect();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const username = 'testuser';
      const fullName = 'Test User';
      const mockUser = { id: 1, username, fullName, wins: 0 };
      const mockToken = 'mock-jwt-token';

      jest.spyOn(usersService, 'findByUsername').mockResolvedValue(null);
      jest.spyOn(usersService, 'create').mockResolvedValue(mockUser);
      jest.spyOn(jwtService, 'signAsync').mockResolvedValue(mockToken);
      jest.spyOn(prismaService.user, 'update').mockResolvedValue(mockUser);

      const result = await service.register(username, fullName);

      expect(result).toEqual({ user: mockUser, token: mockToken });
      expect(usersService.findByUsername).toHaveBeenCalledWith(username);
      expect(usersService.create).toHaveBeenCalledWith(username, fullName);
      expect(jwtService.signAsync).toHaveBeenCalledWith({ sub: mockUser.id, username });
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { lastActivityAt: expect.any(Date) },
      });
    });

    it('should throw BadRequestException if username is empty', async () => {
      await expect(service.register('')).rejects.toThrow(BadRequestException);
      await expect(service.register('   ')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if username is not a string', async () => {
      await expect(service.register(null as any)).rejects.toThrow(BadRequestException);
      await expect(service.register(undefined as any)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if username already exists', async () => {
      const username = 'existinguser';
      const existingUser = { id: 1, username, fullName: 'Existing User' };

      jest.spyOn(usersService, 'findByUsername').mockResolvedValue(existingUser);

      await expect(service.register(username)).rejects.toThrow(BadRequestException);
      expect(usersService.findByUsername).toHaveBeenCalledWith(username);
    });

    it('should normalize username to lowercase', async () => {
      const username = 'TestUser';
      const mockUser = { id: 1, username: username.toLowerCase(), fullName: 'Test User' };
      const mockToken = 'mock-jwt-token';

      jest.spyOn(usersService, 'findByUsername').mockResolvedValue(null);
      jest.spyOn(usersService, 'create').mockResolvedValue(mockUser);
      jest.spyOn(jwtService, 'signAsync').mockResolvedValue(mockToken);
      jest.spyOn(prismaService.user, 'update').mockResolvedValue(mockUser);

      await service.register(username);

      expect(usersService.findByUsername).toHaveBeenCalledWith('testuser');
      expect(usersService.create).toHaveBeenCalledWith('testuser', undefined);
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      const username = 'testuser';
      const mockUser = { id: 1, username, fullName: 'Test User', wins: 0 };
      const mockToken = 'mock-jwt-token';

      jest.spyOn(usersService, 'findByUsername').mockResolvedValue(mockUser);
      jest.spyOn(usersService, 'userHasActiveSession').mockResolvedValue(false);
      jest.spyOn(jwtService, 'signAsync').mockResolvedValue(mockToken);
      jest.spyOn(prismaService.user, 'update').mockResolvedValue(mockUser);

      const result = await service.login(username);

      expect(result).toEqual({ user: mockUser, token: mockToken });
      expect(usersService.findByUsername).toHaveBeenCalledWith('testuser');
      expect(usersService.userHasActiveSession).toHaveBeenCalledWith(mockUser.id);
      expect(jwtService.signAsync).toHaveBeenCalledWith({ sub: mockUser.id, username: 'testuser' });
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { lastActivityAt: expect.any(Date) },
      });
    });

    it('should throw UnauthorizedException if user does not exist', async () => {
      const username = 'nonexistentuser';

      jest.spyOn(usersService, 'findByUsername').mockResolvedValue(null);

      await expect(service.login(username)).rejects.toThrow(UnauthorizedException);
      expect(usersService.findByUsername).toHaveBeenCalledWith('nonexistentuser');
    });

    it('should throw UnauthorizedException if user has active session', async () => {
      const username = 'testuser';
      const mockUser = { id: 1, username, fullName: 'Test User' };

      jest.spyOn(usersService, 'findByUsername').mockResolvedValue(mockUser);
      jest.spyOn(usersService, 'userHasActiveSession').mockResolvedValue(true);

      await expect(service.login(username)).rejects.toThrow(UnauthorizedException);
      expect(usersService.userHasActiveSession).toHaveBeenCalledWith(mockUser.id);
    });

    it('should throw BadRequestException if username is empty', async () => {
      await expect(service.login('')).rejects.toThrow(BadRequestException);
      await expect(service.login('   ')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if username is not a string', async () => {
      await expect(service.login(null as any)).rejects.toThrow(BadRequestException);
      await expect(service.login(undefined as any)).rejects.toThrow(BadRequestException);
    });
  });
});
