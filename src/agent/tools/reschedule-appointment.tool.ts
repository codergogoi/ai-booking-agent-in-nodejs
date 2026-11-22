import { z } from 'zod';
import { SalonService } from '../../salon/salon.service.js';
import { defineTool } from './tool.js';

export const rescheduleAppointmentTool = (salon: SalonService) =>
  defineTool({
    name: 'reschedule_appointment',
    description: 'Move an existing booking to another free slot. The booking id stays the same.',
    input: z.object({
      bookingId: z.string().regex(/^bkg_\d{4}$/, 'booking ids look like bkg_0001'),
      newSlotId: z.string().regex(/^2026-11-2[12]-\d{4}-(maya|leo)$/, 'use a slotId exactly as check_slots returned it'),
    }),
    run: ({ bookingId, newSlotId }) => salon.reschedule(bookingId, newSlotId),
  });
