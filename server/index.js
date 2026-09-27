import express from "express";
import { resolve } from "node:path";
import { z } from "zod";
import {
  state,
  mutate,
  record,
  duplicateTrip,
  id,
  now,
  audit,
  notify,
} from "./store.js";
import {
  hashPassword,
  checkPassword,
  publicUser,
  token,
  digest,
  sessionCookie,
} from "./auth.js";
import { seed } from "./seed.js";
import { host, originAllowed, remoteAccountBlocked } from "./network.js";
import { parseConfirmation, extractPdf } from "./ingest.js";
import { brandList, loadLogo } from "./logos.js";
import * as builder from "./builder.js";
import { searchPlaces } from "./places.js";
import {
  impacted,
  recover,
  warnings,
  insights,
  risk,
  policy,
  types,
} from "./engine.js";
import {
  validateImport,
  preferencesSchema,
  bookingSchema,
  tripSchema,
} from "./schema.js";
import tripBuilder from "./tripbuilder/index.js";
import { PAGE as TRIP_BUILDER_PAGE } from "./tripbuilder/page.js";
const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "3mb" }));
const fail = (status, message) => {
  throw Object.assign(Error(message), { status });
};
app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  res.set("X-Content-Type-Options", "nosniff");
  if (!["GET", "HEAD"].includes(req.method)) {
    if (req.get("X-Waypoint-Request") !== "1")
      return res.status(403).json({ error: "Request verification missing" });
    const origin = req.get("Origin");
    if (!originAllowed(origin, req))
      return res.status(403).json({ error: "Origin not allowed" });
  }
  next();
});
const attempts = new Map();
app.use("/api/auth", (req, res, next) => {
  if (req.method === "GET") return next();
  const key = req.ip;
  const entry = attempts.get(key) || { count: 0, until: Date.now() + 900000 };
  if (entry.until < Date.now()) {
    entry.count = 0;
    entry.until = Date.now() + 900000;
  }
  entry.count++;
  attempts.set(key, entry);
  if (entry.count > 60)
    return res
      .status(429)
      .json({ error: "Too many attempts. Please wait 15 minutes." });
  next();
});
app.use("/api", (req, res, next) => {
  const raw = req.headers.cookie
    ?.split(";")
    .map((x) => x.trim())
    .find((x) => x.startsWith("waypoint_session="))
    ?.split("=")[1];
  const session =
    raw &&
    state.sessions.find(
      (s) => s.hash === digest(raw) && s.expires > Date.now(),
    );
  req.user =
    session && state.users.find((u) => u.id === session.userId && u.active);
  if (remoteAccountBlocked(req, req.user)) req.user = undefined;
  req.session = session;
  next();
});
const auth = (req, res, next) =>
  req.user
    ? next()
    : res.status(401).json({ error: "Please log in to continue" });
const admin = (req, res, next) =>
  req.user?.role === "admin"
    ? next()
    : res.status(403).json({ error: "Administrator access required" });
