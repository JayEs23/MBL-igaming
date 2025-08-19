import { PrismaClient } from '@prisma/client';

export class TestDatabase {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
  }

  async connect(): Promise<void> {
    await this.prisma.$connect();
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }

  async cleanDatabase(): Promise<void> {
    // Delete in order to respect foreign key constraints
    await this.prisma.sessionQueue.deleteMany();
    await this.prisma.sessionPlayer.deleteMany();
    await this.prisma.session.deleteMany();
    await this.prisma.user.deleteMany();
  }

  async createTestUser(username: string, fullName?: string) {
    return await this.prisma.user.create({
      data: {
        username,
        fullName,
        lastActivityAt: new Date(),
      },
    });
  }

  async createTestSession(status: string = 'PENDING') {
    return await this.prisma.session.create({
      data: {
        status,
        startedAt: status === 'ACTIVE' ? new Date() : null,
        endsAt: status === 'ACTIVE' ? new Date(Date.now() + 60000) : null,
      },
    });
  }

  async createTestSessionPlayer(sessionId: number, userId: number, pick: number) {
    return await this.prisma.sessionPlayer.create({
      data: {
        sessionId,
        userId,
        pick,
      },
    });
  }

  async createTestSessionQueue(sessionId: number, userId: number) {
    return await this.prisma.sessionQueue.create({
      data: {
        sessionId,
        userId,
      },
    });
  }

  getPrisma(): PrismaClient {
    return this.prisma;
  }
}
