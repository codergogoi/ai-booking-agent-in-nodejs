import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { SalonService } from '../salon/salon.service.js';
import { bookAppointmentTool } from './tools/book-appointment.tool.js';
import { cancelAppointmentTool } from './tools/cancel-appointment.tool.js';
import { checkSlotsTool } from './tools/check-slots.tool.js';
import { findBookingsTool } from './tools/find-bookings.tool.js';
import { rescheduleAppointmentTool } from './tools/reschedule-appointment.tool.js';
import { AgentTool, ToolContext, ToolOutcome, toDefinition } from './tools/tool.js';

@Injectable()
export class ToolsService {
  private readonly tools: AgentTool[];

  constructor(salon: SalonService) {
    this.tools = [
      checkSlotsTool(salon),
      findBookingsTool(salon),
      bookAppointmentTool(salon),
      rescheduleAppointmentTool(salon),
      cancelAppointmentTool(salon),
    ];
  }

  definitions() {
    return this.tools.map(toDefinition);
  }

  get(name: string) {
    return this.tools.find((tool) => tool.name === name);
  }

  // errors go back to the model as tool results, not as 500s
  async execute(name: string, input: unknown, context: ToolContext): Promise<ToolOutcome> {
    const tool = this.get(name);
    if (!tool) return { status: 'error', error: `There is no tool called ${name}.` };
    const parsed = tool.input.safeParse(input);
    if (!parsed.success) return { status: 'invalid', error: z.prettifyError(parsed.error) };
    try {
      return { status: 'ok', data: await tool.run(parsed.data, context) };
    } catch (err) {
      return { status: 'error', error: err instanceof Error ? err.message : String(err) };
    }
  }

  // question comes from the db, not from the model
  async confirmation(name: string, input: unknown): Promise<{ question: string } | ToolOutcome | undefined> {
    const tool = this.get(name);
    if (!tool?.confirm) return undefined;
    const parsed = tool.input.safeParse(input);
    if (!parsed.success) return { status: 'invalid', error: z.prettifyError(parsed.error) };
    try {
      return { question: await tool.confirm(parsed.data) };
    } catch (err) {
      return { status: 'error', error: err instanceof Error ? err.message : String(err) };
    }
  }
}
