import { Module } from '@nestjs/common';
import { JwtConfigModule } from '../../common/jwt.module';
import { UsersModule } from '../users/users.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaService } from '../../common/prisma.service';

@Module({
  imports: [UsersModule, JwtConfigModule],
  providers: [AuthService, PrismaService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
