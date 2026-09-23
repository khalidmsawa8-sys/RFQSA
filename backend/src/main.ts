import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { ResponseEnvelopeInterceptor } from './domains/shared/response-envelope.interceptor';
import { GlobalExceptionFilter } from './domains/shared/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security Hardening Suite (Helmet, CORS)
  app.use(helmet());
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
    credentials: true,
  });

  // API Versioning (/api/v1/)
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Global Interceptors & Filters
  app.useGlobalInterceptors(new ResponseEnvelopeInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Input Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Auto-Generated Swagger / OpenAPI Documentation
  const config = new DocumentBuilder()
    .setTitle('منصة المشتريات B2B (RFQ Marketplace System)')
    .setDescription('Enterprise B2B RFQ Marketplace API Documentation - 100 Pillars Architecture')
    .setVersion('1.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'x-idempotency-key', in: 'header' }, 'idempotency-key')
    .build();
    
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs/api', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`🚀 B2B RFQ Marketplace Server running on: http://localhost:${port}/api/v1`);
  console.log(`📚 Swagger OpenAPI Documentation available at: http://localhost:${port}/docs/api`);
}

bootstrap();
