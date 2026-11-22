// wipes the db and loads the weekend: all slots + 4 existing bookings
import { MongoClient } from 'mongodb';
import { SEED_BOOKINGS, allSlots } from './salon/salon.data.js';

const client = new MongoClient(process.env.MONGODB_URI ?? 'mongodb://localhost:27022/willow_salon');
await client.connect();
const db = client.db();
await db.dropDatabase();
const slots = allSlots();
await db.collection('slots').insertMany(slots as any[]);
await db.collection('bookings').insertMany(SEED_BOOKINGS.map((b) => ({ ...b, createdAt: new Date() })) as any[]);
await db.collection('counters').insertOne({ _id: 'bkg', seq: SEED_BOOKINGS.length } as any);
console.log(`Seeded ${db.databaseName}: ${slots.length} slots, ${SEED_BOOKINGS.length} bookings`);
await client.close();
