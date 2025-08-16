import { Module } from '@nestjs/common';
import { JwtConfigModule } from '../../common/jwt.module';
import { PrismaService } from '../../common/prisma.service';
import { SessionsService } from './sessions.service';
import { SessionsController } from './sessions.controller';

@Module({
  imports: [JwtConfigModule],
  providers: [PrismaService, SessionsService],
  controllers: [SessionsController],
  exports: [SessionsService],
})
export class SessionsModule {}
