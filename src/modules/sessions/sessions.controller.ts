import { Body, Controller, Get, Post, UseGuards, Req, Param, ParseIntPipe } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { JwtGuard } from '../../common/jwt.guard';
import { JoinDto } from '../../common/dto/session.dto';
import { UserRequest } from '../../common/interfaces/user-request.interface';
import { ResponseUtils } from '../../common/utils/response.utils';
import { SUCCESS_MESSAGES } from '../../common/constants/success-messages.constants';
import { ApiResponse } from '../../common/interfaces/api-response.interface';

@Controller('sessions')
export class SessionsController {
  constructor(private sessions: SessionsService) {}

  @UseGuards(JwtGuard)
  @Get('current')
  async current(@Req() req: UserRequest): Promise<ApiResponse<any>> {
    const userId = req.user?.id;
    const result = await this.sessions.getCurrent(userId);
    return ResponseUtils.success(result, SUCCESS_MESSAGES.SESSION.CURRENT_SESSION_RETRIEVED);
  }

  @UseGuards(JwtGuard)
  @Get('joinable')
  async isJoinable(@Req() req: UserRequest): Promise<ApiResponse<any>> {
    const userId = req.user?.id;
    const result = await this.sessions.isSessionJoinable(userId);
    return ResponseUtils.success(result, 'Session joinability checked');
  }

  @UseGuards(JwtGuard)
  @Get('ended/:id')
  async getEndedSession(@Param('id', ParseIntPipe) id: number): Promise<ApiResponse<any>> {
    const result = await this.sessions.getEndedSession(id);
    return ResponseUtils.success(result, SUCCESS_MESSAGES.SESSION.SESSION_RESULTS_RETRIEVED);
  }

  @UseGuards(JwtGuard)
  @Get('results/:id')
  async getSessionResults(@Param('id', ParseIntPipe) id: number): Promise<ApiResponse<any>> {
    const result = await this.sessions.getSessionResults(id);
    return ResponseUtils.success(result, SUCCESS_MESSAGES.SESSION.SESSION_RESULTS_RETRIEVED);
  }

  @UseGuards(JwtGuard)
  @Post('start')
  async start(@Req() req: UserRequest): Promise<ApiResponse<any>> {
    const result = await this.sessions.start(req.user!);
    return ResponseUtils.success(result, SUCCESS_MESSAGES.SESSION.SESSION_STARTED);
  }

  @UseGuards(JwtGuard)
  @Post('join')
  async join(@Req() req: UserRequest, @Body() body: JoinDto): Promise<ApiResponse<any>> {
    const result = await this.sessions.join(req.user!.id, body.pick);
    // Check if user joined directly or was queued
    const message = result.session?.players?.some((p: any) => p.userId === req.user!.id) 
      ? SUCCESS_MESSAGES.SESSION.JOINED_SESSION 
      : SUCCESS_MESSAGES.SESSION.JOINED_QUEUE;
    return ResponseUtils.success(result, message);
  }

  @UseGuards(JwtGuard)
  @Post('leave')
  async leave(@Req() req: UserRequest): Promise<ApiResponse<any>> {
    const result = await this.sessions.leave(req.user!.id);
    return ResponseUtils.success(result, SUCCESS_MESSAGES.SESSION.LEFT_SESSION);
  }

  @UseGuards(JwtGuard)
  @Get('group-by-date')
  async grouped(): Promise<ApiResponse<any>> {
    const result = await this.sessions.getGroupedByDate();
    return ResponseUtils.success(result, SUCCESS_MESSAGES.SESSION.SESSIONS_RETRIEVED);
  }
}
