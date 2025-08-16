import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { startOfDay, startOfWeek, startOfMonth } from 'date-fns';

@Injectable()
export class LeaderboardService {
  constructor(private prisma: PrismaService) {}

  async top(period?: 'day' | 'week' | 'month') {
    if (period) {
      const now = new Date();
      let start: Date;
      
      if (period === 'day') {
        start = startOfDay(now);
      } else if (period === 'week') {
        start = startOfWeek(now, { weekStartsOn: 1 });
      } else if (period === 'month') {
        start = startOfMonth(now);
      } else {
        // Invalid period, return overall
        return this.getOverallLeaderboard();
      }

      // Count wins within period by reading SessionPlayer where isWinner=true and session.createdAt>=start
      const winners = await this.prisma.sessionPlayer.groupBy({
        by: ['userId'],
        _count: {
          userId: true
        },
        where: { 
          isWinner: true, 
          session: { 
            createdAt: { gte: start } 
          } 
        },
        orderBy: { 
          _count: { 
            userId: 'desc' 
          } 
        },
        take: 10,
      });

      if (winners.length === 0) {
        return [];
      }

      // Get user details for the winners
      const userIds = winners.map(w => w.userId);
      const users = await this.prisma.user.findMany({ 
        where: { id: { in: userIds } },
        select: { id: true, username: true, fullName: true }
      });

      // Map winners with user details and sort by wins
      const leaderboard = winners.map(w => {
        const user = users.find(u => u.id === w.userId);
        return {
          id: w.userId,
          username: user?.username || 'Unknown',
          fullName: user?.fullName || null,
          wins: w._count.userId,
        };
      });

      // Sort by wins (descending) and take top 10
      return leaderboard.sort((a, b) => b.wins - a.wins).slice(0, 10);
    }

    // Default: overall wins
    return this.getOverallLeaderboard();
  }

  private async getOverallLeaderboard() {
    const top = await this.prisma.user.findMany({
      orderBy: { wins: 'desc' },
      take: 10,
      select: { 
        id: true, 
        username: true, 
        fullName: true,
        wins: true 
      },
    });

    return top.map(t => ({ 
      id: t.id, 
      username: t.username, 
      fullName: t.fullName,
      wins: t.wins 
    }));
  }
}
