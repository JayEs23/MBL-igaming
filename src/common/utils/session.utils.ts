import { BadRequestException } from '@nestjs/common';
import { ERROR_MESSAGES } from '../constants/error-messages.constants';

export class SessionUtils {
  static validateSessionActive(session: any, sessionId?: number): void {
    if (!session) {
      throw new BadRequestException(ERROR_MESSAGES.SESSION.NO_ACTIVE_SESSION);
    }
    if (session.status !== 'ACTIVE') {
      throw new BadRequestException(`Cannot join session. Session status is ${session.status}. Only ACTIVE sessions can be joined.`);
    }
  }

  static validateUserNotInSession(session: any, userId: number): void {
    const existingPlayer = session.players.find((p: any) => p.userId === userId);
    if (existingPlayer) {
      throw new BadRequestException(ERROR_MESSAGES.SESSION.ALREADY_IN_SESSION);
    }
  }

  static validateUserNotInQueue(session: any, userId: number): void {
    const inQueue = session.queue.find((q: any) => q.userId === userId);
    if (inQueue) {
      throw new BadRequestException(ERROR_MESSAGES.SESSION.ALREADY_IN_QUEUE);
    }
  }

  static isSessionFull(players: any[], maxPlayers: number): boolean {
    return players.length >= maxPlayers;
  }
} 