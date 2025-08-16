import { BadRequestException } from '@nestjs/common';
import { SESSION_CONSTANTS } from '../constants/session.constants';
import { ERROR_MESSAGES } from '../constants/error-messages.constants';

export class ValidationUtils {
  static validateUsername(username: string): string {
    const trimmed = username.trim().toLowerCase();
    if (!trimmed) {
      throw new BadRequestException(ERROR_MESSAGES.AUTH.USERNAME_EMPTY);
    }
    return trimmed;
  }

  static validatePickNumber(pick: number): number {
    if (pick < SESSION_CONSTANTS.MIN_PICK_NUMBER || pick > SESSION_CONSTANTS.MAX_PICK_NUMBER) {
      throw new BadRequestException(ERROR_MESSAGES.VALIDATION.PICK_RANGE(SESSION_CONSTANTS.MIN_PICK_NUMBER, SESSION_CONSTANTS.MAX_PICK_NUMBER));
    }
    return pick;
  }

  static generateRandomPick(): number {
    return Math.floor(Math.random() * SESSION_CONSTANTS.MAX_PICK_NUMBER) + SESSION_CONSTANTS.MIN_PICK_NUMBER;
  }
} 