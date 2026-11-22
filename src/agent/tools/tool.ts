import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

export interface ToolContext {
  conversationId: string;
}

// tools with `confirm` wait for a yes from the customer before run()
export interface AgentTool<T = any> {
  name: string;
  description: string;
  input: z.ZodType<T>;
  run: (input: T, context: ToolContext) => Promise<unknown>;
  confirm?: (input: T) => Promise<string>;
}

export type ToolOutcome =
  | { status: 'ok'; data: unknown }
  | { status: 'invalid' | 'error' | 'declined'; error: string };

export const defineTool = <T>(tool: AgentTool<T>) => tool;

export function toDefinition(tool: AgentTool): Anthropic.Beta.BetaTool {
  const { $schema, ...schema } = z.toJSONSchema(tool.input, { io: 'input' });
  return { name: tool.name, description: tool.description, input_schema: schema as Anthropic.Beta.BetaTool.InputSchema };
}
