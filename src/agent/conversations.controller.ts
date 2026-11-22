import { Body, ConflictException, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { z } from 'zod';
import { LlmService } from '../llm/llm.service.js';
import { ChatBody, parse } from './agent.controller.js';
import { AgentResult, AgentService } from './agent.service.js';
import { Conversation, ConversationsService } from './conversations.service.js';

@Controller('agent/conversations')
export class ConversationsController {
  constructor(
    private readonly agent: AgentService,
    private readonly conversations: ConversationsService,
    private readonly llm: LlmService,
  ) {}

  @Post()
  async start(@Body() body: unknown) {
    const { message } = parse(ChatBody, body);
    const conversation = await this.conversations.create();
    return this.reply(conversation._id, message);
  }

  @Post(':id/messages')
  @HttpCode(200)
  send(@Param('id') id: string, @Body() body: unknown) {
    const { message } = parse(ChatBody, body);
    return this.reply(id, message);
  }

  @Post(':id/confirm')
  @HttpCode(200)
  async confirm(@Param('id') id: string, @Body() body: unknown) {
    const { confirm } = parse(ConfirmBody, body);
    const conversation = await this.conversations.get(id);
    const pending = conversation.pending;
    if (!pending) throw new ConflictException('Nothing is waiting for confirmation.');
    conversation.pending = null;
    const result = await this.agent.resume(conversation.messages, pending, confirm, { conversationId: id });
    return this.finish(conversation, result);
  }

  @Get(':id')
  async show(@Param('id') id: string) {
    const conversation = await this.conversations.get(id);
    return { id, waitingFor: conversation.pending?.question ?? null, turns: this.conversations.transcript(conversation) };
  }

  private async reply(id: string, message: string) {
    const conversation = await this.conversations.get(id);
    if (conversation.pending) {
      throw new ConflictException(`Waiting for a yes or no first: ${conversation.pending.question}`);
    }
    conversation.messages.push({ role: 'user', content: message });
    const result = await this.agent.run(conversation.messages, { conversationId: id });
    return this.finish(conversation, result);
  }

  private async finish(conversation: Conversation, { pending, ...result }: AgentResult) {
    conversation.pending = pending ?? null;
    await this.conversations.save(conversation);
    return { conversationId: conversation._id, mode: this.llm.mode, ...result };
  }
}

const ConfirmBody = z.object({ confirm: z.boolean() });
