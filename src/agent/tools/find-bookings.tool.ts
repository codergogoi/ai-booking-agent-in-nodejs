import { z } from 'zod';
import { SalonService } from '../../salon/salon.service.js';
import { defineTool } from './tool.js';

export const Phone = z.string().regex(/^555-\d{4}$/, 'phone numbers look like 555-0142');

export const findBookingsTool = (salon: SalonService) =>
  defineTool({
    name: 'find_bookings',
    description: "Find a customer's active bookings by phone number. Use it before changing or cancelling anything.",
    input: z.object({ phone: Phone }),
    run: ({ phone }) => salon.findBookings(phone),
  });
