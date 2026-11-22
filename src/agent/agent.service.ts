import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { AnswerSource, LlmService } from '../llm/llm.service.js';
import { ToolsService } from './tools.service.js';
import { ToolContext, ToolOutcome } from './tools/tool.js';

const SYSTEM = [
  'You are the booking assistant of Willow Salon. Stylists: Maya and Leo.',
  'The salon is open Saturday 21 and Sunday 22 November 2026, 10:00 to 17:00, one-hour appointments.',
  'Use the tools for every slot and booking. Never invent a slot or a booking.',
  'To book, you need the service, a slotId from check_slots, the customer name and phone number.',
  'To cancel, call cancel_appointment once. The salon asks the customer to confirm, never you.',
  'Keep answers short and friendly.',
].join('\n');

export interface ToolCall {
  tool: string;
  input: unknown;
  status: ToolOutcome['status'] | 'needs_confirmation';
}

export interface PendingAction {
  toolUseId: string;
  tool: string;
  input: unknown;
  question: string;
  results: Anthropic.Beta.BetaToolResultBlockParam[];
}

export interface AgentResult {
  status: 'done' | 'step_limit' | 'awaiting_confirmation';
  reply: string;
  toolCalls: ToolCall[];
  steps: number;
  source: AnswerSource;
  pending?: PendingAction;
}

@Injectable()
export class AgentService {
  private readonly maxSteps = Number(process.env.AGENT_MAX_STEPS ?? 6);

  constructor(
    private readonly llm: LlmService,
    private readonly tools: ToolsService,
  ) {}

  async run(
    messages: Anthropic.Beta.BetaMessageParam[],
    context: ToolContext = { conversationId: `chat_${randomUUID()}` },
  ): Promise<AgentResult> {
    const toolCalls: ToolCall[] = [];
    let source: AnswerSource = 'live';
    for (let step = 1; step <= this.maxSteps; step++) {
      const reply = await this.llm.create({ system: SYSTEM, messages, tools: this.tools.definitions() });
      source = reply.source;
      messages.push({ role: 'assistant', content: reply.message.content });
      if (reply.message.stop_reason !== 'tool_use') {
        return { status: 'done', reply: textOf(reply.message), toolCalls, steps: step, source };
      }

      const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
      let pending: Omit<PendingAction, 'results'> | undefined;
      for (const block of reply.message.content) {
        if (block.type !== 'tool_use') continue;
        const check = await this.tools.confirmation(block.name, block.input);
        if (check && 'question' in check) {
          pending = { toolUseId: block.id, tool: block.name, input: block.input, question: check.question };
          toolCalls.push({ tool: block.name, input: block.input, status: 'needs_confirmation' });
          continue;
        }
        const outcome = check ?? (await this.tools.execute(block.name, block.input, context));
        toolCalls.push({ tool: block.name, input: block.input, status: outcome.status });
        results.push(toolResult(block.id, outcome));
      }
      // park it until the customer answers
      if (pending) {
        const parked = { ...pending, results };
        return { status: 'awaiting_confirmation', reply: pending.question, toolCalls, steps: step, source, pending: parked };
      }
      messages.push({ role: 'user', content: results });
    }
    const reply = `Sorry, I hit the step limit (${this.maxSteps}) before I could answer.`;
    return { status: 'step_limit', reply, toolCalls, steps: this.maxSteps, source };
  }

  async resume(
    messages: Anthropic.Beta.BetaMessageParam[],
    pending: PendingAction,
    confirmed: boolean,
    context: ToolContext,
  ): Promise<AgentResult> {
    const outcome: ToolOutcome = confirmed
      ? await this.tools.execute(pending.tool, pending.input, context)
      : { status: 'declined', error: 'The customer said no. Nothing was changed.' };
    messages.push({ role: 'user', content: [...pending.results, toolResult(pending.toolUseId, outcome)] });
    const next = await this.run(messages, context);
    const call = { tool: pending.tool, input: pending.input, status: outcome.status };
    return { ...next, toolCalls: [call, ...next.toolCalls] };
  }
}

const toolResult = (id: string, outcome: ToolOutcome): Anthropic.Beta.BetaToolResultBlockParam => ({
  type: 'tool_result',
  tool_use_id: id,
  content: JSON.stringify(outcome),
  is_error: outcome.status !== 'ok',
});

const textOf = (message: Anthropic.Beta.BetaMessage) =>
  message.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n');
