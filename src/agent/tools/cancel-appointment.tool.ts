import { z } from 'zod';
import { SalonService } from '../../salon/salon.service.js';
import { defineTool } from './tool.js';

export const cancelAppointmentTool = (salon: SalonService) =>
  defineTool({
    name: 'cancel_appointment',
    description: 'Cancel a booking. The salon asks the customer to confirm first, so call it once and wait.',
    input: z.object({ bookingId: z.string().regex(/^bkg_\d{4}$/, 'booking ids look like bkg_0001') }),
    confirm: async ({ bookingId }) => {
      const b = await salon.getBooking(bookingId);
      if (b.status !== 'booked') throw new Error(`Booking ${bookingId} is already ${b.status}.`);
      return `Please confirm: cancel ${b.customerName}'s ${b.service} on ${b.date} at ${b.time} with ${b.stylist}? (yes or no)`;
    },
    run: ({ bookingId }) => salon.cancel(bookingId),
  });
