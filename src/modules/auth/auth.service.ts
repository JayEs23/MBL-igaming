import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private users: UsersService, private jwt: JwtService) {}

  async register(username: string, fullName?: string) {
    if (!username || typeof username !== 'string') {
      throw new BadRequestException('Username is required and must be a string');
    }
    
    username = username.trim().toLowerCase();
    if (!username) throw new BadRequestException('Username required');
    
    const existing = await this.users.findByUsername(username);
    if (existing) throw new BadRequestException('Username already taken');
    
    const user = await this.users.create(username, fullName);
    const token = await this.sign(user.id, user.username);
    return { user, token };
  }

  async login(username: string) {
    if (!username || typeof username !== 'string') {
      throw new BadRequestException('Username is required and must be a string');
    }
    
    username = username.trim().toLowerCase();
    const user = await this.users.findByUsername(username);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    // Check if user has an active session
    const hasActive = await this.users.userHasActiveSession(user.id);
    if (hasActive) {
      throw new UnauthorizedException('User has an active session and cannot log in.');
    }

    const token = await this.sign(user.id, user.username);
    return { user, token };
  }

  private async sign(userId: number, username: string) {
    return this.jwt.signAsync({ sub: userId, username });
  }
}
