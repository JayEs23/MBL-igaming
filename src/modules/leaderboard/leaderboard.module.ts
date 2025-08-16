import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { LeaderboardService } from './leaderboard.service';
import { LeaderboardController } from './leaderboard.controller';

@Module({
  providers: [PrismaService, LeaderboardService],
  controllers: [LeaderboardController],
})
export class LeaderboardModule {}
