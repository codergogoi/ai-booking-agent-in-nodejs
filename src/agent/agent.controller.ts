import { BadRequestException, Body, Controller, HttpCode, Post } from '@nestjs/common';
import { z } from 'zod';
import { LlmService } from '../llm/llm.service.js';
import { AgentService } from './agent.service.js';

export const ChatBody = z.object({ message: z.string().trim().min(1).max(2000) });

export function parse<T>(schema: z.ZodType<T>, body: unknown): T {
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new BadRequestException(z.prettifyError(parsed.error));
  return parsed.data;
}

@Controller('agent')
export class AgentController {
  constructor(
    private readonly agent: AgentService,
    private readonly llm: LlmService,
  ) {}

  // stateless, see conversations.controller for history
  @Post('chat')
  @HttpCode(200)
  async chat(@Body() body: unknown) {
    const { message } = parse(ChatBody, body);
    const result = await this.agent.run([{ role: 'user', content: message }]);
    return { mode: this.llm.mode, ...result };
  }
}
