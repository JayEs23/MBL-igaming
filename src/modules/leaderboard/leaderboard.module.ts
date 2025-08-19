import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { LeaderboardService } from './leaderboard.service';
import { LeaderboardController } from './leaderboard.controller';
import { JwtConfigModule } from '../../common/jwt.module';

@Module({
  imports: [JwtConfigModule],
  providers: [PrismaService, LeaderboardService],
  controllers: [LeaderboardController],
})
export class LeaderboardModule {}
