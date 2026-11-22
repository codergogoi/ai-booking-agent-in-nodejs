import {
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { MongoClient, MongoServerError } from 'mongodb';
import { Booking, SERVICES, ServiceId, Slot } from './salon.data.js';

export interface NewBooking {
  slotId: string;
  service: ServiceId;
  customerName: string;
  phone: string;
}

@Injectable()
export class SalonService implements OnModuleInit, OnModuleDestroy {
  private readonly client = new MongoClient(process.env.MONGODB_URI ?? 'mongodb://localhost:27022/willow_salon');
  readonly db = this.client.db();
  private readonly slots = this.db.collection<Slot>('slots');
  private readonly bookings = this.db.collection<Booking>('bookings');
  private readonly counters = this.db.collection<{ _id: string; seq: number }>('counters');

  async onModuleInit() {
    await this.client.connect();
    // one active booking per slot
    await this.bookings.createIndex(
      { slotId: 1 },
      { unique: true, partialFilterExpression: { status: 'booked' }, name: 'one_booking_per_slot' },
    );
    await this.bookings.createIndex(
      { idempotencyKey: 1 },
      { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } }, name: 'idempotency_key' },
    );
  }

  async onModuleDestroy() {
    await this.client.close();
  }

  // bkg_0005, conv_0001, ...
  async nextId(prefix: string) {
    const counter = await this.counters.findOneAndUpdate(
      { _id: prefix },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: 'after' },
    );
    return `${prefix}_${String(counter!.seq).padStart(4, '0')}`;
  }

  services() {
    return SERVICES;
  }

  async freeSlots(date: string, stylist?: string) {
    const taken = await this.bookings.distinct('slotId', { status: 'booked' });
    const slots = await this.slots
      .find({ date, ...(stylist ? { stylist } : {}), _id: { $nin: taken } })
      .sort({ time: 1, stylist: 1 })
      .toArray();
    return slots.map((s) => ({ slotId: s._id, date: s.date, time: s.time, stylist: s.stylist }));
  }

  async findBookings(phone: string) {
    const found = await this.bookings.find({ phone, status: 'booked' }).sort({ _id: 1 }).toArray();
    return Promise.all(found.map((b) => this.view(b)));
  }

  async getBooking(id: string) {
    const booking = await this.bookings.findOne({ _id: id });
    if (!booking) throw new NotFoundException(`There is no booking ${id}.`);
    return this.view(booking);
  }

  async book(input: NewBooking, idempotencyKey?: string) {
    if (idempotencyKey) {
      const existing = await this.bookings.findOne({ idempotencyKey });
      if (existing) return { ...(await this.view(existing)), replayed: true };
    }
    await this.requireFreeSlot(input.slotId);
    const booking: Booking = {
      _id: await this.nextId('bkg'),
      ...input,
      status: 'booked',
      ...(idempotencyKey ? { idempotencyKey } : {}),
      createdAt: new Date(),
    };
    try {
      await this.bookings.insertOne(booking);
    } catch (err) {
      if (err instanceof MongoServerError && err.code === 11000) {
        throw new ConflictException(`Slot ${input.slotId} was just taken by someone else.`);
      }
      throw err;
    }
    return { ...(await this.view(booking)), replayed: false };
  }

  async reschedule(bookingId: string, newSlotId: string) {
    const booking = await this.requireBooked(bookingId);
    if (booking.slotId === newSlotId) return this.view(booking);
    await this.requireFreeSlot(newSlotId);
    await this.bookings.updateOne({ _id: bookingId }, { $set: { slotId: newSlotId } });
    return this.getBooking(bookingId);
  }

  async cancel(bookingId: string) {
    await this.requireBooked(bookingId);
    await this.bookings.updateOne({ _id: bookingId }, { $set: { status: 'cancelled', cancelledAt: new Date() } });
    return this.getBooking(bookingId);
  }

  private async requireBooked(bookingId: string) {
    const booking = await this.bookings.findOne({ _id: bookingId });
    if (!booking) throw new NotFoundException(`There is no booking ${bookingId}.`);
    if (booking.status !== 'booked') throw new ConflictException(`Booking ${bookingId} is already ${booking.status}.`);
    return booking;
  }

  private async requireFreeSlot(slotId: string) {
    const slot = await this.slots.findOne({ _id: slotId });
    if (!slot) throw new NotFoundException(`There is no slot ${slotId}. Check free slots first.`);
    const taken = await this.bookings.findOne({ slotId, status: 'booked' });
    if (taken) throw new ConflictException(`Slot ${slotId} is already taken.`);
    return slot;
  }

  private async view(b: Booking) {
    const slot = await this.slots.findOne({ _id: b.slotId });
    return {
      id: b._id,
      status: b.status,
      customerName: b.customerName,
      phone: b.phone,
      service: b.service,
      slotId: b.slotId,
      date: slot?.date,
      time: slot?.time,
      stylist: slot?.stylist,
    };
  }
}
