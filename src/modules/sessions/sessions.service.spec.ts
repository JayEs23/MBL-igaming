import { Test, TestingModule } from '@nestjs/testing';
import { SessionsService } from './sessions.service';
import { PrismaService } from '../../common/prisma.service';
import { TestDatabase } from '../../../test/utils/test-database';
import { BadRequestException } from '@nestjs/common';
import { SESSION_CONSTANTS } from '../../common/constants/session.constants';

describe('SessionsService', () => {
  let service: SessionsService;
  let prismaService: PrismaService;
  let testDb: TestDatabase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionsService,
        {
          provide: PrismaService,
          useValue: {
            session: {
              findMany: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              findUnique: jest.fn(),
            },
            user: {
              count: jest.fn(),
              update: jest.fn(),
            },
            sessionPlayer: {
              create: jest.fn(),
              deleteMany: jest.fn(),
              findMany: jest.fn(),
            },
            sessionQueue: {
              create: jest.fn(),
              delete: jest.fn(),
              deleteMany: jest.fn(),
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<SessionsService>(SessionsService);
    prismaService = module.get<PrismaService>(PrismaService);
    testDb = new TestDatabase();
  });

  afterEach(async () => {
    await testDb.cleanDatabase();
    await testDb.disconnect();
  });

  describe('getCurrent', () => {
    it('should return active session if exists', async () => {
      const mockActiveSession = {
        id: 1,
        status: SESSION_CONSTANTS.SESSION_STATUSES.ACTIVE,
        players: [],
        queue: [],
      };

      jest.spyOn(prismaService.session, 'findFirst').mockResolvedValueOnce(mockActiveSession);
      jest.spyOn(prismaService.user, 'update').mockResolvedValue({} as any);

      const result = await service.getCurrent(1);

      expect(result).toEqual({ session: mockActiveSession });
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { lastActivityAt: expect.any(Date) },
      });
    });

    it('should return pending session if no active session', async () => {
      const mockPendingSession = {
        id: 1,
        status: SESSION_CONSTANTS.SESSION_STATUSES.PENDING,
        players: [],
        queue: [],
        createdAt: new Date(),
      };

      jest.spyOn(prismaService.session, 'findFirst')
        .mockResolvedValueOnce(null) // No active session
        .mockResolvedValueOnce(mockPendingSession); // Pending session

      const result = await service.getCurrent(1);

      expect(result).toEqual({ session: mockPendingSession });
    });

    it('should return null if no sessions exist', async () => {
      jest.spyOn(prismaService.session, 'findFirst')
        .mockResolvedValueOnce(null) // No active session
        .mockResolvedValueOnce(null); // No pending session

      const result = await service.getCurrent(1);

      expect(result).toEqual({ session: null });
    });
  });

  describe('start', () => {
    it('should start a session successfully', async () => {
      const mockPendingSession = {
        id: 1,
        status: SESSION_CONSTANTS.SESSION_STATUSES.PENDING,
        players: [],
        queue: [],
      };

      const mockStartedSession = {
        ...mockPendingSession,
        status: SESSION_CONSTANTS.SESSION_STATUSES.ACTIVE,
        startedAt: new Date(),
        endsAt: new Date(Date.now() + 60000),
      };

      jest.spyOn(prismaService.session, 'findFirst')
        .mockResolvedValueOnce(null) // No active session
        .mockResolvedValueOnce(mockPendingSession); // Pending session
      jest.spyOn(prismaService.session, 'update').mockResolvedValue(mockStartedSession);
      jest.spyOn(prismaService.user, 'update').mockResolvedValue({} as any);

      const result = await service.start({ id: 1 });

      expect(result).toEqual(mockStartedSession);
      expect(prismaService.session.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          status: SESSION_CONSTANTS.SESSION_STATUSES.ACTIVE,
          startedAt: expect.any(Date),
          endsAt: expect.any(Date),
        },
        include: { players: { include: { user: true } }, queue: { include: { user: true } } },
      });
    });

    it('should throw BadRequestException if session already active', async () => {
      const mockActiveSession = {
        id: 1,
        status: SESSION_CONSTANTS.SESSION_STATUSES.ACTIVE,
      };

      jest.spyOn(prismaService.session, 'findFirst').mockResolvedValue(mockActiveSession);

      await expect(service.start({ id: 1 })).rejects.toThrow(BadRequestException);
    });

    it('should create pending session if none exists', async () => {
      const mockCreatedSession = {
        id: 1,
        status: SESSION_CONSTANTS.SESSION_STATUSES.PENDING,
        startedById: 1,
      };

      const mockStartedSession = {
        ...mockCreatedSession,
        status: SESSION_CONSTANTS.SESSION_STATUSES.ACTIVE,
        startedAt: new Date(),
        endsAt: new Date(Date.now() + 60000),
        players: [],
        queue: [],
      };

      jest.spyOn(prismaService.session, 'findFirst')
        .mockResolvedValueOnce(null) // No active session
        .mockResolvedValueOnce(null); // No pending session
      jest.spyOn(prismaService.session, 'create').mockResolvedValue(mockCreatedSession);
      jest.spyOn(prismaService.session, 'update').mockResolvedValue(mockStartedSession);
      jest.spyOn(prismaService.user, 'update').mockResolvedValue({} as any);

      const result = await service.start({ id: 1 });

      expect(result).toEqual(mockStartedSession);
      expect(prismaService.session.create).toHaveBeenCalledWith({
        data: { status: SESSION_CONSTANTS.SESSION_STATUSES.PENDING, startedById: 1 },
      });
    });
  });

  describe('join', () => {
    it('should join session successfully', async () => {
      const mockSession = {
        id: 1,
        status: SESSION_CONSTANTS.SESSION_STATUSES.ACTIVE,
        players: [],
        queue: [],
      };

      const mockPlayer = {
        id: 1,
        sessionId: 1,
        userId: 1,
        pick: 5,
      };

      jest.spyOn(prismaService.session, 'findFirst').mockResolvedValue(mockSession);
      jest.spyOn(prismaService.sessionPlayer, 'create').mockResolvedValue(mockPlayer);
      jest.spyOn(prismaService.user, 'update').mockResolvedValue({} as any);

      const result = await service.join(1, 5);

      expect(result).toEqual({ session: mockSession });
      expect(prismaService.sessionPlayer.create).toHaveBeenCalledWith({
        data: { sessionId: 1, userId: 1, pick: 5 },
      });
    });

    it('should add user to queue if session is full', async () => {
      const mockSession = {
        id: 1,
        status: SESSION_CONSTANTS.SESSION_STATUSES.ACTIVE,
        players: Array(10).fill({}), // 10 players (session full)
        queue: [],
      };

      const mockQueueEntry = {
        id: 1,
        sessionId: 1,
        userId: 1,
      };

      jest.spyOn(prismaService.session, 'findFirst').mockResolvedValue(mockSession);
      jest.spyOn(prismaService.sessionQueue, 'create').mockResolvedValue(mockQueueEntry);
      jest.spyOn(prismaService.user, 'update').mockResolvedValue({} as any);

      const result = await service.join(1, 5);

      expect(result).toEqual({ session: mockSession });
      expect(prismaService.sessionQueue.create).toHaveBeenCalledWith({
        data: { sessionId: 1, userId: 1 },
      });
    });
  });

  describe('isSessionJoinable', () => {
    it('should return joinable true when session is available', async () => {
      const mockSession = {
        id: 1,
        status: SESSION_CONSTANTS.SESSION_STATUSES.ACTIVE,
        players: [],
        queue: [],
      };

      jest.spyOn(prismaService.session, 'findFirst').mockResolvedValue(mockSession);
      jest.spyOn(prismaService.user, 'update').mockResolvedValue({} as any);

      const result = await service.isSessionJoinable(1);

      expect(result).toEqual({
        joinable: true,
        reason: 'Can join session directly',
      });
    });

    it('should return joinable false when no active session', async () => {
      jest.spyOn(prismaService.session, 'findFirst').mockResolvedValue(null);

      const result = await service.isSessionJoinable(1);

      expect(result).toEqual({
        joinable: false,
        reason: 'No active session available',
      });
    });

    it('should return joinable false when user already in session', async () => {
      const mockSession = {
        id: 1,
        status: SESSION_CONSTANTS.SESSION_STATUSES.ACTIVE,
        players: [{ userId: 1 }],
        queue: [],
      };

      jest.spyOn(prismaService.session, 'findFirst').mockResolvedValue(mockSession);
      jest.spyOn(prismaService.user, 'update').mockResolvedValue({} as any);

      const result = await service.isSessionJoinable(1);

      expect(result).toEqual({
        joinable: false,
        reason: 'Already in session',
      });
    });

    it('should return joinable false when user already in queue', async () => {
      const mockSession = {
        id: 1,
        status: SESSION_CONSTANTS.SESSION_STATUSES.ACTIVE,
        players: [],
        queue: [{ userId: 1 }],
      };

      jest.spyOn(prismaService.session, 'findFirst').mockResolvedValue(mockSession);
      jest.spyOn(prismaService.user, 'update').mockResolvedValue({} as any);

      const result = await service.isSessionJoinable(1);

      expect(result).toEqual({
        joinable: false,
        reason: 'Already in queue',
      });
    });
  });

  describe('getActiveUserCount', () => {
    it('should return correct count of active users', async () => {
      jest.spyOn(prismaService.user, 'count').mockResolvedValue(5);

      const result = await (service as any).getActiveUserCount();

      expect(result).toBe(5);
      expect(prismaService.user.count).toHaveBeenCalledWith({
        where: {
          lastActivityAt: { gte: expect.any(Date) },
        },
      });
    });
  });
});
