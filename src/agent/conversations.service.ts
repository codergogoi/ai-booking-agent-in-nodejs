import { Injectable, NotFoundException } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { Collection } from 'mongodb';
import { SalonService } from '../salon/salon.service.js';
import { PendingAction } from './agent.service.js';

export interface Conversation {
  _id: string; // conv_0001
  messages: Anthropic.Beta.BetaMessageParam[];
  pending?: PendingAction | null; // a cancel waiting for yes or no
  createdAt: Date;
  updatedAt: Date;
}

// the whole messages array is stored and resent every turn
@Injectable()
export class ConversationsService {
  private readonly conversations: Collection<Conversation>;

  constructor(private readonly salon: SalonService) {
    this.conversations = salon.db.collection<Conversation>('conversations');
  }

  async create() {
    const now = new Date();
    const conversation: Conversation = { _id: await this.salon.nextId('conv'), messages: [], createdAt: now, updatedAt: now };
    await this.conversations.insertOne(conversation);
    return conversation;
  }

  async get(id: string) {
    const conversation = await this.conversations.findOne({ _id: id });
    if (!conversation) throw new NotFoundException(`There is no conversation ${id}.`);
    return conversation;
  }

  async save(conversation: Conversation) {
    const { _id, createdAt, ...changes } = conversation;
    await this.conversations.updateOne({ _id }, { $set: { ...changes, updatedAt: new Date() } });
  }

  transcript(conversation: Conversation) {
    return conversation.messages.flatMap((message) => {
      if (typeof message.content === 'string') return [`customer: ${message.content}`];
      return (message.content ?? []).flatMap((block) => {
        if (block.type === 'text') return [`${message.role === 'user' ? 'customer' : 'agent'}: ${block.text}`];
        if (block.type === 'tool_use') return [`agent -> ${block.name} ${JSON.stringify(block.input)}`];
        if (block.type === 'tool_result') return [`tool <- ${block.is_error ? 'error' : 'ok'}`];
        return [];
      });
    });
  }
}
