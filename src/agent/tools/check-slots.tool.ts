import { z } from 'zod';
import { SALON } from '../../salon/salon.data.js';
import { SalonService } from '../../salon/salon.service.js';
import { defineTool } from './tool.js';

export const checkSlotsTool = (salon: SalonService) =>
  defineTool({
    name: 'check_slots',
    description: 'List the free one-hour slots on one day, optionally for one stylist. Only ever offer slots this tool returned.',
    input: z.object({
      date: z.enum(SALON.days).describe('2026-11-21 is Saturday, 2026-11-22 is Sunday'),
      stylist: z.enum(SALON.stylists).optional(),
    }),
    run: ({ date, stylist }) => salon.freeSlots(date, stylist),
  });
