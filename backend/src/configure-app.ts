import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { Express } from 'express';
import { env } from './config/env';

export function configureApp(app: INestApplication) {
  const express = app.getHttpAdapter().getInstance() as Express;
  express.set('trust proxy', 1);
  app.enableCors({
    origin: env.CORS_ORIGIN.split(',').map((origin) => origin.trim()),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
}
