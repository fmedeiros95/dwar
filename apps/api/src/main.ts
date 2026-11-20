import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { json, static as serveStatic } from 'express';
import { pool } from '@dwar/database';
import { AppModule } from './app.module.js';
import { avatarDir } from './common/avatar-storage.js';
import { ApiExceptionFilter } from './common/exception.filter.js';
import { createRequestGuardMiddleware } from './common/security.middleware.js';

const app = await NestFactory.create(AppModule, { bodyParser: false });
app.use(helmet());
app.use('/avatars', serveStatic(avatarDir));
app.use(json({ limit: '128kb' }));
app.use(cookieParser());
app.use(createRequestGuardMiddleware());
app.setGlobalPrefix('api');
app.useGlobalFilters(new ApiExceptionFilter());
const specification = new DocumentBuilder()
  .setTitle('DWar API')
  .setVersion('0.1.0')
  .addCookieAuth('dwar_session')
  .build();
SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, specification));
app.enableShutdownHooks();
await pool.query('SELECT 1');
await app.listen(Number(process.env.API_PORT ?? 3100), '127.0.0.1');
console.log('DWar API: http://localhost:3100/api — documentação: /api/docs');
