import { Module } from '@nestjs/common';
import { LlmService } from '../llm/llm.service.js';
import { SalonModule } from '../salon/salon.module.js';
import { AgentController } from './agent.controller.js';
import { AgentService } from './agent.service.js';
import { ConversationsController } from './conversations.controller.js';
import { ConversationsService } from './conversations.service.js';
import { ToolsController } from './tools.controller.js';
import { ToolsService } from './tools.service.js';

@Module({
  imports: [SalonModule],
  controllers: [AgentController, ToolsController, ConversationsController],
  providers: [LlmService, ToolsService, AgentService, ConversationsService],
})
export class AgentModule {}
