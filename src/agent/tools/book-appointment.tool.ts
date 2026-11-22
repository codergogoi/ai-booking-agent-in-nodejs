import { z } from 'zod';
import { SERVICE_IDS } from '../../salon/salon.data.js';
import { SalonService } from '../../salon/salon.service.js';
import { Phone } from './find-bookings.tool.js';
import { defineTool } from './tool.js';

export const bookAppointmentTool = (salon: SalonService) =>
  defineTool({
    name: 'book_appointment',
    description: 'Book one free slot for a customer. Needs a slotId from check_slots, the service, and the name and phone number.',
    input: z.object({
      slotId: z.string().regex(/^2026-11-2[12]-\d{4}-(maya|leo)$/, 'use a slotId exactly as check_slots returned it'),
      service: z.enum(SERVICE_IDS),
      customerName: z.string().trim().min(2),
      phone: Phone,
    }),
    // a retried call in the same conversation won't double-book
    run: (input, { conversationId }) => salon.book(input, `${conversationId}:${input.slotId}`),
  });
