import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { ERROR_MESSAGES } from './constants/error-messages.constants';

interface RequestWithUser extends Request {
  user?: {
    id: number;
    username: string;
  };
}

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(private jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = this.extractTokenFromHeader(request);
    if (!token) throw new UnauthorizedException(ERROR_MESSAGES.AUTH.MISSING_TOKEN);
    
    try {
      const payload = await this.jwt.verifyAsync(token);
      // Map JWT payload to match UserRequest interface
      request.user = {
        id: payload.sub, // JWT 'sub' field contains the user ID
        username: payload.username
      };
    } catch {
      throw new UnauthorizedException(ERROR_MESSAGES.AUTH.INVALID_TOKEN);
    }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
