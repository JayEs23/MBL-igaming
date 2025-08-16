import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthDto } from '../../common/dto/auth.dto';
import { ResponseUtils } from '../../common/utils/response.utils';
import { SUCCESS_MESSAGES } from '../../common/constants/success-messages.constants';
import { ApiResponse } from '../../common/interfaces/api-response.interface';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('register')
  async register(@Body() body: AuthDto): Promise<ApiResponse<any>> {
    const result = await this.auth.register(body.username, body.fullName);
    return ResponseUtils.success(result, SUCCESS_MESSAGES.AUTH.REGISTER_SUCCESS);
  }

  @Post('login')
  async login(@Body() body: AuthDto): Promise<ApiResponse<any>> {
    const result = await this.auth.login(body.username);
    return ResponseUtils.success(result, SUCCESS_MESSAGES.AUTH.LOGIN_SUCCESS);
  }
}
