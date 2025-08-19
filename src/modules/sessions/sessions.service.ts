import { Injectable, BadRequestException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma.service';
import { ValidationUtils } from '../../common/utils/validation.utils';
import { SessionUtils } from '../../common/utils/session.utils';
import { SESSION_CONSTANTS } from '../../common/constants/session.constants';
import { ERROR_MESSAGES } from '../../common/constants/error-messages.constants';

@Injectable()
export class SessionsService {
  constructor(private prisma: PrismaService) {}

  private get duration() { 
    const duration = Number(process.env.SESSION_DURATION_SECONDS || SESSION_CONSTANTS.DEFAULT_DURATION_SECONDS);
    return duration;
  }
  private get cap() { return Number(process.env.SESSION_MAX_PLAYERS || SESSION_CONSTANTS.DEFAULT_MAX_PLAYERS); }

  // Scheduled task to automatically end expired sessions and create new ones
  @Cron(CronExpression.EVERY_10_SECONDS)
  async handleExpiredSessions() {
    try {
      // Check if there are any active users
      const activeUsers = await this.getActiveUserCount();
      
      if (activeUsers === 0) {
        await this.stopAllSessions();
        return;
      }
      
      // Find all active sessions that have expired
      const now = new Date();
      const expiredSessions = await this.prisma.session.findMany({
        where: { 
          status: SESSION_CONSTANTS.SESSION_STATUSES.ACTIVE,
          endsAt: { lt: now }
        },
        include: { players: true }
      });

      for (const session of expiredSessions) {
        await this.endSession(session.id);
      }

      // Only create new sessions if there are active users
      if (activeUsers > 0) {
        // Ensure there's always a pending session available
        const pendingSession = await this.prisma.session.findFirst({
          where: { status: SESSION_CONSTANTS.SESSION_STATUSES.PENDING }
        });

        if (!pendingSession) {
          await this.prisma.session.create({ 
            data: { status: SESSION_CONSTANTS.SESSION_STATUSES.PENDING } 
          });
        }
      }
    } catch (error) {
      console.error('Error handling expired sessions:', error);
    }
  }

  // Scheduled task to clean up inactive users (every minute)
  @Cron(CronExpression.EVERY_MINUTE)
  async cleanupInactiveUsers() {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      
      // Find users who haven't been active in 5 minutes
      const inactiveUsers = await this.prisma.user.findMany({
        where: {
          lastActivityAt: { lt: fiveMinutesAgo }
        }
      });
      
      if (inactiveUsers.length > 0) {
        // Remove inactive users from all sessions and queues
        for (const user of inactiveUsers) {
          // Remove from session players
          await this.prisma.sessionPlayer.deleteMany({
            where: { userId: user.id }
          });
          
          // Remove from session queues
          await this.prisma.sessionQueue.deleteMany({
            where: { userId: user.id }
          });
        }
      }
    } catch (error) {
      console.error('Error cleaning up inactive users:', error);
    }
  }

  // Get count of active users (users with recent activity)
  private async getActiveUserCount(): Promise<number> {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
      
      const activeUsers = await this.prisma.user.count({
        where: {
          lastActivityAt: { gte: fiveMinutesAgo }
        }
      });
      
      return activeUsers;
    } catch (error) {
      console.error('Error getting active user count:', error);
      return 0;
    }
  }

  // Update user's last activity timestamp
  private async updateUserActivity(userId: number): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { lastActivityAt: new Date() }
      });
    } catch (error) {
      console.error(`Error updating user activity for user ${userId}:`, error);
    }
  }

  // Stop all active and pending sessions when no users are online
  private async stopAllSessions(): Promise<void> {
    try {
      // End all active sessions
      const activeSessions = await this.prisma.session.findMany({
        where: { status: SESSION_CONSTANTS.SESSION_STATUSES.ACTIVE }
      });
      
      for (const session of activeSessions) {
        await this.endSession(session.id);
      }
      
      // Delete all pending sessions
      const pendingSessions = await this.prisma.session.findMany({
        where: { status: SESSION_CONSTANTS.SESSION_STATUSES.PENDING }
      });
      
      for (const session of pendingSessions) {
        await this.prisma.session.delete({ where: { id: session.id } });
      }
    } catch (error) {
      console.error('Error stopping all sessions:', error);
    }
  }

  async getCurrent(userId?: number) {
    // Update user activity if userId is provided
    if (userId) {
      await this.updateUserActivity(userId);
    }
    
    // First, check if there are any expired active sessions and handle them
    await this.handleExpiredSessions();

    const active = await this.prisma.session.findFirst({
      where: { status: SESSION_CONSTANTS.SESSION_STATUSES.ACTIVE },
      include: { players: { include: { user: true } }, queue: { include: { user: true } } },
    });
    
    if (active) {
      return { session: active };
    }

    const pending = await this.prisma.session.findFirst({
      where: { status: SESSION_CONSTANTS.SESSION_STATUSES.PENDING },
      include: { players: { include: { user: true } }, queue: { include: { user: true } } },
      orderBy: { id: 'desc' },
    });
    
    if (pending) {
      // Auto-start pending sessions after 30 seconds of creation
      const sessionAge = Date.now() - new Date(pending.createdAt).getTime();
      const autoStartDelay = 30000; // 30 seconds
      
      if (sessionAge > autoStartDelay) {
        try {
          // Auto-start with a system user (ID 0 or null)
          const autoStartedSession = await this.start({ id: 0 });
          return { session: autoStartedSession };
        } catch (error) {
          console.error('Error auto-starting session:', error);
          // Continue with pending session if auto-start fails
        }
      }
    }
    
    return { session: pending };
  }

  async start(starter: { id: number }) {
    // Update user activity for the starter
    if (starter.id > 0) { // Don't update for system user (ID 0)
      await this.updateUserActivity(starter.id);
    }
    
    const active = await this.prisma.session.findFirst({ where: { status: SESSION_CONSTANTS.SESSION_STATUSES.ACTIVE } });
    if (active) throw new BadRequestException(ERROR_MESSAGES.SESSION.ALREADY_ACTIVE);

    let pending = await this.prisma.session.findFirst({ where: { status: SESSION_CONSTANTS.SESSION_STATUSES.PENDING }, orderBy: { id: 'desc' } });
    if (!pending) {
      pending = await this.prisma.session.create({ data: { status: SESSION_CONSTANTS.SESSION_STATUSES.PENDING, startedById: starter.id } });
    }

    const startedAt = new Date();
    const endsAt = new Date(startedAt.getTime() + this.duration * 1000);

    const session = await this.prisma.session.update({
      where: { id: pending.id },
      data: { 
        status: SESSION_CONSTANTS.SESSION_STATUSES.ACTIVE, 
        startedAt, 
        endsAt
      },
      include: { players: { include: { user: true } }, queue: { include: { user: true } } },
    });

    // Auto-enroll first in queue if session not full
    if (session.players.length < this.cap && session.queue.length > 0) {
      const firstInQueue = session.queue[0];
      const randomPick = ValidationUtils.generateRandomPick();
      await this.prisma.sessionPlayer.create({
        data: { sessionId: session.id, userId: firstInQueue.userId, pick: randomPick },
      });
      await this.prisma.sessionQueue.delete({ where: { id: firstInQueue.id } });
    }

    return session;
  }

  async join(userId: number, pick: number) {
    const validatedPick = ValidationUtils.validatePickNumber(pick);
    
    // Update user activity
    await this.updateUserActivity(userId);
    
    const session = await this.prisma.session.findFirst({
      where: { status: SESSION_CONSTANTS.SESSION_STATUSES.ACTIVE },
      include: { players: true, queue: true },
    });

    SessionUtils.validateSessionActive(session);
    SessionUtils.validateUserNotInSession(session!, userId);
    SessionUtils.validateUserNotInQueue(session!, userId);

    if (!SessionUtils.isSessionFull(session!.players, this.cap)) {
      // Join directly
      await this.prisma.sessionPlayer.create({
        data: { 
          sessionId: session!.id, 
          userId, 
          pick: validatedPick,
          joinedAt: new Date()
        },
      });
    } else {
      // Join queue
      await this.prisma.sessionQueue.create({
        data: { sessionId: session!.id, userId },
      });
    }

    // Return fresh session data to ensure real-time updates
    const updatedSession = await this.getCurrent();
    return updatedSession;
  }

  async leave(userId: number) {
    // Update user activity
    await this.updateUserActivity(userId);
    
    const session = await this.prisma.session.findFirst({
      where: { status: { in: [SESSION_CONSTANTS.SESSION_STATUSES.ACTIVE, SESSION_CONSTANTS.SESSION_STATUSES.PENDING] } },
      include: { players: true, queue: true },
    });

    if (!session) {
      return { session: null };
    }

    if (session.status === SESSION_CONSTANTS.SESSION_STATUSES.ENDED) return session;

    // Check if user was in the session
    const wasInSession = session.players.some(p => p.userId === userId);
    
    // Remove from players
    await this.prisma.sessionPlayer.deleteMany({
      where: { sessionId: session.id, userId },
    });

    // Remove from queue
    await this.prisma.sessionQueue.deleteMany({
      where: { sessionId: session.id, userId },
    });

    // If session was pending and no players left, delete it
    if (session.status === SESSION_CONSTANTS.SESSION_STATUSES.PENDING && session.players.length === 0) {
      await this.prisma.session.delete({ where: { id: session.id } });
      return { session: null };
    }

    // Queue promotion: If someone left an active session and there are people in queue, promote the first one
    if (wasInSession && session.status === SESSION_CONSTANTS.SESSION_STATUSES.ACTIVE && session.queue.length > 0) {
      const firstInQueue = session.queue[0];
      const randomPick = ValidationUtils.generateRandomPick();
      
      // Promote to player
      await this.prisma.sessionPlayer.create({
        data: { 
          sessionId: session.id, 
          userId: firstInQueue.userId, 
          pick: randomPick,
          joinedAt: new Date()
        },
      });
      
      // Remove from queue
      await this.prisma.sessionQueue.delete({ where: { id: firstInQueue.id } });
    }
    
    // Queue promotion: If someone left a pending session and there are people in queue, promote the first one
    if (wasInSession && session.status === SESSION_CONSTANTS.SESSION_STATUSES.PENDING && session.queue.length > 0) {
      const firstInQueue = session.queue[0];
      
      // For pending sessions, no pick is needed yet, but we need to provide a default value
      // This will be updated when the session starts
      const defaultPick = ValidationUtils.generateRandomPick();
      
      await this.prisma.sessionPlayer.create({
        data: { 
          sessionId: session.id, 
          userId: firstInQueue.userId,
          pick: defaultPick,
          joinedAt: new Date()
        },
      });
      
      // Remove from queue
      await this.prisma.sessionQueue.delete({ where: { id: firstInQueue.id } });
    }

    // Return fresh session data to ensure real-time updates
    const updatedSession = await this.getCurrent();
    return updatedSession;
  }

  async endSession(sessionId: number) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { players: true },
    });

    if (!session || session.status === SESSION_CONSTANTS.SESSION_STATUSES.ENDED) return session;

    // Generate winning number when session ends
    const winnerNumber = ValidationUtils.generateRandomPick();
    
    const winners = session.players.filter(p => p.pick === winnerNumber);

    // Update winners
    for (const winner of winners) {
      await this.prisma.sessionPlayer.update({
        where: { id: winner.id },
        data: { isWinner: true },
      });
      await this.prisma.user.update({
        where: { id: winner.userId },
        data: { wins: { increment: 1 } },
      });
    }

    await this.prisma.session.update({
      where: { id: sessionId },
      data: { status: SESSION_CONSTANTS.SESSION_STATUSES.ENDED, winnerNumber },
    });

    // Create new pending session
    await this.prisma.session.create({ data: { status: SESSION_CONSTANTS.SESSION_STATUSES.PENDING } });

    return session;
  }

  async getGroupedByDate() {
    return this.prisma.session.findMany({
      where: { status: SESSION_CONSTANTS.SESSION_STATUSES.ENDED },
      include: { players: { include: { user: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async isSessionJoinable(userId?: number) {
    if (userId) {
      await this.updateUserActivity(userId);
    }
    
    const active = await this.prisma.session.findFirst({
      where: { status: SESSION_CONSTANTS.SESSION_STATUSES.ACTIVE },
      include: { players: true, queue: true },
    });
    
    if (!active) {
      return { joinable: false, reason: 'No active session available' };
    }
    
    // Check if user is already in session
    const inSession = active.players.some(p => p.userId === userId);
    if (inSession) {
      return { joinable: false, reason: 'Already in session' };
    }
    
    // Check if user is in queue
    const inQueue = active.queue.some(q => q.userId === userId);
    if (inQueue) {
      return { joinable: false, reason: 'Already in queue' };
    }
    
    // Check if session is full
    if (active.players.length >= this.cap) {
      return { joinable: true, reason: 'Session full, can join queue' };
    }
    
    return { joinable: true, reason: 'Can join session directly' };
  }

  async getEndedSession(sessionId: number) {
    const session = await this.prisma.session.findUnique({
      where: { 
        id: sessionId
      },
      include: { 
        players: { 
          include: { user: true } 
        } 
      },
    });

    if (!session) {
      throw new Error(`Session with ID ${sessionId} not found`);
    }

    if (session.status !== SESSION_CONSTANTS.SESSION_STATUSES.ENDED) {
      throw new Error(`Session ${sessionId} is not ended yet. Current status: ${session.status}`);
    }

    return session;
  }

  async getSessionResults(sessionId: number) {
    const session = await this.prisma.session.findUnique({
      where: { 
        id: sessionId
      },
      include: { 
        players: { 
          include: { user: true } 
        } 
      },
    });

    if (!session) {
      throw new Error(`Session with ID ${sessionId} not found`);
    }

    // If session is ended, return it as is
    if (session.status === SESSION_CONSTANTS.SESSION_STATUSES.ENDED) {
      return session;
    }

    // If session is active but has ended (time expired), calculate results locally
    if (session.status === SESSION_CONSTANTS.SESSION_STATUSES.ACTIVE && session.endsAt) {
      const now = new Date();
      const endTime = new Date(session.endsAt);
      
      if (now > endTime) {
        // Session has expired but not yet processed by cron job
        // Calculate results locally
        const winnerNumber = session.winnerNumber || this.generateWinningNumber(session.players);
        const winners = session.players.filter(p => p.pick === winnerNumber);
        
        // Return a modified session object with calculated results
        return {
          ...session,
          status: 'ENDED' as const,
          winnerNumber,
          players: session.players.map(player => ({
            ...player,
            isWinner: player.pick === winnerNumber
          }))
        };
      }
    }

    throw new Error(`Session ${sessionId} is not ended yet. Current status: ${session.status}`);
  }

  private generateWinningNumber(players: any[]): number {
    // Generate a winning number based on player picks
    // This ensures consistency even if the cron job hasn't run yet
    const picks = players.map(p => p.pick).filter(p => p !== null && p !== undefined);
    if (picks.length === 0) return 1;
    
    // Use a simple hash of the session data to generate consistent results
    const hash = picks.reduce((acc, pick) => acc + pick, 0);
    return (hash % 9) + 1;
  }
}