const credentials = z.object({
  email: z
    .email()
    .max(200)
    .transform((x) => x.toLowerCase().trim()),
  password: z.string().min(10).max(128),
});
function issue(s, userId) {
  const raw = token();
  s.sessions = s.sessions.filter((x) => x.expires > Date.now());
  s.sessions.push({
    hash: digest(raw),
    userId,
    expires: Date.now() + 604800000,
  });
  return raw;
}
function mailToken(s, user, type) {
  const raw = token();
  s.tokens = s.tokens.filter((t) => !(t.userId === user.id && t.type === type));
  s.tokens.push({
    hash: digest(raw),
    userId: user.id,
    type,
    expires: Date.now() + 3600000,
  });
  s.outbox.unshift({
    id: id(),
    to: user.email,
    subject:
      type === "verify"
        ? "Verify your Waypoint email"
        : "Reset your Waypoint password",
    body: `Open http://127.0.0.1:3001/${type}?token=${raw} within one hour. This is a local email preview; no email was sent.`,
    status: "local-only",
    at: now(),
  });
}
app.get("/api/auth/me", (req, res) =>
  res.json({ user: req.user ? publicUser(req.user) : null }),
);
app.post("/api/auth/signup", async (req, res) => {
  const input = credentials
    .extend({ name: z.string().trim().min(2).max(80) })
    .parse(req.body);
  const passwordHash = await hashPassword(input.password);
  const raw = await mutate((s) => {
    if (s.users.some((u) => u.email === input.email))
      fail(409, "An account with that email already exists");
    const user = {
      id: id(),
      name: input.name,
      email: input.email,
      passwordHash,
      role: "user",
      active: true,
      verified: false,
      createdAt: now(),
      phone: "",
      seat: "aisle",
      cabin: "economy",
      loyalty: "",
      notifications: true,
    };
    s.users.push(user);
    mailToken(s, user, "verify");
    audit(s, user.id, "account.created", user.id);
    return issue(s, user.id);
  });
  res.setHeader("Set-Cookie", sessionCookie(raw));
  res.json({ ok: true });
});
app.post("/api/auth/login", async (req, res) => {
  const input = credentials.parse(req.body);
  const user = state.users.find((u) => u.email === input.email);
  if (remoteAccountBlocked(req, user))
    fail(
      403,
      "This account is restricted to local access. Use an enabled administrator account or create a traveler account.",
    );
  if (
    !user ||
    !user.active ||
    !(await checkPassword(input.password, user.passwordHash))
  )
    fail(401, "Email or password is incorrect");
  const raw = await mutate((s) => {
    audit(s, user.id, "account.login", user.id);
    return issue(s, user.id);
  });
  res.setHeader("Set-Cookie", sessionCookie(raw));
  res.json({ ok: true });
});
app.post("/api/auth/logout", auth, async (req, res) => {
  await mutate((s) => {
    s.sessions = s.sessions.filter((x) => x.hash !== req.session.hash);
  });
  res.setHeader("Set-Cookie", sessionCookie("", 0));
  res.json({ ok: true });
});
app.post("/api/auth/forgot", async (req, res) => {
  const { email } = z.object({ email: z.email() }).parse(req.body);
  await mutate((s) => {
    const user = s.users.find(
      (u) => u.email === email.toLowerCase() && u.active,
    );
    if (user) mailToken(s, user, "reset");
  });
  res.json({
    message:
      "If the account exists, reset instructions are in the local email outbox. Ask the local administrator to open the outbox.",
  });
});
app.post("/api/auth/reset", async (req, res) => {
  const value = z
    .object({
      token: z.string().length(64),
      password: z.string().min(10).max(128),
    })
    .parse(req.body);
  const passwordHash = await hashPassword(value.password);
  await mutate((s) => {
    const t = s.tokens.find(
      (t) =>
        t.hash === digest(value.token) &&
        t.type === "reset" &&
        t.expires > Date.now(),
    );
    if (!t) fail(400, "The reset link is invalid or expired");
    s.users.find((u) => u.id === t.userId).passwordHash = passwordHash;
    s.sessions = s.sessions.filter((x) => x.userId !== t.userId);
    s.tokens = s.tokens.filter((x) => x !== t);
    audit(s, t.userId, "account.password-reset", t.userId);
  });
  res.json({ ok: true });
});
app.post("/api/auth/verify", async (req, res) => {
  const value = z.object({ token: z.string().length(64) }).parse(req.body);
  await mutate((s) => {
    const t = s.tokens.find(
      (t) =>
        t.hash === digest(value.token) &&
        t.type === "verify" &&
        t.expires > Date.now(),
    );
    if (!t) fail(400, "The verification link is invalid or expired");
    s.users.find((u) => u.id === t.userId).verified = true;
    s.tokens = s.tokens.filter((x) => x !== t);
  });
  res.json({ ok: true });
});
app.use("/api", auth);
app.put("/api/profile", async (req, res) => {
  const input = z
    .object({
      name: z.string().trim().min(2).max(80),
      phone: z.string().max(30),
      seat: z.enum(["aisle", "window", "any"]),
      cabin: z.enum(["economy", "premium", "business"]),
      loyalty: z.string().max(200),
      notifications: z.boolean(),
    })
    .parse(req.body);
  await mutate((s) => {
    Object.assign(
      s.users.find((u) => u.id === req.user.id),
      input,
    );
    audit(s, req.user.id, "profile.updated", req.user.id);
  });
  res.json({ user: publicUser(state.users.find((u) => u.id === req.user.id)) });
});
app.put("/api/password", async (req, res) => {
  const v = z
    .object({ current: z.string(), password: z.string().min(10).max(128) })
    .parse(req.body);
  if (!(await checkPassword(v.current, req.user.passwordHash)))
    fail(400, "Current password is incorrect");
  const hash = await hashPassword(v.password);
  await mutate((s) => {
    s.users.find((u) => u.id === req.user.id).passwordHash = hash;
    s.sessions = s.sessions.filter(
      (x) => x.userId !== req.user.id || x.hash === req.session.hash,
    );
    audit(s, req.user.id, "account.password-changed", req.user.id);
  });
  res.json({ ok: true });
});
app.get("/api/notifications", (req, res) =>
  res.json(state.notifications.filter((n) => n.userId === req.user.id)),
);
app.post("/api/notifications/read", async (req, res) => {
  await mutate((s) => {
    s.notifications
      .filter((n) => n.userId === req.user.id)
      .forEach((n) => (n.read = true));
  });
  res.json({ ok: true });
});
const owned = (s, req) => {
  const trip = s.trips.find((t) => t.trip.id === req.params.tripId);
  if (!trip || (trip.ownerId !== req.user.id && req.user.role !== "admin"))
    fail(404, "Trip not found");
  return trip;
};
const snapshot = (t) => ({
  ...t,
  impacts: impacted(t),
  warnings: warnings(t),
  plans: recover(t),
  insights: insights(t),
  risks: risk(t),
  policies: policy(t),
});
const summary = (t) => {
  const info = insights(t),
    risks = warnings(t),
    affected = impacted(t).filter((i) => i.affected).length;
  return {
    id: t.trip.id,
    name: t.trip.name,
    destination: t.trip.destination,
    start: t.trip.start,
    end: t.trip.end,
    travelers: t.trip.travelers,
    bookings: t.trip.bookings.length,
    disruptions: t.disruptions.length,
    archived: t.archived,
    paused: !!t.paused,
    cancelled: !!t.cancelled,
    cancelReason: t.cancelReason || "",
    ownerId: t.ownerId,
    value: info.value,
    refundable: info.refundable,
    exposure: info.refundExposure,
    daysUntil: info.daysUntil,
    warnings: risks.length,
    affected,
    riskLevel: t.archived
      ? "archived"
      : t.disruptions.length
        ? "critical"
        : risks.some((w) => w.severity === "high")
          ? "high"
          : risks.length
            ? "medium"
            : "low",
    next: info.next,
  };
};
app.get("/api/trips", (req, res) =>
  res.json(state.trips.filter((t) => t.ownerId === req.user.id).map(summary)),
);
app.get("/api/overview", (req, res) => {
  const trips = state.trips.filter((t) => t.ownerId === req.user.id),
    active = trips.filter((t) => !t.archived),
    rows = active.map((t) => ({ t, info: insights(t), risks: warnings(t) })),
    level = ({ t, risks }) =>
      t.disruptions.length
        ? "critical"
        : risks.some((w) => w.severity === "high")
          ? "high"
          : risks.length
            ? "medium"
            : "low";
  const byType = {};
  for (const { info } of rows)
    for (const [type, amount] of Object.entries(info.byType))
      byType[type] = (byType[type] || 0) + amount;
  const value = rows.reduce((n, r) => n + r.info.value, 0),
    refundable = rows.reduce((n, r) => n + r.info.refundable, 0),
    riskCounts = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const row of rows) riskCounts[level(row)]++;
  const history = trips.flatMap((t) => t.history || []);
  res.json({
    trips: trips.length,
    active: active.length,
    archived: trips.length - active.length,
    bookings: rows.reduce((n, r) => n + r.info.bookings, 0),
    travelers: rows.reduce((n, r) => n + r.info.travelers, 0),
    value,
    refundable,
    exposure: value - refundable,
    byType,
    riskCounts,
    warnings: rows.reduce((n, r) => n + r.risks.length, 0),
    disruptions: active.reduce((n, t) => n + t.disruptions.length, 0),
    upcoming: rows.filter((r) => r.info.daysUntil >= 0).length,
    departures: rows
      .map((r) => {
        const bookings = r.t.trip.bookings;
        const flight = bookings.find((booking) => booking.type === "flight" || booking.type === "train");
        return {
        id: r.t.trip.id,
        name: r.t.trip.name,
        destination: r.t.trip.destination,
        start: r.t.trip.start,
        daysUntil: r.info.daysUntil,
        riskLevel: level(r),
        travelers: r.t.trip.travelers,
        departureTime: flight ? new Date(flight.start).toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" }) : "",
        hotelNights: Math.max(0, Math.round((Date.parse(r.t.trip.end) - Date.parse(r.t.trip.start)) / 86400000)),
        hasFlight: Boolean(flight),
        hasHotel: bookings.some((booking) => booking.type === "hotel"),
        hasTransport: bookings.some((booking) => booking.type === "transfer"),
        plannedActivities: bookings.filter((booking) => booking.type === "activity").length,
        };
      })
      .sort((a, b) => a.daysUntil - b.daysUntil),
    risks: rows.flatMap((r) =>
      r.risks.map((w) => ({
        ...w,
        tripId: r.t.trip.id,
        tripName: r.t.trip.name,
      })),
    ),
    recoveries: {
      applied: history.length,
      reverted: history.filter((h) => h.undone).length,
      net: history
        .filter((h) => !h.undone)
        .reduce((n, h) => n + (h.net || 0), 0),
    },
  });
});
app.post("/api/trips", async (req, res) => {
  const input = tripSchema.omit({ id: true, bookings: true }).parse(req.body);
  if (input.end < input.start) fail(400, "Trip end must follow its start");
  const tripId = await mutate((s) => {
    const t = record(req.user.id, {
      ...seed(),
      trip: { ...input, bookings: [] },
      offers: [],
      disruptions: [],
      history: [],
    });
    s.trips.push(t);
    audit(s, req.user.id, "trip.created", t.trip.id);
    return t.trip.id;
  });
  res.json({ id: tripId });
});
app.post("/api/trips/sample", async (req, res) => {
  const tripId = await mutate((s) => {
    const t = record(req.user.id);
    s.trips.push(t);
    audit(s, req.user.id, "trip.sample-created", t.trip.id);
    return t.trip.id;
  });
  res.json({ id: tripId });
});
app.post("/api/trips/:tripId/duplicate", async (req, res) => {
  const name = z
    .object({ name: z.string().trim().min(1).max(200).optional() })
    .parse(req.body || {}).name;
  const tripId = await mutate((s) => {
    const source = owned(s, req);
    const copy = duplicateTrip(source, req.user.id, name);
    s.trips.push(copy);
    audit(s, req.user.id, "trip.duplicated", copy.trip.id, source.trip.id);
    return copy.trip.id;
  });
  res.json({ id: tripId });
});
app.delete("/api/trips/:tripId", async (req, res) => {
  await mutate((s) => {
    const t = owned(s, req);
    s.trips = s.trips.filter((x) => x.trip.id !== t.trip.id);
    s.notifications = s.notifications.filter((n) => n.tripId !== t.trip.id);
    audit(s, req.user.id, "trip.deleted", t.trip.id, t.trip.name);
  });
  res.json({ ok: true });
});
app.get("/api/trips/:tripId/state", (req, res) =>
  res.json(snapshot(owned(state, req))),
);
app.post("/api/trips/:tripId/parse", async (req, res) => {
  owned(state, req);
  const input = z
    .object({
      text: z.string().max(100000).optional(),
      pdf: z.string().max(2800000).optional(),
    })
    .parse(req.body);
  const text = input.pdf ? await extractPdf(input.pdf) : input.text;
  if (!text) fail(400, "Paste a confirmation or upload a document");
  const result = parseConfirmation(text);
  await mutate((s) =>
    audit(
      s,
      req.user.id,
      "ingestion.previewed",
      req.params.tripId,
      `${result.drafts.length} draft bookings`,
    ),
  );
  res.json(result);
});
async function change(req, res, action, fn) {
  await mutate((s) => {
    const t = owned(s, req);
    fn(t, s);
    t.version++;
    audit(s, req.user.id, action, t.trip.id);
  });
  res.json(snapshot(owned(state, req)));
}
app.put("/api/trips/:tripId", async (req, res) => {
  const v = tripSchema
    .omit({ id: true, bookings: true })
    .extend({ archived: z.boolean().optional() })
    .parse(req.body);
  if (v.end < v.start) fail(400, "Trip end must follow its start");
  await change(req, res, "trip.updated", (t) => {
    const { archived, ...fields } = v;
    Object.assign(t.trip, fields);
    if (archived !== undefined) t.archived = archived;
  });
});
app.put("/api/trips/:tripId/clock", async (req, res) => {
  const { clock } = z
    .object({ clock: z.iso.datetime({ offset: true }) })
    .parse(req.body);
  await change(req, res, "trip.clock-updated", (t) => {
    t.clock = clock;
  });
});
function validate(t) {
  validateImport(t);
}
app.post("/api/trips/:tripId/bookings", async (req, res) => {
  const b = bookingSchema.parse({ ...req.body, id: id(), status: "confirmed" });
  await change(req, res, "booking.created", (t) => {
    t.trip.bookings.push(b);
    validate(t);
  });
});
app.put("/api/trips/:tripId/bookings/:bookingId", async (req, res) => {
  const b = bookingSchema.parse({ ...req.body, id: req.params.bookingId });
  await change(req, res, "booking.updated", (t) => {
    const i = t.trip.bookings.findIndex((b) => b.id === req.params.bookingId);
    if (i < 0) fail(404, "Booking not found");
    t.trip.bookings[i] = b;
    t.offers = t.offers.filter((o) => o.bookingId !== b.id);
    t.disruptions = t.disruptions.filter((d) => d.bookingId !== b.id);
    validate(t);
  });
});
app.delete("/api/trips/:tripId/bookings/:bookingId", async (req, res) => {
  await change(req, res, "booking.removed", (t) => {
    if (
      t.trip.bookings.some((b) =>
        b.dependencies.some((d) => d.id === req.params.bookingId),
      )
    )
      fail(409, "Remove dependency links from later bookings first");
    t.trip.bookings = t.trip.bookings.filter(
      (b) => b.id !== req.params.bookingId,
    );
    t.offers = t.offers.filter((o) => o.bookingId !== req.params.bookingId);
    t.disruptions = t.disruptions.filter(
      (d) => d.bookingId !== req.params.bookingId,
    );
  });
});
app.post("/api/trips/:tripId/bookings/:bookingId/duplicate", async (req, res) => {
  await change(req, res, "booking.duplicated", (t) => {
    const source = t.trip.bookings.find(
      (b) => b.id === req.params.bookingId,
    );
    if (!source) fail(404, "Booking not found");
    t.trip.bookings.push({
      ...source,
      id: id(),
      title: `${source.title} (copy)`,
      dependencies: [],
      status: "confirmed",
      offerId: undefined,
    });
    validate(t);
  });
});
app.post("/api/trips/:tripId/offers", async (req, res) => {
  const b = bookingSchema
    .extend({
      bookingId: z.string(),
      seats: z.number().int().min(0).max(100),
      accessible: z.boolean(),
    })
    .parse({ ...req.body, id: id() });
  await change(req, res, "inventory.offer-added", (t) => {
    t.offers.push(b);
    validate(t);
  });
});
app.delete("/api/trips/:tripId/offers/:offerId", async (req, res) => {
  await change(req, res, "inventory.offer-removed", (t) => {
    t.offers = t.offers.filter((o) => o.id !== req.params.offerId);
  });
});
app.post("/api/trips/:tripId/generate-inventory", async (req, res) => {
  await change(req, res, "inventory.demo-generated", (t) => {
    t.offers = t.trip.bookings.flatMap((b) =>
      [120, 240, 360, 720, 1440].map((shift, i) => ({
        ...b,
        id: id(),
        bookingId: b.id,
        provider: `Demo ${b.provider} · option ${i + 1}`,
        start: new Date(Date.parse(b.start) + shift * 60000).toISOString(),
        end: new Date(Date.parse(b.end) + shift * 60000).toISOString(),
        price: Math.round(b.price * (1.2 - i * 0.08)),
        seats: t.trip.travelers + 2,
        accessible: i !== 4,
      })),
    );
  });
});
// Per-booking alternative search: targeted replacements for one booking only.
// Every value is derived from stored booking/offer/policy data; nothing live.
app.get("/api/trips/:tripId/bookings/:bookingId/alternatives", (req, res) => {
  const t = owned(state, req);
  const b = t.trip.bookings.find((x) => x.id === req.params.bookingId);
  if (!b) fail(404, "Booking not found");
  const p =
    policy(t).find((x) => x.id === b.id) || {
      amount: 0,
      status: "none",
      note: "",
      eligible: false,
      cancelled: false,
    };
  const clock = Date.parse(t.clock || now());
  const downstream = t.trip.bookings.filter((x) =>
    x.dependencies.some((d) => d.id === b.id),
  );
  const alternatives = t.offers
    .filter(
      (o) =>
        o.bookingId === b.id &&
        o.seats >= t.trip.travelers &&
        (!t.preferences.accessible || o.accessible) &&
        o.from === b.from &&
        o.to === b.to,
    )
    .map((o) => {
      const afterClock = Date.parse(o.start) >= clock;
      const upstream = b.dependencies.every((d) => {
        const prior = t.trip.bookings.find((x) => x.id === d.id);
        return prior && o.from === prior.to &&
          Date.parse(prior.end) + d.buffer * 60000 <= Date.parse(o.start);
      });
      const chain = upstream && downstream.every((x) => {
        const dep = x.dependencies.find((d) => d.id === b.id);
        return (
          o.to === x.from &&
          Date.parse(o.end) + dep.buffer * 60000 <= Date.parse(x.start)
        );
      });
      const feasible = afterClock && chain;
      return {
        id: o.id,
        provider: o.provider,
        title: o.title,
        start: o.start,
        end: o.end,
        price: o.price,
        seats: o.seats,
        accessible: o.accessible,
        refund: p.amount,
        difference: o.price - p.amount,
        feasible,
        note: !afterClock
          ? "Departs before the current trip clock."
          : !chain
            ? "Would break an upstream or downstream connection."
            : "Fits your current connections.",
      };
    })
    .sort(
      (a, b2) =>
        Number(b2.feasible) - Number(a.feasible) ||
        a.difference - b2.difference,
    );
  res.json({
    booking: {
      id: b.id,
      type: b.type,
      title: b.title,
      provider: b.provider,
      price: b.price,
      start: b.start,
      end: b.end,
      from: b.from,
      to: b.to,
    },
    policy: p,
    originalPrice: b.price,
    alternatives,
  });
});
// Apply a single-booking replacement (partial recovery). Unaffected bookings
// and their dependencies are left untouched.
app.post("/api/trips/:tripId/bookings/:bookingId/replace", async (req, res) => {
  const v = z.object({ offerId: z.string().min(1).max(120) }).parse(req.body);
  await change(req, res, "recovery.replaced", (t, s) => {
    const i = t.trip.bookings.findIndex((b) => b.id === req.params.bookingId);
    if (i < 0) fail(404, "Booking not found");
    const offer = t.offers.find(
      (o) => o.id === v.offerId && o.bookingId === req.params.bookingId,
    );
    if (!offer) fail(404, "That alternative is no longer available");
    const before = t.trip.bookings[i];
    if (offer.seats < t.trip.travelers || (t.preferences.accessible && !offer.accessible))
      fail(409, "This alternative no longer meets your party or accessibility needs.");
    const clock = Date.parse(t.clock || now());
    if (Date.parse(offer.start) < clock)
      fail(409, "This alternative has already departed. Refresh options and choose a later one.");
    const upstream = before.dependencies.every((d) => {
      const prior = t.trip.bookings.find((b) => b.id === d.id);
      return prior && offer.from === prior.to &&
        Date.parse(prior.end) + d.buffer * 60000 <= Date.parse(offer.start);
    });
    const downstream = t.trip.bookings
      .filter((b) => b.dependencies.some((d) => d.id === before.id))
      .every((b) => {
        const dep = b.dependencies.find((d) => d.id === before.id);
        return offer.to === b.from &&
          Date.parse(offer.end) + dep.buffer * 60000 <= Date.parse(b.start);
      });
    if (!upstream || !downstream)
      fail(409, "This option would break a connection. Refresh options and choose a feasible alternative.");
    const p = policy(t).find((x) => x.id === before.id) || { amount: 0 };
    const previousBookings = structuredClone(t.trip.bookings);
    const previousOffers = structuredClone(t.offers);
    const previousDisruptions = structuredClone(t.disruptions);
    t.trip.bookings[i] = {
      ...before,
      provider: offer.provider,
      start: offer.start,
      end: offer.end,
      price: offer.price,
      reference: offer.reference || before.reference,
      offerId: offer.id,
      status: "recovered",
    };
    t.disruptions = t.disruptions.filter((d) => d.bookingId !== before.id);
    t.history.unshift({
      id: id(),
      appliedAt: now(),
      label: `Replaced ${before.title}`,
      net: offer.price - p.amount,
      partial: true,
      changes: [
        {
          bookingId: before.id,
          title: before.title,
          before: before.start,
          after: offer.start,
          provider: offer.provider,
          cost: offer.price,
          refund: p.amount,
          reason: "Single-booking recovery",
        },
      ],
      previousBookings,
      previousOffers,
      previousDisruptions,
    });
    notify(
      s,
      t.ownerId,
      t.trip.id,
      "Recovery applied",
      `${before.title} was replaced with ${offer.provider}. Estimated additional cost INR ${offer.price - p.amount}.`,
    );
  });
});
app.post("/api/trips/:tripId/disruptions", async (req, res) => {
  const value = z
    .object({
      bookingId: z.string(),
      type: z.enum(types),
      delayMinutes: z.number().int().min(0).max(10080),
      note: z.string().max(500).default(""),
    })
    .parse(req.body);
  await change(req, res, "disruption.reported", (t, s) => {
    const b = t.trip.bookings.find((b) => b.id === value.bookingId);
    if (!b) fail(404, "Booking not found");
    t.disruptions = t.disruptions.filter(
      (d) => d.bookingId !== value.bookingId,
    );
    t.disruptions.push({ ...value, id: id(), occurredAt: t.clock || now() });
    notify(
      s,
      t.ownerId,
      t.trip.id,
      "Travel disruption",
      `${b.title}: ${value.type.replaceAll("_", " ")}. Review your recovery options.`,
    );
  });
});
app.delete("/api/trips/:tripId/disruptions", async (req, res) =>
  change(req, res, "disruption.cleared", (t) => {
    t.disruptions = [];
  }),
);
app.put("/api/trips/:tripId/preferences", async (req, res) => {
  const v = preferencesSchema.parse(req.body);
  await change(req, res, "preferences.updated", (t) => {
    t.preferences = v;
  });
});
app.post("/api/trips/:tripId/import", async (req, res) => {
  const v = validateImport(req.body);
  await change(req, res, "trip.imported", (t) => {
    const tripId = t.trip.id;
    Object.assign(t, v, { history: [], disruptions: [] });
    t.trip.id = tripId;
    t.clock = new Date(
      Date.parse(t.trip.start + "T07:00:00+05:30"),
    ).toISOString();
  });
});
app.post("/api/trips/:tripId/apply", async (req, res) => {
  const input = z
    .object({ planId: z.string(), version: z.number() })
    .parse(req.body);
  await change(req, res, "recovery.applied", (t, s) => {
    if (t.version !== input.version)
      fail(
        409,
        "Your itinerary changed. Refresh and compare the latest plans.",
      );
    const p = recover(t).find((p) => p.id === input.planId);
    if (!p) fail(409, "Plan no longer available");
    t.history.unshift({
      id: id(),
      appliedAt: now(),
      label: p.label,
      net: p.net,
      changes: p.changes,
      previousBookings: t.trip.bookings,
      previousOffers: t.offers,
      previousDisruptions: t.disruptions,
    });
    t.trip.bookings = p.bookings;
    t.offers = t.offers.filter(
      (o) => !p.bookings.some((b) => b.offerId === o.id),
    );
    t.disruptions = [];
    notify(
      s,
      t.ownerId,
      t.trip.id,
      "Recovery applied",
      `${p.label}: ${p.changes.length} local booking updates. Estimated additional cost INR ${p.net}. Supplier confirmations are not connected.`,
    );
  });
});
app.post("/api/trips/:tripId/undo", async (req, res) =>
  change(req, res, "recovery.undone", (t, s) => {
    const h = t.history[0];
    if (!h || h.undone) fail(400, "No recovery to undo");
    t.trip.bookings = h.previousBookings;
    t.offers = h.previousOffers || [];
    t.disruptions = h.previousDisruptions || [];
    h.undone = true;
    notify(
      s,
      t.ownerId,
      t.trip.id,
      "Recovery reverted",
      "Your previous itinerary was restored.",
    );
  }),
);
app.post("/api/trips/:tripId/history/:historyId/restore", async (req, res) =>
  change(req, res, "recovery.restored", (t, s) => {
    const index = t.history.findIndex((h) => h.id === req.params.historyId);
    if (index < 0) fail(404, "Recovery entry not found");
    const h = t.history[index];
    t.trip.bookings = h.previousBookings;
    t.offers = h.previousOffers || [];
    t.disruptions = h.previousDisruptions || [];
    t.history.slice(0, index + 1).forEach((x) => (x.undone = true));
    notify(
      s,
      t.ownerId,
      t.trip.id,
      "Recovery restored",
      `Reverted to the itinerary from before “${h.label}”. Later recoveries were also undone.`,
    );
  }),
);
app.post("/api/trips/:tripId/reset", async (req, res) =>
  change(req, res, "trip.reset", (t) => {
    const source = seed();
    const tripId = t.trip.id;
    const version = t.version;
    Object.assign(t, source);
    t.trip.id = tripId;
    t.version = version;
  }),
);
app.get("/api/trips/:tripId/export", (req, res) =>
  res.attachment("waypoint-trip.json").json(owned(state, req)),
);
const csvCell = (value) => {
  let text = String(value ?? "");
  if (/^[=+@-]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
};
app.get("/api/trips/:tripId/export.csv", (req, res) => {
  const t = owned(state, req);
  const rows = [
    [
      "Title",
      "Type",
      "Provider",
      "Reference",
      "From",
      "To",
      "Start",
      "End",
      "Party total INR",
      "Refund %",
      "Refund deadline",
      "Status",
      "Depends on",
    ],
    ...t.trip.bookings.map((b) => [
      b.title,
      b.type,
      b.provider,
      b.reference,
      b.from,
      b.to,
      b.start,
      b.end,
      b.price,
      Math.round(b.refund * 100),
      b.refundDeadline,
      b.status,
      b.dependencies
        .map(
          (d) => t.trip.bookings.find((x) => x.id === d.id)?.title || d.id,
        )
        .join("; "),
    ]),
  ];
  res
    .type("text/csv")
    .attachment("waypoint-itinerary.csv")
    .send("\ufeff" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n"));
});
app.get("/api/trips/:tripId/calendar", (req, res) => {
  const t = owned(state, req);
  const stamp = (d) =>
    new Date(d)
      .toISOString()
      .replaceAll("-", "")
      .replaceAll(":", "")
      .replace(".000", "");
  const esc = (s) =>
    s
      .replaceAll("\\", "\\\\")
      .replaceAll("\n", "\\n")
      .replaceAll(",", "\\,")
      .replaceAll(";", "\\;");
  res
    .type("text/calendar")
    .attachment("trip.ics")
    .send(
      [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Waypoint//Travel//EN",
        ...t.trip.bookings.flatMap((b) => [
          "BEGIN:VEVENT",
          `UID:${b.id}@waypoint`,
          `DTSTAMP:${stamp(now())}`,
          `DTSTART:${stamp(b.start)}`,
          `DTEND:${stamp(b.end)}`,
          `SUMMARY:${esc(b.title)}`,
          `LOCATION:${esc(b.to)}`,
          "END:VEVENT",
        ]),
        "END:VCALENDAR",
      ].join("\r\n"),
    );
});
app.post("/api/trips/:tripId/assistant", (req, res) => {
  const t = owned(state, req);
  const { message } = z
    .object({ message: z.string().min(1).max(2000) })
    .parse(req.body);
  const p = recover(t),
    w = warnings(t),
    hits = impacted(t).filter((i) => i.affected),
    info = insights(t);
  let answer;
  if (/cost|refund|cheap|budget/i.test(message))
    answer = p.length
      ? `The recommended plan adds INR ${p[0].net}: INR ${p[0].gross} in replacements less INR ${p[0].refund} estimated refunds. Your budget is INR ${t.preferences.budget}. Policies are illustrative; no refund has been issued.`
      : "Report a disruption to calculate replacement costs and refunds. You can adjust your budget in Preferences.";
  else if (/(next|upcoming|schedule|agenda|what.?s next)/i.test(message)) {
    const upcoming = t.trip.bookings
      .filter((b) => Date.parse(b.start) >= Date.parse(t.clock || now()))
      .sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
      .slice(0, 3);
    answer = upcoming.length
      ? `${upcoming.length} booking(s) remain after the simulation clock. Next up: ${upcoming
          .map(
            (b) =>
              `${b.title} at ${new Date(b.start).toLocaleString("en-GB", {
                timeZone: "Asia/Kolkata",
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })} IST`,
          )
          .join("; ")}.`
      : "No upcoming bookings remain after the simulation clock. Adjust the clock in Trip settings to plan earlier.";
  } else if (/how long|duration|how many days|length/i.test(message))
    answer = `${t.trip.name} runs ${t.trip.start} to ${t.trip.end} (${info.daysUntil > 0 ? `starts in ${info.daysUntil} day(s)` : "already underway"}) with ${info.bookings} bookings for ${info.travelers} travelers.`;
  else if (/total|spend|value|expens/i.test(message))
    answer = `Booked trip value is INR ${info.value} (about INR ${info.perTraveler} per traveler). Per illustrative policies, roughly INR ${info.refundable} is still refundable and INR ${info.refundExposure} is now outside refund deadlines.`;
  else if (/weather/i.test(message)) {
    const weather = t.disruptions.filter((d) => d.type === "weather");
    answer = weather.length
      ? `A weather disruption is active on ${weather
          .map(
            (d) =>
              t.trip.bookings.find((b) => b.id === d.bookingId)?.title ||
              "a booking",
          )
          .join(", ")} with a ${Math.max(
          ...weather.map((d) => d.delayMinutes || 0),
        )}-minute closure. ${p.length} recovery plan(s) are available.`
      : "No live weather feed is connected. Report a weather disruption to simulate a closure, or ask about connection risks.";
  } else if (/access/i.test(message))
    answer = t.preferences.accessible
      ? "Accessible-only is on: the recovery engine filters out replacement offers that are not marked accessible."
      : "Accessible-only is off. Turn it on in Preferences to exclude replacement offers that are not marked accessible.";
  else if (/risk|connect|warning/i.test(message))
    answer = w.length
      ? w.map((x) => x.message).join("\n")
      : "There are no tight connections in the current itinerary.";
  else if (/recover|delay|cancel|plan/i.test(message))
    answer = hits.length
      ? `${hits.length} bookings are affected. ${p.length} feasible plans were found. ${p.length ? `Recommended: ${p[0].label}, changing ${p[0].changes.length} bookings. Review it in Recovery center.` : "Try increasing your budget or adding replacement inventory. You can also open a support ticket."}`
      : "Your trip has no active disruption. Use Simulate disruption to explore a change.";
  else
    answer = `Your ${t.trip.name} trip has ${t.trip.bookings.length} bookings and ${t.trip.travelers} travelers. Ask about your schedule, recovery plans, costs, refunds, weather, accessibility, or connection risks. This assistant uses itinerary rules, not an LLM. For other requests, open a support ticket.`;
  res.json({ answer });
});
// --- Trip Builder (Manual build + Automated recovery) -----------------------
const ownedBuild = (s, req) => {
  const build = (s.builds || []).find((b) => b.id === req.params.buildId);
  if (!build || (build.ownerId !== req.user.id && req.user.role !== "admin"))
    fail(404, "Build not found");
  return build;
};
const buildSummary = (b) => {
  const cost = builder.costOf(b, undefined);
  return {
    id: b.id,
    mode: b.mode,
    status: b.status,
    phase: b.phase,
    origin: b.request.origin,
    destination: b.request.destination,
    date: b.request.date,
    returnDate: b.request.returnDate,
    travelers: b.request.travelers,
    budget: b.request.budget,
    total: cost.total,
    items: cost.itemCount,
    updatedAt: b.updatedAt,
  };
};
const requestPatch = z.object({
  origin: z.string().trim().max(60).optional(),
  destination: z.string().trim().max(60).optional(),
  date: z.iso.date().optional(),
  time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  returnDate: z.iso.date().optional(),
  travelers: z.number().int().min(1).max(20).optional(),
  budget: z.number().min(0).max(10000000).optional(),
  durationDays: z.number().int().min(1).max(14).optional(),
  radiusKm: z.number().min(0).max(200).optional(),
  preferences: z
    .object({
      activities: z.array(z.string().max(40)).max(20),
      cuisine: z.string().max(40),
      maxTravelMinutes: z.number().min(5).max(180).nullable(),
      hotelStars: z.number().min(0).max(5),
    })
    .partial()
    .optional(),
  notes: z.string().max(500).optional(),
});
app.post("/api/build", async (req, res) => {
  const input = requestPatch
    .extend({
      mode: z.enum(["manual", "auto"]).default("manual"),
      situation: z.string().trim().max(2000).optional(),
    })
    .parse(req.body);
  if (input.mode === "manual") {
    if (!input.origin || !input.destination)
      fail(400, "Add where you are leaving from and where you are going");
    if (input.origin === input.destination)
      fail(400, "Origin and destination must differ");
  }
  const buildId = await mutate((s) => {
    s.builds ||= [];
    const build = builder.newBuild(req.user.id, input);
    s.builds.unshift(build);
    if (input.mode === "auto" && input.situation)
      builder.autoMessage(build, input.situation);
    else if (input.mode === "manual")
      builder.startSearch(build, builder.CATEGORY_LIST);
    audit(
      s,
      req.user.id,
      input.mode === "auto" ? "build.auto-started" : "build.created",
      build.id,
      `${build.request.origin} → ${build.request.destination}`,
    );
    return build.id;
  });
  res.json({ id: buildId });
});
app.get("/api/places/:city", auth, async (req, res) => {
  try {
    res.set("Cache-Control", "private, max-age=300");
    res.json(await searchPlaces(req.params.city));
  } catch (error) {
    res.status(error.status || 503).json({ error: error.message || "Local places are temporarily unavailable" });
  }
});
// Real provider brand marks, resolved server-side and cached on disk. The
// client sends only a brand id, never a URL.
app.get("/api/brands", (req, res) => res.json(brandList()));
app.get("/api/logos/:brandId", async (req, res) => {
  const logo = await loadLogo(req.params.brandId);
  if (!logo)
    return res.status(404).json({ error: "No logo is available for this brand" });
  res.set("Content-Type", logo.type);
  res.set("Cache-Control", "public, max-age=604800, immutable");
  res.set("X-Logo-Cache", logo.cache);
  res.send(logo.body);
});
app.get("/api/build", (req, res) =>
  res.json(
    (state.builds || [])
      .filter((b) => b.ownerId === req.user.id)
      .map(buildSummary),
  ),
);
app.get("/api/build/:buildId", async (req, res) => {
  const result = await mutate((s) => {
    const b = ownedBuild(s, req);
    builder.autoAdvance(b);
    return builder.view(b, Date.now());
  });
  res.json(result);
});
app.post("/api/build/:buildId/search", async (req, res) => {
  const { categories, force } = z
    .object({
      categories: z.array(z.enum(builder.CATEGORY_LIST)).max(6).optional(),
      force: z.boolean().optional(),
    })
    .parse(req.body || {});
  const result = await mutate((s) => {
    const b = ownedBuild(s, req);
    builder.startSearch(
      b,
      categories?.length ? categories : builder.CATEGORY_LIST,
      Date.now(),
      !!force,
    );
    audit(s, req.user.id, "build.search-started", b.id);
    return builder.view(b, Date.now());
  });
  res.json(result);
});
app.post("/api/build/:buildId/stop", async (req, res) => {
  const { categories } = z
    .object({ categories: z.array(z.enum(builder.CATEGORY_LIST)).max(6).optional() })
    .parse(req.body || {});
  const result = await mutate((s) => {
    const b = ownedBuild(s, req);
    builder.stopSearch(b, categories?.length ? categories : builder.CATEGORY_LIST);
    return builder.view(b, Date.now());
  });
  res.json(result);
});
app.post("/api/build/:buildId/select", async (req, res) => {
  const value = z
    .object({
      category: z.enum(builder.CATEGORY_LIST),
      itemId: z.string().min(1).max(80),
    })
    .parse(req.body);
  const result = await mutate((s) => {
    const b = ownedBuild(s, req);
    builder.selectItem(b, value.category, value.itemId);
    audit(s, req.user.id, "build.item-selected", b.id, `${value.category}:${value.itemId}`);
    return builder.view(b, Date.now());
  });
  res.json(result);
});
app.post("/api/build/:buildId/remove", async (req, res) => {
  const value = z
    .object({
      category: z.enum(builder.CATEGORY_LIST),
      itemId: z.string().min(1).max(80),
    })
    .parse(req.body);
  const result = await mutate((s) => {
    const b = ownedBuild(s, req);
    builder.removeItem(b, value.category, value.itemId);
    return builder.view(b, Date.now());
  });
  res.json(result);
});
app.post("/api/build/:buildId/request", async (req, res) => {
  const patch = requestPatch.parse(req.body);
  const result = await mutate((s) => {
    const b = ownedBuild(s, req);
    const before = { ...b.request };
    Object.assign(b.request, patch);
    if (patch.preferences)
      b.request.preferences = { ...b.request.preferences, ...patch.preferences };
    const changedDestination =
      before.destination !== b.request.destination ||
      before.origin !== b.request.origin ||
      before.date !== b.request.date ||
      before.time !== b.request.time;
    const changedParty =
      before.travelers !== b.request.travelers ||
      before.returnDate !== b.request.returnDate;
    if (changedDestination || changedParty) {
      const reason = changedDestination
        ? "Search cancelled: your route or dates changed, so the old results no longer apply."
        : "Search cancelled: your party size changed, so prices were re-quoted.";
      builder.invalidateSearch(b, reason);
      builder.startSearch(b, builder.CATEGORY_LIST);
    }
    b.updatedAt = new Date().toISOString();
    audit(s, req.user.id, "build.request-updated", b.id);
    return builder.view(b, Date.now());
  });
  res.json(result);
});
app.post("/api/build/:buildId/message", async (req, res) => {
  const { message } = z
    .object({ message: z.string().trim().min(1).max(2000) })
    .parse(req.body);
  const result = await mutate((s) => {
    const b = ownedBuild(s, req);
    builder.autoMessage(b, message);
    builder.autoAdvance(b);
    return builder.view(b, Date.now());
  });
  res.json(result);
});
app.post("/api/build/:buildId/confirm", async (req, res) => {
  const result = await mutate((s) => {
    const b = ownedBuild(s, req);
    builder.confirmBuild(b);
    audit(s, req.user.id, "build.confirmed", b.id);
    return builder.view(b, Date.now());
  });
  res.json(result);
});
app.post("/api/build/:buildId/book", async (req, res) => {
  const result = await mutate((s) => {
    const b = ownedBuild(s, req);
    const attempts = builder.bookBuild(b);
    const failed = attempts.filter((a) => a.status === "FAILED").length;
    notify(
      s,
      b.ownerId,
      null,
      failed ? "Booking partially completed" : "Simulated booking completed",
      failed
        ? `${attempts.length - failed} of ${attempts.length} simulated bookings confirmed. ${failed} need attention.`
        : `${attempts.length} simulated bookings confirmed. No supplier was actually contacted.`,
    );
    audit(s, req.user.id, "build.booked", b.id, `${attempts.length} items`);
    return builder.view(b, Date.now());
  });
  res.json(result);
});
app.post("/api/build/:buildId/attempts/:attemptId/recover", async (req, res) => {
  const result = await mutate((s) => {
    const b = ownedBuild(s, req);
    builder.recoverAttempt(b, req.params.attemptId);
    audit(s, req.user.id, "build.booking-recovered", b.id, req.params.attemptId);
    return builder.view(b, Date.now());
  });
  res.json(result);
});
app.post("/api/build/:buildId/save", async (req, res) => {
  const tripId = await mutate((s) => {
    const b = ownedBuild(s, req);
    // Saving twice returns the same trip instead of creating duplicates.
    if (b.savedTripId && s.trips.some((t) => t.trip.id === b.savedTripId))
      return b.savedTripId;
    if (!b.selection.flight || !b.selection.hotel)
      fail(409, "Select at least a flight and a hotel first");
    const source = builder.toTrip(b);
    validateImport(source);
    const t = record(req.user.id, source);
    t.trip.name = String(b.request.origin) + " → " + String(b.request.destination);
    s.trips.push(t);
    b.savedTripId = t.trip.id;
    audit(s, req.user.id, "build.saved-as-trip", t.trip.id, b.id);
    notify(
      s,
      b.ownerId,
      t.trip.id,
      "Trip saved",
      `${t.trip.bookings.length} bookings were created from your Trip Builder plan. Supplier bookings remain simulated.`,
    );
    return t.trip.id;
  });
  res.json({ id: tripId });
});
app.delete("/api/build/:buildId", async (req, res) => {
  await mutate((s) => {
    const b = ownedBuild(s, req);
    s.builds = s.builds.filter((x) => x.id !== b.id);
    audit(s, req.user.id, "build.discarded", b.id);
  });
  res.json({ ok: true });
});
app.get("/api/tickets", (req, res) =>
  res.json(state.tickets.filter((t) => t.userId === req.user.id)),
);
app.get("/api/activity", (req, res) =>
  res.json(
    state.audit
      .filter((a) => a.userId === req.user.id)
      .slice(0, 25)
      .map((a) => ({ id: a.id, action: a.action, detail: a.detail, at: a.at })),
  ),
);
app.post("/api/tickets", async (req, res) => {
  const v = z
    .object({
      subject: z.string().min(3).max(200),
      message: z.string().min(5).max(3000),
      tripId: z.string().optional(),
      category: z.string().trim().max(40).optional(),
      priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
    })
    .parse(req.body);
  await mutate((s) => {
    if (
      v.tripId &&
      !s.trips.some((t) => t.trip.id === v.tripId && t.ownerId === req.user.id)
    )
      fail(404, "Trip not found");
    s.tickets.unshift({
      id: id(),
      userId: req.user.id,
      subject: v.subject,
      tripId: v.tripId,
      category: v.category || "Other",
      priority: v.priority || "normal",
      status: "open",
      createdAt: now(),
      messages: [
        { by: req.user.name, role: "user", text: v.message, at: now() },
      ],
    });
    audit(s, req.user.id, "support.opened", v.tripId);
  });
  res.json({ ok: true });
});
app.post("/api/tickets/:ticketId/reply", async (req, res) => {
  const v = z
    .object({
      message: z.string().min(1).max(3000),
      status: z.enum(["open", "resolved"]).optional(),
    })
    .parse(req.body);
  await mutate((s) => {
    const t = s.tickets.find(
      (t) =>
        t.id === req.params.ticketId &&
        (t.userId === req.user.id || req.user.role === "admin"),
    );
    if (!t) fail(404, "Ticket not found");
    t.messages.push({
      by: req.user.name,
      role: req.user.role,
      text: v.message,
      at: now(),
    });
    if (v.status) t.status = v.status;
    if (req.user.role === "admin")
      notify(s, t.userId, t.tripId, "Support reply", v.message);
    audit(s, req.user.id, "support.replied", t.id);
  });
  res.json({ ok: true });
});
app.use("/api/admin", admin);
app.get("/api/admin/overview", (req, res) =>
  res.json({
    users: state.users.map(publicUser),
    trips: state.trips.map(summary),
    tickets: state.tickets,
    audit: state.audit.slice(0, 500),
    outbox: state.outbox.slice(0, 100),
    policies: state.policies,
    settings: state.settings,
    bookings: state.trips.flatMap((t) =>
      t.trip.bookings.map((b) => ({
        id: b.id,
        tripId: t.trip.id,
        tripName: t.trip.name,
        title: b.title,
        type: b.type,
        provider: b.provider,
        from: b.from,
        to: b.to,
        start: b.start,
        price: b.price,
        status: b.status,
      })),
    ),
    disruptions: state.trips.flatMap((t) =>
      t.disruptions.map((d) => ({
        ...d,
        tripId: t.trip.id,
        tripName: t.trip.name,
        bookingTitle: t.trip.bookings.find((b) => b.id === d.bookingId)?.title,
      })),
    ),
    recoveries: state.trips.flatMap((t) =>
      t.history.map((h) => ({
        id: h.id,
        tripId: t.trip.id,
        tripName: t.trip.name,
        label: h.label,
        net: h.net,
        changes: h.changes.length,
        appliedAt: h.appliedAt,
        undone: !!h.undone,
      })),
    ),
    risks: state.trips
      .filter((t) => !t.archived)
      .flatMap((t) =>
        warnings(t).map((w) => ({
          ...w,
          tripId: t.trip.id,
          tripName: t.trip.name,
        })),
      ),
    system: {
      uptime: Math.floor(process.uptime()),
      node: process.version,
      storage: "Local JSON",
      monitorInterval: 30,
      activeSessions: state.sessions.filter((s) => s.expires > Date.now())
        .length,
    },
    metrics: {
      users: state.users.length,
      trips: state.trips.length,
      bookings: state.trips.reduce((n, t) => n + t.trip.bookings.length, 0),
      disruptions: state.trips.reduce((n, t) => n + t.disruptions.length, 0),
      recoveries: state.audit.filter((a) => a.action === "recovery.applied")
        .length,
      openTickets: state.tickets.filter((t) => t.status === "open").length,
    },
    portfolio: (() => {
      const active = state.trips.filter((t) => !t.archived);
      const rows = active.map((t) => ({ t, info: insights(t) }));
      const byType = {};
      for (const { info } of rows)
        for (const [type, amount] of Object.entries(info.byType))
          byType[type] = (byType[type] || 0) + amount;
      const value = rows.reduce((n, x) => n + x.info.value, 0);
      const refundable = rows.reduce((n, x) => n + x.info.refundable, 0);
      return {
        value,
        refundable,
        exposure: value - refundable,
        byType,
        trips: rows.map(({ t, info }) => ({
          id: t.trip.id,
          name: t.trip.name,
          destination: t.trip.destination,
          ownerId: t.ownerId,
          bookings: info.bookings,
          travelers: info.travelers,
          value: info.value,
          refundable: info.refundable,
          exposure: info.refundExposure,
          warnings: info.warnings,
          disruptions: t.disruptions.length,
        })),
      };
    })(),
    integrations: [
      {
        name: "Flight & rail status",
        status: "Demo events",
        detail: "Use a trip simulation to publish a local disruption event.",
      },
      {
        name: "Availability & reservations",
        status: "Local inventory",
        detail:
          "Admin and travelers can manage offers. No live supplier bookings.",
      },
      {
        name: "Email / SMS",
        status: "Local outbox",
        detail: "Emails are recorded here, never sent. SMS is not connected.",
      },
      {
        name: "AI assistant",
        status: "Rule-based",
        detail: "Grounded answers from the itinerary and recovery engine.",
      },
      {
        name: "Storage",
        status: "JSON active",
        detail: "Atomic file writes; one server process.",
      },
    ],
  }),
);
app.put("/api/admin/users/:userId", async (req, res) => {
  const v = z
    .object({ active: z.boolean(), role: z.enum(["user", "admin"]) })
    .parse(req.body);
  await mutate((s) => {
    const u = s.users.find((u) => u.id === req.params.userId);
    if (!u) fail(404, "User not found");
    if (u.id === req.user.id && (!v.active || v.role !== "admin"))
      fail(
        400,
        "You cannot deactivate or demote your own administrator account",
      );
    Object.assign(u, v);
    s.sessions = s.sessions.filter((x) => x.userId !== u.id);
    audit(
      s,
      req.user.id,
      "admin.user-updated",
      u.id,
      `${v.role}; active=${v.active}`,
    );
  });
  res.json({ ok: true });
});
app.post("/api/admin/policies", async (req, res) => {
  const v = z
    .object({
      provider: z.string().min(1).max(200),
      refund: z.number().min(0).max(1),
      hours: z.number().min(0).max(8760),
    })
    .parse(req.body);
  await mutate((s) => {
    s.policies = s.policies.filter((p) => p.provider !== v.provider);
    s.policies.push({ ...v, id: id() });
    let count = 0;
    for (const t of s.trips) {
      let changed = false;
      for (const b of t.trip.bookings)
        if (b.provider === v.provider) {
          b.refund = v.refund;
          b.refundDeadline = new Date(
            Date.parse(b.start) - v.hours * 3600000,
          ).toISOString();
          count++;
          changed = true;
        }
      if (changed) t.version++;
    }
    audit(
      s,
      req.user.id,
      "admin.policy-updated",
      v.provider,
      `${count} bookings updated`,
    );
  });
  res.json({ ok: true });
});
app.put("/api/admin/settings", async (req, res) => {
  const v = z.object({ monitoring: z.boolean() }).parse(req.body);
  await mutate((s) => {
    s.settings = v;
    audit(s, req.user.id, "admin.settings-updated", "settings");
  });
  res.json({ ok: true });
});
// --- Admin trip management (check / pause / cancel / archive) ---------------
const adminTrip = (s, req) => {
  const t = s.trips.find((t) => t.trip.id === req.params.tripId);
  if (!t) fail(404, "Trip not found");
  return t;
};
app.post("/api/admin/trips/:tripId/check", async (req, res) => {
  const result = await mutate((s) => {
    const t = adminTrip(s, req);
    const found = warnings(t);
    t.monitoredVersion = t.version;
    for (const w of found)
      notify(s, t.ownerId, t.trip.id, w.title, w.message);
    audit(s, req.user.id, "admin.trip-checked", t.trip.id, `${found.length} warnings`);
    return { id: t.trip.id, warnings: found.length, riskLevel: summary(t).riskLevel };
  });
  res.json(result);
});
app.post("/api/admin/trips/:tripId/monitoring", async (req, res) => {
  const v = z.object({ paused: z.boolean() }).parse(req.body);
  await mutate((s) => {
    const t = adminTrip(s, req);
    t.paused = v.paused;
    audit(s, req.user.id, v.paused ? "admin.trip-paused" : "admin.trip-resumed", t.trip.id);
  });
  res.json({ ok: true });
});
app.post("/api/admin/trips/:tripId/cancel", async (req, res) => {
  const v = z.object({ reason: z.string().trim().max(300).optional() }).parse(req.body || {});
  await mutate((s) => {
    const t = adminTrip(s, req);
    t.cancelled = true;
    t.cancelReason = v.reason || "";
    t.cancelledAt = now();
    notify(
      s,
      t.ownerId,
      t.trip.id,
      "Trip cancelled",
      v.reason
        ? `An administrator cancelled this trip: ${v.reason}`
        : "An administrator cancelled this trip.",
    );
    audit(s, req.user.id, "admin.trip-cancelled", t.trip.id, v.reason || "");
  });
  res.json({ ok: true });
});
app.post("/api/admin/trips/:tripId/archive", async (req, res) => {
  const v = z.object({ archived: z.boolean() }).parse(req.body);
  await mutate((s) => {
    const t = adminTrip(s, req);
    t.archived = v.archived;
    if (!v.archived) t.cancelled = false;
    audit(s, req.user.id, v.archived ? "admin.trip-archived" : "admin.trip-restored", t.trip.id);
  });
  res.json({ ok: true });
});
app.post("/api/admin/trips/:tripId/notify", async (req, res) => {
  const v = z.object({ message: z.string().trim().min(2).max(500) }).parse(req.body);
  await mutate((s) => {
    const t = adminTrip(s, req);
    notify(s, t.ownerId, t.trip.id, "Message from Waypoint support", v.message);
    audit(s, req.user.id, "admin.trip-notified", t.trip.id, v.message);
  });
  res.json({ ok: true });
});
app.post("/api/admin/disruptions/:tripId/:disruptionId/clear", async (req, res) => {
  await mutate((s) => {
    const t = adminTrip(s, req);
    t.disruptions = t.disruptions.filter((d) => d.id !== req.params.disruptionId);
    audit(s, req.user.id, "admin.disruption-cleared", t.trip.id, req.params.disruptionId);
  });
  res.json({ ok: true });
});
app.post("/api/admin/trips/:tripId/recover", async (req, res) => {
  const result = await mutate((s) => {
    const t = adminTrip(s, req);
    const plans = recover(t);
    const plan = plans.find((p) => p.recommended) || plans[0];
    if (!plan) fail(409, "No feasible recovery plan for this trip");
    t.history.unshift({
      id: id(),
      appliedAt: now(),
      label: plan.label,
      net: plan.net,
      changes: plan.changes,
      previousBookings: t.trip.bookings,
      previousOffers: t.offers,
      previousDisruptions: t.disruptions,
    });
    t.trip.bookings = plan.bookings;
    t.offers = t.offers.filter((o) => !plan.bookings.some((b) => b.offerId === o.id));
    t.disruptions = [];
    notify(
      s,
      t.ownerId,
      t.trip.id,
      "Recovery applied by support",
      `${plan.label}: ${plan.changes.length} booking updates. Estimated additional cost INR ${plan.net}.`,
    );
    audit(s, req.user.id, "admin.trip-recovered", t.trip.id, plan.label);
    return { ok: true, label: plan.label, net: plan.net, changes: plan.changes.length };
  });
  res.json(result);
});
const monitor = setInterval(() => {
  if (!state.settings.monitoring) return;
  mutate((s) => {
    for (const t of s.trips) {
      if (t.archived || t.cancelled || t.paused || t.monitoredVersion === t.version) continue;
      for (const w of warnings(t))
        notify(s, t.ownerId, t.trip.id, w.title, w.message);
      t.monitoredVersion = t.version;
    }
  }).catch((e) => console.error("Monitor:", e.message));
}, 30000);
monitor.unref();
app.use("/api", (req, res) =>
  res.status(404).json({ error: "Endpoint not found" }),
);
/* ---------- Trip Builder prototype (independent module) ---------- */
app.get("/temprory", (_req, res) => {
  res.set("Content-Type", "text/html; charset=utf-8");
  res.send(TRIP_BUILDER_PAGE);
});
app.use("/temprory/api", tripBuilder);
app.use("/temprory", (_req, res) => {
  res.set("Content-Type", "text/html; charset=utf-8");
  res.send(TRIP_BUILDER_PAGE);
});
app.use(express.static(resolve("dist")));
app.get("/{*path}", (req, res) => res.sendFile(resolve("dist/index.html")));
app.use((err, req, res, next) =>
  res.status(err.status || (err instanceof z.ZodError ? 400 : 409)).json({
    error:
      err instanceof z.ZodError
        ? err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
        : err.message,
  }),
);
const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Waypoint listening on 0.0.0.0:${PORT}`);
});
