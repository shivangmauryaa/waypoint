import { mutate, now, record, state } from "../server/store.js";
import { seed } from "../server/seed.js";

const tripId = "0ced9309-7135-4c3a-9595-072b47625d4e";
if (state.trips.some((entry) => entry.trip.id === tripId)) {
  console.log(`Weather demo trip already exists: ${tripId}`);
  process.exit(0);
}

const owner = state.users.find((user) => user.email === "traveler@waypoint.local") || state.users.find((user) => user.role === "user");
if (!owner) throw new Error("Create a traveler account before seeding the weather demo trip.");
const sample = record(owner.id, seed());
const makeBooking = (id, type, title, provider, day, start, end, from, to, price, dependencies = []) => ({
  id, type, title, provider,
  start: `2026-10-${day}T${start}:00+05:30`,
  end: `2026-10-${day}T${end}:00+05:30`,
  from, to, price, refund: 0.5, dependencies,
  status: "confirmed", reference: `WP-${id.toUpperCase()}26`,
  refundDeadline: "2026-10-02T23:59:00+05:30",
});
sample.trip = {
  id: tripId,
  name: "Udaipur → Bengaluru",
  subtitle: "A long weekend in the Garden City",
  destination: "Bengaluru, India",
  travelers: 1,
  start: "2026-10-03",
  end: "2026-10-06",
  bookings: [
    makeBooking("blr-flight", "flight", "Udaipur → Bengaluru", "Vistara · UK 689", "03", "11:30", "13:25", "UDR", "BLR", 8400),
    makeBooking("blr-transfer", "transfer", "Airport transfer", "Metro / Bus", "03", "14:11", "14:50", "BLR", "Bengaluru", 900, [{ id: "blr-flight", buffer: 40 }]),
    makeBooking("blr-hotel", "hotel", "Check in at Hyatt Bengaluru", "Hyatt · 3 nights", "03", "14:55", "15:25", "Bengaluru", "Bengaluru", 13500, [{ id: "blr-transfer", buffer: 5 }]),
    makeBooking("blr-palace", "activity", "Bengaluru Palace visit", "Local guide", "04", "10:00", "12:00", "Bengaluru", "Bengaluru", 2200),
    makeBooking("blr-dinner", "event", "Dinner in Indiranagar", "Local reservation", "04", "19:00", "20:30", "Bengaluru", "Bengaluru", 3100),
    makeBooking("blr-garden", "activity", "Lalbagh Botanical Garden", "Guided walk", "05", "09:30", "11:30", "Bengaluru", "Bengaluru", 1800),
    makeBooking("blr-return", "flight", "Bengaluru → Udaipur", "IndiGo · 6E 748", "06", "16:00", "18:15", "BLR", "UDR", 3200),
    makeBooking("blr-home", "transfer", "Transfer from Udaipur airport", "Airport cab", "06", "19:00", "19:30", "UDR", "Udaipur", 1133, [{ id: "blr-return", buffer: 45 }]),
  ],
};
sample.offers = [];
sample.disruptions = [];
sample.history = [];
sample.preferences.budget = 40000;
sample.clock = now();
await mutate((draft) => { draft.trips.push(sample); });
console.log(`Weather demo trip created: ${tripId}`);
