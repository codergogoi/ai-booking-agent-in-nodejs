export const SALON = {
  name: 'Willow Salon',
  days: ['2026-11-21', '2026-11-22'],
  hours: ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'],
  stylists: ['maya', 'leo'],
} as const;

export const SERVICES = [
  { id: 'haircut', name: 'Haircut', minutes: 45, priceUsd: 40 },
  { id: 'color', name: 'Hair color', minutes: 60, priceUsd: 85 },
  { id: 'beard', name: 'Beard trim', minutes: 30, priceUsd: 20 },
] as const;

export type ServiceId = (typeof SERVICES)[number]['id'];
export const SERVICE_IDS = SERVICES.map((s) => s.id) as [ServiceId, ...ServiceId[]];

export interface Slot {
  _id: string; // 2026-11-21-1400-maya
  date: string;
  time: string;
  stylist: string;
}

export interface Booking {
  _id: string; // bkg_0001
  slotId: string;
  service: ServiceId;
  customerName: string;
  phone: string;
  status: 'booked' | 'cancelled';
  idempotencyKey?: string;
  createdAt: Date;
  cancelledAt?: Date;
}

export const slotId = (date: string, time: string, stylist: string) =>
  `${date}-${time.replace(':', '')}-${stylist}`;

export function allSlots(): Slot[] {
  return SALON.days.flatMap((date) =>
    SALON.hours.flatMap((time) =>
      SALON.stylists.map((stylist) => ({ _id: slotId(date, time, stylist), date, time, stylist })),
    ),
  );
}

export const SEED_BOOKINGS: Omit<Booking, 'createdAt'>[] = [
  { _id: 'bkg_0001', slotId: '2026-11-22-1100-maya', service: 'haircut', customerName: 'Priya Shah', phone: '555-0101', status: 'booked' },
  { _id: 'bkg_0002', slotId: '2026-11-21-1400-maya', service: 'color', customerName: 'Tom Baker', phone: '555-0102', status: 'booked' },
  { _id: 'bkg_0003', slotId: '2026-11-21-1500-leo', service: 'haircut', customerName: 'Ana Ruiz', phone: '555-0103', status: 'booked' },
  { _id: 'bkg_0004', slotId: '2026-11-22-1400-leo', service: 'beard', customerName: 'Omar Haddad', phone: '555-0104', status: 'booked' },
];
