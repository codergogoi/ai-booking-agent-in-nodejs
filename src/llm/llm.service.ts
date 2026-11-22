import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';

export type LlmRequest = Pick<Anthropic.Beta.MessageCreateParamsNonStreaming, 'system' | 'messages' | 'tools'>;

// recorded = replayed from fixtures/, saved by an earlier live run
export type AnswerSource = 'live' | 'recorded';

export interface LlmReply {
  message: Anthropic.Beta.BetaMessage;
  source: AnswerSource;
}

const FIXTURES = join(process.cwd(), 'fixtures');

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  readonly mode = process.env.LLM_MODE === 'live' ? 'live' : 'offline';
  private readonly client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || 'offline' });

  async create(request: LlmRequest): Promise<LlmReply> {
    const key = this.fixtureKey(request);
    if (this.mode === 'offline') return this.replay(key);

    const message = await this.client.beta.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? 'claude-opus-5-5',
      max_tokens: 16000,
      output_config: { effort: 'low' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      ...request,
    });
    this.logger.log(`live ${key} stop=${message.stop_reason}`);
    this.save(key, message);
    return { message, source: 'live' };
  }

  private fixtureKey({ system, messages, tools }: LlmRequest) {
    const names = (tools ?? []).map((tool) => ('name' in tool ? tool.name : ''));
    const text = JSON.stringify({ system, names, messages });
    return createHash('sha256').update(text).digest('hex').slice(0, 16);
  }

  private save(key: string, message: Anthropic.Beta.BetaMessage) {
    mkdirSync(FIXTURES, { recursive: true });
    const fixture = { source: 'recorded', message };
    writeFileSync(join(FIXTURES, `${key}.json`), JSON.stringify(fixture, null, 2) + '\n');
  }

  private replay(key: string): LlmReply {
    const file = join(FIXTURES, `${key}.json`);
    if (!existsSync(file)) {
      throw new ServiceUnavailableException(
        `Offline mode has no saved answer for this conversation (${key}). Set LLM_MODE=live to ask Claude.`,
      );
    }
    const fixture = JSON.parse(readFileSync(file, 'utf8')) as LlmReply;
    this.logger.log(`offline ${key} (${fixture.source})`);
    return fixture;
  }
}
