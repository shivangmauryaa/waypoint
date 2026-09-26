import { z } from "zod";
import { topological } from "./engine.js";
const timestamp = z
  .string()
  .refine(
    (v) => Number.isFinite(Date.parse(v)) && /(Z|[+-]\d{2}:\d{2})$/.test(v),
    "Use an ISO timestamp with a timezone",
  );
export const bookingSchema = z.object({
  id: z.string().min(1).max(100),
  type: z.enum(["flight", "train", "transfer", "hotel", "activity", "event"]),
  title: z.string().min(1).max(200),
  provider: z.string().max(200),
  start: timestamp,
  end: timestamp,
  from: z.string().min(1).max(100),
  to: z.string().min(1).max(100),
  price: z.number().min(0).max(10000000),
  refund: z.number().min(0).max(1),
  refundDeadline: timestamp,
  dependencies: z
    .array(z.object({ id: z.string(), buffer: z.number().min(0).max(10080) }))
    .max(30),
  status: z.enum(["confirmed", "recovered"]).default("confirmed"),
  reference: z.string().max(100),
  offerId: z.string().optional(),
});
export const preferencesSchema = z.object({
  budget: z.number().min(0).max(1000000),
  priority: z.enum(["balanced", "budget", "fastest", "preserve"]),
  accessible: z.boolean(),
});
export const tripSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(200),
  subtitle: z.string().max(300),
  destination: z.string().max(100),
  travelers: z.number().int().min(1).max(20),
  start: z.iso.date(),
  end: z.iso.date(),
  bookings: z.array(bookingSchema).max(30),
});
const schema = z.object({
  trip: tripSchema,
  offers: z
    .array(
      bookingSchema.extend({
        bookingId: z.string(),
        seats: z.number().int().min(0),
        accessible: z.boolean(),
      }),
    )
    .max(300),
  preferences: preferencesSchema,
});
export function validateImport(input) {
  const value = schema.parse(input);
  const ids = value.trip.bookings.map((b) => b.id);
  if (new Set(ids).size !== ids.length)
    throw Error("Booking IDs must be unique");
  if (new Set(value.offers.map((o) => o.id)).size !== value.offers.length)
    throw Error("Offer IDs must be unique");
  for (const b of [...value.trip.bookings, ...value.offers])
    if (Date.parse(b.end) <= Date.parse(b.start))
      throw Error("Every booking must end after it starts");
  for (const o of value.offers)
    if (!ids.includes(o.bookingId) || ids.includes(o.id))
      throw Error(
        "Offers must reference an existing booking and have separate IDs",
      );
  if (value.trip.end < value.trip.start)
    throw Error("Trip end must follow its start");
  topological(value.trip.bookings);
  return value;
}
