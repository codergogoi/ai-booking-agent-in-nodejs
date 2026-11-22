import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  const port = Number(process.env.PORT ?? 3500);
  await app.listen(port);
  Logger.log(`Willow Salon agent on http://localhost:${port} (LLM_MODE=${process.env.LLM_MODE ?? 'offline'})`, 'Bootstrap');
}
await bootstrap();
