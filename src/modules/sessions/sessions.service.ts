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
    console.log('=== Session Duration Configuration ===');
    console.log('Environment SESSION_DURATION_SECONDS:', process.env.SESSION_DURATION_SECONDS);
    console.log('Default duration:', SESSION_CONSTANTS.DEFAULT_DURATION_SECONDS);
    console.log('Final duration used:', duration, 'seconds');
    return duration;
  }
  private get cap() { return Number(process.env.SESSION_MAX_PLAYERS || SESSION_CONSTANTS.DEFAULT_MAX_PLAYERS); }

  // Scheduled task to automatically end expired sessions and create new ones
  @Cron(CronExpression.EVERY_10_SECONDS)
  async handleExpiredSessions() {
    try {
      console.log('=== Scheduled Task: Checking for expired sessions ===');
      console.log('Current time:', new Date().toISOString());
      
      // Find all active sessions that have expired
      const now = new Date();
      const expiredSessions = await this.prisma.session.findMany({
        where: { 
          status: SESSION_CONSTANTS.SESSION_STATUSES.ACTIVE,
          endsAt: { lt: now }
        },
        include: { players: true }
      });

      console.log('Found expired sessions:', expiredSessions.length);
      console.log('Expired sessions:', expiredSessions.map(s => ({ id: s.id, endsAt: s.endsAt, players: s.players.length })));

      for (const session of expiredSessions) {
        console.log(`Ending expired session ${session.id}`);
        await this.endSession(session.id);
      }

      // Ensure there's always a pending session available
      const pendingSession = await this.prisma.session.findFirst({
        where: { status: SESSION_CONSTANTS.SESSION_STATUSES.PENDING }
      });

      console.log('Current pending session:', pendingSession ? pendingSession.id : 'None');

      if (!pendingSession) {
        console.log('Creating new pending session');
        const newSession = await this.prisma.session.create({ 
          data: { status: SESSION_CONSTANTS.SESSION_STATUSES.PENDING } 
        });
        console.log('Created new pending session:', newSession.id);
      }
      
      console.log('=== Scheduled Task Complete ===');
    } catch (error) {
      console.error('Error handling expired sessions:', error);
    }
  }

  async getCurrent() {
    console.log('=== getCurrent called ===');
    
    // First, check if there are any expired active sessions and handle them
    await this.handleExpiredSessions();

    const active = await this.prisma.session.findFirst({
      where: { status: SESSION_CONSTANTS.SESSION_STATUSES.ACTIVE },
      include: { players: { include: { user: true } }, queue: { include: { user: true } } },
    });
    
    console.log('Active session found:', active ? active.id : 'None');
    if (active) {
      console.log('Active session status:', active.status);
      console.log('Active session players:', active.players.length);
      console.log('Active session endsAt:', active.endsAt);
      console.log('Player IDs:', active.players.map(p => p.userId));
      return { session: active };
    }

    const pending = await this.prisma.session.findFirst({
      where: { status: SESSION_CONSTANTS.SESSION_STATUSES.PENDING },
      include: { players: { include: { user: true } }, queue: { include: { user: true } } },
      orderBy: { id: 'desc' },
    });
    
    console.log('Pending session found:', pending ? pending.id : 'None');
    if (pending) {
      console.log('Pending session players:', pending.players.length);
      console.log('Player IDs:', pending.players.map(p => p.userId));
      
      // Auto-start pending sessions after 5 seconds of creation
      const sessionAge = Date.now() - new Date(pending.createdAt).getTime();
      const autoStartDelay = 5000; // 5 seconds
      
      if (sessionAge > autoStartDelay) {
        console.log('Auto-starting pending session:', pending.id);
        console.log('Session age:', sessionAge, 'ms, Auto-start delay:', autoStartDelay, 'ms');
        
        try {
          // Auto-start with a system user (ID 0 or null)
          const autoStartedSession = await this.start({ id: 0 });
          console.log('Auto-started session:', autoStartedSession.id);
          return { session: autoStartedSession };
        } catch (error) {
          console.error('Error auto-starting session:', error);
          // Continue with pending session if auto-start fails
        }
      } else {
        console.log('Session too young to auto-start. Age:', sessionAge, 'ms');
      }
    }
    
    console.log('=== getCurrent returning ===');
    return { session: pending };
  }

  async start(starter: { id: number }) {
    console.log(`=== Starting session with starter ID: ${starter.id} ===`);
    
    const active = await this.prisma.session.findFirst({ where: { status: SESSION_CONSTANTS.SESSION_STATUSES.ACTIVE } });
    if (active) throw new BadRequestException(ERROR_MESSAGES.SESSION.ALREADY_ACTIVE);

    let pending = await this.prisma.session.findFirst({ where: { status: SESSION_CONSTANTS.SESSION_STATUSES.PENDING }, orderBy: { id: 'desc' } });
    if (!pending) {
      pending = await this.prisma.session.create({ data: { status: SESSION_CONSTANTS.SESSION_STATUSES.PENDING, startedById: starter.id } });
      console.log(`Created new pending session: ${pending.id}`);
    }

    const startedAt = new Date();
    const endsAt = new Date(startedAt.getTime() + this.duration * 1000);
    
    console.log('=== Starting Session ===');
    console.log('Session duration:', this.duration, 'seconds');
    console.log('Started at:', startedAt.toISOString());
    console.log('Ends at:', endsAt.toISOString());
    console.log('Total duration:', (endsAt.getTime() - startedAt.getTime()) / 1000, 'seconds');

    const session = await this.prisma.session.update({
      where: { id: pending.id },
      data: { 
        status: SESSION_CONSTANTS.SESSION_STATUSES.ACTIVE, 
        startedAt, 
        endsAt
      },
      include: { players: { include: { user: true } }, queue: { include: { user: true } } },
    });

    console.log(`Session ${session.id} started successfully with ${session.players.length} players`);

    // Auto-enroll first in queue if session not full
    if (session.players.length < this.cap && session.queue.length > 0) {
      const firstInQueue = session.queue[0];
      const randomPick = ValidationUtils.generateRandomPick();
      await this.prisma.sessionPlayer.create({
        data: { sessionId: session.id, userId: firstInQueue.userId, pick: randomPick },
      });
      await this.prisma.sessionQueue.delete({ where: { id: firstInQueue.id } });
      console.log(`Auto-enrolled user ${firstInQueue.userId} from queue with pick ${randomPick}`);
    }

    return session;
  }

  async join(userId: number, pick: number) {
    const validatedPick = ValidationUtils.validatePickNumber(pick);
    console.log(`=== User ${userId} joining session with pick ${validatedPick} ===`);
    
    const session = await this.prisma.session.findFirst({
      where: { status: SESSION_CONSTANTS.SESSION_STATUSES.ACTIVE },
      include: { players: true, queue: true },
    });

    SessionUtils.validateSessionActive(session);
    SessionUtils.validateUserNotInSession(session!, userId);
    SessionUtils.validateUserNotInQueue(session!, userId);

    if (!SessionUtils.isSessionFull(session!.players, this.cap)) {
      // Join directly
      console.log(`Session not full (${session!.players.length}/${this.cap}), joining directly`);
      await this.prisma.sessionPlayer.create({
        data: { 
          sessionId: session!.id, 
          userId, 
          pick: validatedPick,
          joinedAt: new Date()
        },
      });
      console.log(`User ${userId} joined session ${session!.id} directly`);
    } else {
      // Join queue
      console.log(`Session full (${session!.players.length}/${this.cap}), joining queue`);
      await this.prisma.sessionQueue.create({
        data: { sessionId: session!.id, userId },
      });
      console.log(`User ${userId} joined queue for session ${session!.id}`);
    }

    // Return fresh session data to ensure real-time updates
    const updatedSession = await this.getCurrent();
    console.log(`=== Join complete. Updated session has ${updatedSession.session?.players?.length || 0} players ===`);
    return updatedSession;
  }

  async leave(userId: number) {
    console.log(`=== User ${userId} leaving session ===`);
    
    const session = await this.prisma.session.findFirst({
      where: { status: { in: [SESSION_CONSTANTS.SESSION_STATUSES.ACTIVE, SESSION_CONSTANTS.SESSION_STATUSES.PENDING] } },
      include: { players: true, queue: true },
    });

    if (!session) {
      console.log('No active/pending session found');
      return { session: null };
    }

    if (session.status === SESSION_CONSTANTS.SESSION_STATUSES.ENDED) return session;

    // Check if user was in the session
    const wasInSession = session.players.some(p => p.userId === userId);
    console.log(`User ${userId} was in session: ${wasInSession}`);
    
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
      console.log(`Deleted empty pending session ${session.id}`);
      return { session: null };
    }

    // Queue promotion: If someone left an active session and there are people in queue, promote the first one
    if (wasInSession && session.status === SESSION_CONSTANTS.SESSION_STATUSES.ACTIVE && session.queue.length > 0) {
      console.log('User left active session, promoting first person from queue');
      
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
      
      console.log(`Promoted user ${firstInQueue.userId} from queue to session with pick ${randomPick}`);
    }
    
    // Queue promotion: If someone left a pending session and there are people in queue, promote the first one
    if (wasInSession && session.status === SESSION_CONSTANTS.SESSION_STATUSES.PENDING && session.queue.length > 0) {
      console.log('User left pending session, promoting first person from queue');
      
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
      
      console.log(`Promoted user ${firstInQueue.userId} from queue to pending session with default pick ${defaultPick}`);
    }

    // Return fresh session data to ensure real-time updates
    const updatedSession = await this.getCurrent();
    console.log(`=== Leave complete. Updated session has ${updatedSession.session?.players?.length || 0} players ===`);
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
    console.log('🎯 Winning number generated:', winnerNumber);
    
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

  async getEndedSession(sessionId: number) {
    const session = await this.prisma.session.findUnique({
      where: { 
        id: sessionId,
        status: SESSION_CONSTANTS.SESSION_STATUSES.ENDED
      },
      include: { 
        players: { 
          include: { user: true } 
        } 
      },
    });

    if (!session) {
      throw new Error('Ended session not found');
    }

    return session;
  }
}
