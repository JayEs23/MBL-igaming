import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { CustomValidationPipe } from './common/pipes/validation.pipe';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS
  app.enableCors({ origin: true, credentials: true });
  
  // Use cookie parser
  app.use(cookieParser());
  
  // Global exception filter for standardized error responses
  app.useGlobalFilters(new HttpExceptionFilter());
  
  // Custom validation pipe for standardized validation error responses
  app.useGlobalPipes(new CustomValidationPipe());
  
  // Response interceptor for standardized success responses
  app.useGlobalInterceptors(new ResponseInterceptor());
  
  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('MBL iGaming API')
    .setDescription('Simple game lobby API (NestJS + Prisma)')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port as number);
  console.log(`API running on http://localhost:${port}`);
  console.log(`Swagger docs available at http://localhost:${port}/docs`);
}
bootstrap();
