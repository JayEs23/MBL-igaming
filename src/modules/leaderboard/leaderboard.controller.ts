import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';
import { JwtGuard } from '../../common/jwt.guard';
import { ResponseUtils } from '../../common/utils/response.utils';
import { SUCCESS_MESSAGES } from '../../common/constants/success-messages.constants';
import { ApiResponse } from '../../common/interfaces/api-response.interface';

@Controller('leaderboard')
export class LeaderboardController {
  constructor(private leaderboard: LeaderboardService) {}

  @UseGuards(JwtGuard)
  @Get()
  async top(@Query('period') period?: 'day' | 'week' | 'month'): Promise<ApiResponse<any>> {
    const result = await this.leaderboard.top(period);
    return ResponseUtils.success(result, SUCCESS_MESSAGES.LEADERBOARD.LEADERBOARD_RETRIEVED);
  }
}
