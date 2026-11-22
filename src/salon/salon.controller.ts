import { BadRequestException, Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import { SERVICE_IDS } from './salon.data.js';
import { SalonService } from './salon.service.js';

const NewBookingBody = z.object({
  slotId: z.string().min(1),
  service: z.enum(SERVICE_IDS),
  customerName: z.string().min(2),
  phone: z.string().regex(/^555-\d{4}$/, 'phone numbers look like 555-0142'),
});

// plain REST, no agent involved
@Controller()
export class SalonController {
  constructor(private readonly salon: SalonService) {}

  @Get('services')
  services() {
    return this.salon.services();
  }

  @Get('slots')
  slots(@Query('date') date: string, @Query('stylist') stylist?: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? '')) throw new BadRequestException('date looks like 2026-11-21');
    return this.salon.freeSlots(date, stylist);
  }

  @Get('bookings')
  bookings(@Query('phone') phone: string) {
    return this.salon.findBookings(phone);
  }

  @Get('bookings/:id')
  booking(@Param('id') id: string) {
    return this.salon.getBooking(id);
  }

  @Post('bookings')
  book(@Body() body: unknown, @Headers('idempotency-key') key?: string) {
    const parsed = NewBookingBody.safeParse(body);
    if (!parsed.success) throw new BadRequestException(z.prettifyError(parsed.error));
    return this.salon.book(parsed.data, key);
  }
}
