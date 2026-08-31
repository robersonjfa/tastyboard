import type { Express, Request, Response } from 'express';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';

let server: Express | undefined;

async function bootstrap(): Promise<Express> {
  if (server) return server;

  const app = await NestFactory.create(AppModule);
  configureApp(app);
  await app.init();
  server = app.getHttpAdapter().getInstance() as Express;
  return server;
}

export const maxDuration = 60;

export default async function handler(request: Request, response: Response) {
  const instance = await bootstrap();
  instance(request, response);
}
