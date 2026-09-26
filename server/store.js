import { readFile, writeFile, rename, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { seed } from "./seed.js";
import { hashPassword } from "./auth.js";
export const directory = resolve(process.env.DATA_DIR || "data");
await mkdir(directory, { recursive: true });
const file = resolve(directory, "store.json");
export const now = () => new Date().toISOString();
export const id = () => crypto.randomUUID();
export function record(ownerId, source = seed()) {
  return {
    ...source,
    trip: { ...source.trip, id: id() },
    ownerId,
    version: 1,
    archived: false,
    createdAt: now(),
    clock: new Date(
      Date.parse(source.trip.start + "T08:00:00+05:30") - 3600000,
    ).toISOString(),
  };
}
export function duplicateTrip(source, ownerId, name) {
  const map = new Map(source.trip.bookings.map((b) => [b.id, id()]));
  const bookings = source.trip.bookings.map((b) => ({
    ...b,
    id: map.get(b.id),
    dependencies: b.dependencies.map((d) => ({
      ...d,
      id: map.get(d.id) || d.id,
    })),
  }));
  const offers = (source.offers || []).map((o) => ({
    ...o,
    id: id(),
    bookingId: map.get(o.bookingId) || o.bookingId,
  }));
  return {
    ...structuredClone(source),
    trip: {
      ...source.trip,
      id: id(),
      name: name || `${source.trip.name} (copy)`,
      bookings,
    },
    offers,
    preferences: { ...source.preferences },
    disruptions: [],
    history: [],
    ownerId,
    version: 1,
    archived: false,
    monitoredVersion: undefined,
    createdAt: now(),
  };
}
let old;
try {
  old = JSON.parse(await readFile(file, "utf8"));
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}
if (old && old.schemaVersion !== 2)
  await writeFile(
    resolve(directory, "store-v1-backup.json"),
    JSON.stringify(old, null, 2),
  );
const makeUser = async (name, email, password, role) => ({
  id: id(),
  name,
  email,
  passwordHash: await hashPassword(password),
  role,
  active: true,
  verified: true,
  createdAt: now(),
  phone: "",
  seat: "aisle",
  cabin: "economy",
  loyalty: "",
  notifications: true,
});
export let state =
  old?.schemaVersion === 2
    ? old
    : {
        schemaVersion: 2,
        users: [
          await makeUser(
            "Alex Sharma",
            "traveler@waypoint.local",
            "TravelDemo123!",
            "user",
          ),
          await makeUser(
            "Waypoint Admin",
            "admin@waypoint.local",
            "AdminDemo123!",
            "admin",
          ),
        ],
        trips: [],
        sessions: [],
        tokens: [],
        outbox: [],
        notifications: [],
        tickets: [],
        audit: [],
        settings: { monitoring: true },
        policies: [],
        builds: [],
      };
// Older stores predate the Trip Builder module.
state.builds ||= [];
if (!old || old.schemaVersion !== 2) {
  state.trips = [record(state.users[0].id, old || seed())];
  await writeFile(file, JSON.stringify(state, null, 2));
}
// Earlier Jaipur demo data chained the dinner reservation to the next day's
// Amber Fort visit, then chained the return train to that activity. Those are
// not real schedule dependencies: cancelling dinner must leave both untouched.
function repairIndependentDayLinks(snapshot) {
  let changed = false;
  const repairBookings = (bookings = []) => {
    const dinner = bookings.find((booking) => booking.type === "event" && /dinner|restaurant/i.test(`${booking.title} ${booking.provider}`));
    const fort = bookings.find((booking) => booking.type === "activity" && /amber fort/i.test(`${booking.title} ${booking.provider}`));
    if (dinner && fort && fort.dependencies?.some((dependency) => dependency.id === dinner.id)) {
      fort.dependencies = fort.dependencies.filter((dependency) => dependency.id !== dinner.id);
      changed = true;
    }
    const train = bookings.find((booking) => booking.type === "train" && fort && booking.dependencies?.some((dependency) => dependency.id === fort.id));
    if (train && Date.parse(train.start) - Date.parse(fort.end) > 6 * 60 * 60 * 1000) {
      train.dependencies = train.dependencies.filter((dependency) => dependency.id !== fort.id);
      changed = true;
    }
  };
  for (const trip of snapshot.trips || []) {
    repairBookings(trip.trip?.bookings);
    repairBookings(trip.offers);
    for (const entry of trip.history || []) {
      repairBookings(entry.previousBookings);
      repairBookings(entry.previousOffers);
    }
  }
  return changed;
}
if (repairIndependentDayLinks(state)) {
  await writeFile(file + ".tmp", JSON.stringify(state, null, 2));
  await rename(file + ".tmp", file);
}
let queue = Promise.resolve();
export function mutate(fn) {
  const task = queue.then(async () => {
    const draft = structuredClone(state);
    const result = await fn(draft);
    await writeFile(file + ".tmp", JSON.stringify(draft, null, 2));
    await rename(file + ".tmp", file);
    state = draft;
    return result;
  });
  queue = task.catch(() => {});
  return task;
}
export function audit(s, userId, action, objectId, detail = "") {
  s.audit.unshift({ id: id(), userId, action, objectId, detail, at: now() });
}
export function notify(s, userId, tripId, title, message) {
  s.notifications.unshift({
    id: id(),
    userId,
    tripId,
    title,
    message,
    read: false,
    at: now(),
  });
  const user = s.users.find((u) => u.id === userId);
  if (user?.notifications)
    s.outbox.unshift({
      id: id(),
      to: user.email,
      subject: title,
      body: message,
      at: now(),
      status: "local-only",
    });
}
