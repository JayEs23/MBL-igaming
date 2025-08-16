import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(username: string, fullName?: string) {
    return this.prisma.user.create({ 
      data: { 
        username,
        fullName: fullName
      } 
    });
  }

  async findByUsername(username: string) {
    return this.prisma.user.findUnique({ where: { username } });
  }

  async findById(id: number) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async userHasActiveSession(userId: number) {
    // Check if user is in any active session as a player
    const activePlayer = await this.prisma.sessionPlayer.findFirst({
      where: { 
        userId,
        session: { status: 'ACTIVE' }
      },
    });
    
    if (activePlayer) return true;
    
    // Check if user is in any active session queue
    const activeQueue = await this.prisma.sessionQueue.findFirst({
      where: { 
        userId,
        session: { status: 'ACTIVE' }
      },
    });
    
    return !!activeQueue;
  }
}
