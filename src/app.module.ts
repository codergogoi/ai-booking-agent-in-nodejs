import { Module } from '@nestjs/common';
import { AgentModule } from './agent/agent.module.js';
import { AppController } from './app.controller.js';
import { SalonModule } from './salon/salon.module.js';

@Module({
  imports: [SalonModule, AgentModule],
  controllers: [AppController],
})
export class AppModule {}
