import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ToolsService } from './tools.service.js';

// run tools directly, no model
@Controller('agent/tools')
export class ToolsController {
  constructor(private readonly tools: ToolsService) {}

  @Get()
  list() {
    return this.tools.definitions();
  }

  @Post(':name')
  @HttpCode(200)
  run(@Param('name') name: string, @Body() input: unknown) {
    return this.tools.execute(name, input, { conversationId: 'by-hand' });
  }
}
