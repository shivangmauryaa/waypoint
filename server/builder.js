// The shared Trip Engine behind both Trip Builder experiences.
//
//   Manual    : USER -> SELECT -> ENGINE
//   Automated : USER -> interpret -> ENGINE
//
// Both modes read and write the same normalized build object and share the
// same cost, validation, itinerary and booking code. Provider results always
// come from the simulated provider layer, never from invented values.

import {
  categories,
  timings,
  fidelity,
  search,
  providerOutage,
  cities,
  cityNames,
} from "./providers.js";

const IST = 19800000;
export const CATEGORY_LIST = categories;

export const METHODS = {
  flights: "FLIGHT_SEARCH",
  hotels: "HOTEL_SEARCH",
  transfers: "TRANSPORT_SEARCH",
  restaurants: "RESTAURANT_SEARCH",
  activities: "ACTIVITY_SEARCH",
};

export const LABELS = {
  flights: "Flights & rail",
  hotels: "Hotels",
  transfers: "Airport & local transport",
  restaurants: "Restaurants",
  activities: "Activities & attractions",
};

// --- time helpers ----------------------------------------------------------

export const fmt = (iso) => {
  const d = new Date(Date.parse(iso) + IST);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
};
export const dayOf = (iso) =>
  new Date(Date.parse(iso) + IST).toISOString().slice(0, 10);
export const plus = (iso, minutes) =>
  new Date(Date.parse(iso) + minutes * 60000).toISOString();
export const addDays = (date, n) => {
  const t = Date.parse(date + "T00:00:00+05:30") + n * 86400000;
  return new Date(t + IST).toISOString().slice(0, 10);
};
const minutesOfDay = (hhmm) => {
  const [h, m] = String(hhmm || "00:00").split(":").map(Number);
  return h * 60 + m;
};
const at = (date, hhmm) => `${date}T${hhmm}:00+05:30`;

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

// --- situation understanding (rule-based, never an LLM) --------------------

export function understand(text) {
  const value = String(text || "");
  const found = cityNames.filter((c) =>
    new RegExp(`\\b${c}\\b`, "i").test(value),
  );
  const listed = value.replaceAll(",", " ").split(/\s+/);
  const destination =
    cityNames.find((c) => new RegExp(`\\bto ${c}\\b`, "i").test(value)) ??
    (found.length > 1 ? found.at(-1) : null);
  const current =
    cityNames.find(
      (c) =>
        new RegExp(`\\b(?:in|at|from|stuck in|currently in)\\s+${c}\\b`, "i").test(
          value,
        ),
    ) ?? found.find((c) => c !== destination);
  const money = value.match(/(?:₹|rs\.?|inr)?\s*([\d,]{3,})\s*(k|thousand)?/i);
  const budget =
    /budget|₹|rs\.?|inr|have/i.test(value) && money
      ? Number(money[1].replaceAll(",", "")) * (money[2] ? 1000 : 1)
      : null;
  const travelers = /just me|solo|alone|only me/i.test(value)
    ? 1
    : (() => {
        const m = value.match(/(\d+)\s*(?:people|travellers|travelers|of us|adults)/i);
        return m ? clamp(Number(m[1]), 1, 20) : null;
      })();
  const problem =
    (/missed/i.test(value) && "missed flight") ||
    (/cancell?/i.test(value) && "cancelled booking") ||
    (/delay/i.test(value) && "delayed departure") ||
    (/stranded|stuck|lost/i.test(value) && "stranded") ||
    "disrupted journey";
  const wantsRecovery = /rebuild|recover|replan|new plan|what to do|help/i.test(value);
  return { destination, current, problem, budget, travelers, wantsRecovery, found, listed };
}

// --- build construction ----------------------------------------------------

export function newBuild(ownerId, input) {
  const now = new Date().toISOString();
  const travelers = input.travelers
    ? clamp(Number(input.travelers), 1, 20)
    : input.mode === "auto"
      ? null
      : 1;
  const date = input.date || addDays(now.slice(0, 10), 7);
  const durationDays = clamp(Number(input.durationDays) || 3, 1, 14);
  const request = {
    origin: input.origin || "",
    destination: input.destination || "",
    date,
    time: input.time || "09:00",
    returnDate: input.returnDate || addDays(date, durationDays),
    travelers,
    budget: Number(input.budget) || 0,
    durationDays,
    radiusKm: Number(input.radiusKm) || 10,
    preferences: {
      activities: Array.isArray(input.preferences?.activities)
        ? input.preferences.activities
        : [],
      cuisine: input.preferences?.cuisine || "",
      maxTravelMinutes: Number(input.preferences?.maxTravelMinutes) || null,
      hotelStars: Number(input.preferences?.hotelStars) || 0,
    },
    notes: input.notes || "",
  };
  return {
    id: crypto.randomUUID(),
    ownerId,
    mode: input.mode === "auto" ? "auto" : "manual",
    createdAt: now,
    updatedAt: now,
    phase: input.mode === "auto" ? "collect" : "configured",
    request,
    jobs: {},
    selection: {
      flight: null,
      returnFlight: null,
      hotel: null,
      transfers: [],
      restaurants: [],
      activities: [],
    },
    quotes: {},
    constraints: {
      objective: "balanced",
      maxLocalTravelMinutes: request.preferences.maxTravelMinutes,
      hotelMinStars: request.preferences.hotelStars,
      earliestStart: "09:00",
      keepFreeDay: false,
      activityKinds: [],
    },
    conversation: [],
    attempts: [],
    removedActivityIds: [],
    status: "draft",
  };
}

// --- simulated catalogue ----------------------------------------------------

// Results are regenerated from the request, never persisted, so they stay
// deterministic, de-duplicated and safe to poll.
export function catalogue(build) {
  const req = {
    ...build.request,
    travelers: build.request.travelers || 1,
    checkIn: build.request.date,
    checkOut: build.request.returnDate,
    nights: Math.max(
      1,
      Math.round(
        (Date.parse(build.request.returnDate + "T00:00:00+05:30") -
          Date.parse(build.request.date + "T00:00:00+05:30")) /
          86400000,
      ),
    ),
  };
  const out = {};
  for (const category of CATEGORY_LIST)
    out[category] = search(category, req).options;
  return out;
}

export function findItem(build, category, itemId, items) {
  const list = items || catalogue(build)[category] || [];
  return list.find((x) => x.id === itemId) || null;
}

// --- search jobs (background lifecycle) ------------------------------------

export const JOB_STATES = [
  "QUEUED",
  "SEARCHING",
  "PARTIAL",
  "COMPLETED",
  "FAILED",
  "TIMEOUT",
  "CANCELLED",
];

export function startSearch(build, cats, nowMs = Date.now(), force = false) {
  const started = new Date(nowMs).toISOString();
  for (const category of cats) {
    const existing = build.jobs[category];
    if (
      !force &&
      existing &&
      !["FAILED", "TIMEOUT", "CANCELLED"].includes(existing.state) &&
      Date.parse(existing.startedAt) + existing.etaMs > nowMs
    )
      continue;
    build.jobs[category] = {
      category,
      startedAt: started,
      etaMs: timings[category] || 3000,
      state: "SEARCHING",
      paused: false,
      outage: providerOutage(category, build.request),
      invalidatedAt: null,
      invalidatedReason: "",
    };
  }
  if (build.phase !== "booked") build.phase = "searching";
  build.updatedAt = started;
}

export function stopSearch(build, cats) {
  for (const category of cats) {
    const job = build.jobs[category];
    if (!job || ["COMPLETED", "FAILED", "CANCELLED"].includes(jobState(job)))
      continue;
    job.paused = true;
    job.state = "PARTIAL";
  }
}

// Changing the origin, destination, dates or party size invalidates every
// category that depended on the old query (Problem 12).
export function invalidateSearch(build, reason) {
  const at = new Date().toISOString();
  for (const job of Object.values(build.jobs)) {
    if (["COMPLETED", "FAILED"].includes(jobState(job))) continue;
    job.invalidatedAt = at;
    job.invalidatedReason = reason;
    job.state = "CANCELLED";
  }
  build.jobs = {};
}

export function jobState(job, nowMs = Date.now()) {
  if (job.invalidatedAt) return "CANCELLED";
  if (job.state === "CANCELLED") return "CANCELLED";
  if (job.state === "FAILED" || job.outage) return "FAILED";
  if (job.paused) return "PARTIAL";
  const elapsed = nowMs - Date.parse(job.startedAt);
  if (elapsed < 0) return "QUEUED";
  if (elapsed < job.etaMs) return "SEARCHING";
  if (elapsed < job.etaMs * 2) return "PARTIAL";
  if (job.timeout) return "TIMEOUT";
  return "COMPLETED";
}

const revealedFraction = (job, nowMs) => {
  const elapsed = nowMs - Date.parse(job.startedAt);
  if (elapsed <= 0) return 0;
  if (elapsed >= job.etaMs) return Math.min(1, 0.6 + (0.4 * (elapsed - job.etaMs)) / job.etaMs);
  return 0.6 * (elapsed / job.etaMs);
};

function jobView(build, category, total, nowMs) {
  const job = build.jobs[category];
  if (!job)
    return {
      category,
      label: LABELS[category],
      state: "QUEUED",
      total: 0,
      revealed: 0,
      etaMs: timings[category] || 3000,
      startedAt: null,
      outage: false,
      invalidatedReason: "",
    };
  const state = jobState(job, nowMs);
  const revealed =
    state === "SEARCHING" || state === "PARTIAL"
      ? Math.max(1, Math.round(total * revealedFraction(job, nowMs)))
      : state === "COMPLETED"
        ? total
        : state === "FAILED" || state === "CANCELLED"
          ? 0
          : 0;
  return {
    category,
    label: LABELS[category],
    state,
    total,
    revealed,
    etaMs: job.etaMs,
    startedAt: job.startedAt,
    outage: !!job.outage,
    invalidatedReason: job.invalidatedReason || "",
  };
}

// --- full view for the UI ---------------------------------------------------

export function view(build, nowMs = Date.now()) {
  const items = catalogue(build);
  const jobs = {};
  for (const category of CATEGORY_LIST)
    jobs[category] = jobView(build, category, items[category].length, nowMs);
  const itineraryJob = build.jobs.itinerary
    ? jobView(build, "itinerary", 1, nowMs)
    : null;
  const results = {};
  for (const category of CATEGORY_LIST)
    results[category] = items[category].slice(0, jobs[category].revealed);
  const cost = costOf(build, items);
  const schedule = scheduleOf(build, items);
  return {
    id: build.id,
    mode: build.mode,
    phase: build.phase,
    status: build.status,
    request: build.request,
    constraints: build.constraints,
    jobs,
    itineraryJob,
    totals: Object.fromEntries(
      CATEGORY_LIST.map((c) => [c, items[c].length]),
    ),
    results,
    selection: build.selection,
    cost,
    conflicts: schedule.conflicts,
    itinerary: schedule.days,
    ready: !!build.selection.flight && !!build.selection.hotel,
    conversation: build.conversation,
    attempts: build.attempts,
    bookingSummary: bookingSummary(build),
    savedTripId: build.savedTripId || "",
  };
}

// --- selection --------------------------------------------------------------

export function selectItem(build, category, itemId, inline) {
  const items = catalogue(build);
  const item = inline || findItem(build, category, itemId, items[category]);
  if (!item) throw Object.assign(Error("That option is no longer available"), { status: 404 });
  if (item.availability === "sold-out")
    throw Object.assign(Error("That option is sold out"), { status: 409 });
  const before = selectionSnapshot(build, category, item);
  if (category === "flights")
    build.selection[item.returnLeg ? "returnFlight" : "flight"] = item;
  else if (category === "hotels") build.selection.hotel = item;
  else {
    const key = category;
    if (category === "transfers")
      build.selection.transfers = [item];
    else {
      const list = build.selection[key].filter((x) => x.id !== item.id);
      if (category === "activities" && list.length >= 6)
        throw Object.assign(Error("Keep at most six activities in one build"), { status: 409 });
      if (category === "restaurants" && list.length >= 3)
        throw Object.assign(Error("Keep at most three restaurants"), { status: 409 });
      list.push(item);
      build.selection[key] = list;
    }
  }
  build.quotes[item.id] = item.price;
  if (category === "activities")
    build.removedActivityIds = build.removedActivityIds.filter((x) => x !== item.id);
  build.updatedAt = new Date().toISOString();
  if (build.phase === "searching") build.phase = "planning";
  return { before, after: item };
}

const selectionSnapshot = (build, category, item) => {
  if (category === "flights")
    return item?.returnLeg ? build.selection.returnFlight : build.selection.flight;
  if (category === "hotels") return build.selection.hotel;
  if (category === "transfers") return build.selection.transfers[0] || null;
  return build.selection[category].at(-1) || null;
};

export function removeItem(build, category, itemId) {
  if (category === "flights") {
    if (build.selection.returnFlight?.id === itemId) build.selection.returnFlight = null;
    else build.selection.flight = null;
  } else if (category === "hotels") build.selection.hotel = null;
  else if (category === "transfers") build.selection.transfers = [];
  else {
    build.selection[category] = build.selection[category].filter((x) => x.id !== itemId);
    if (category === "activities") build.removedActivityIds.push(itemId);
  }
  build.updatedAt = new Date().toISOString();
}

// --- dynamic cost engine ----------------------------------------------------

const line = (key, label, amount, fidelityLevel) => ({
  key,
  label,
  amount: Math.round(amount),
  fidelity: fidelityLevel,
});

export function costOf(build, items) {
  const list = items || catalogue(build);
  const { budget } = build.request;
  const travelers = build.request.travelers || 1;
  const sel = build.selection;
  const selectedFlight = sel.flight
    ? findItem(build, "flights", sel.flight.id, list.flights) || sel.flight
    : null;
  const selectedReturn = sel.returnFlight
    ? findItem(build, "flights", sel.returnFlight.id, list.flights) || sel.returnFlight
    : null;
  const selectedHotel = sel.hotel
    ? findItem(build, "hotels", sel.hotel.id, list.hotels) || sel.hotel
    : null;
  const lines = [];
  if (selectedFlight)
    lines.push(line("flights", "Flight / rail", selectedFlight.price, selectedFlight.fidelity));
  if (selectedReturn)
    lines.push(
      line("flights", "Return flight / rail", selectedReturn.price, selectedReturn.fidelity),
    );
  if (selectedHotel)
    lines.push(
      line(
        "hotels",
        `Hotel · ${selectedHotel.nights} night${selectedHotel.nights === 1 ? "" : "s"}`,
        selectedHotel.price,
        selectedHotel.fidelity,
      ),
    );
  const transfers = sel.transfers.map(
    (t) => findItem(build, "transfers", t.id, list.transfers) || t,
  );
  if (transfers.length)
    lines.push(
      line("transfers", "Airport transfer", transfers.reduce((n, t) => n + t.price, 0), fidelity.ESTIMATED),
    );
  if (sel.activities.length) {
    const estimatedLocal = sel.activities.length * 90 * travelers;
    lines.push(line("local", "Local transport (estimated)", estimatedLocal, fidelity.ESTIMATED));
  }
  if (sel.restaurants.length)
    lines.push(
      line(
        "restaurants",
        "Food (estimate)",
        sel.restaurants.reduce((n, r) => n + (r.price || 0), 0),
        fidelity.ESTIMATED,
      ),
    );
  if (sel.activities.length)
    lines.push(
      line(
        "activities",
        `${sel.activities.length} activit${sel.activities.length === 1 ? "y" : "ies"}`,
        sel.activities.reduce((n, a) => n + (a.price || 0), 0),
        sel.activities.some((a) => a.priceUnknown) ? fidelity.ESTIMATED : fidelity.SIMULATED,
      ),
    );
  const unpriced = [...sel.restaurants, ...sel.activities]
    .filter((item) => item.priceUnknown)
    .map((item) => item.name);
  const subtotal = lines.reduce((n, l) => n + l.amount, 0);
  if (subtotal > 0) lines.push(line("fees", "Taxes & fees (3.5%)", subtotal * 0.035, fidelity.ESTIMATED));
  const total = lines.reduce((n, l) => n + l.amount, 0);
  const changed = [];
  for (const item of [
    selectedFlight,
    selectedReturn,
    selectedHotel,
    ...transfers,
    ...sel.restaurants,
    ...sel.activities,
  ])
    if (item) {
      const quoted = build.quotes[item.id];
      if (typeof quoted === "number" && quoted !== item.price)
        changed.push({
          id: item.id,
          title: item.name || item.title || item.vehicle,
          from: quoted,
          to: item.price,
          delta: item.price - quoted,
        });
    }
  return {
    lines,
    subtotal,
    total,
    budget: Number(budget) || 0,
    remaining: (Number(budget) || 0) - total,
    overBudget: !!budget && total > budget,
    overBy: budget ? Math.max(0, total - budget) : 0,
    changed,
    unpriced,
    itemCount:
      (selectedFlight ? 1 : 0) +
      (selectedReturn ? 1 : 0) +
      (selectedHotel ? 1 : 0) +
      transfers.length +
      sel.restaurants.length +
      sel.activities.length,
  };
}

// --- itinerary generation + schedule validation ----------------------------

const travelMinutes = (km) => Math.max(12, Math.min(75, Math.round((km / 22) * 60)));

export function scheduleOf(build, items) {
  const list = items || catalogue(build);
  const sel = build.selection;
  const req = build.request;
  const conflicts = [];
  const days = [];
  const outbound = sel.flight;
  const hotel = sel.hotel;
  const transfer = sel.transfers[0] || null;
  const restaurants = sel.restaurants;
  const activities = sel.activities.filter(
    (a) => !build.removedActivityIds.includes(a.id),
  );
  const returnLeg =
    (sel.returnFlight &&
      (list.flights.find((f) => f.id === sel.returnFlight.id) || sel.returnFlight)) ||
    null;
  const ready = !!outbound && !!hotel;

  const push = (day, event) => day.events.push(event);
  const makeDay = (date) => {
    const d = { date, events: [] };
    days.push(d);
    return d;
  };

  const day1 = makeDay(req.date);
  if (!outbound) {
    conflicts.push({
      level: "info",
      code: "no-transport",
      message: "Choose a flight, train or bus so the schedule knows when you arrive.",
    });
  } else {
    push(day1, {
      time: fmt(outbound.departAt),
      at: outbound.departAt,
      kind: "transport",
      category: "flights",
      itemId: outbound.id,
      title: `${outbound.origin} → ${outbound.destination}`,
      subtitle: `${outbound.source} · ${outbound.code} · ${outbound.durationMinutes} min${outbound.stops ? ` · ${outbound.stops} stop` : " · nonstop"}`,
    });
    if (Date.parse(outbound.departAt) < Date.parse(at(req.date, req.time)))
      conflicts.push({
        level: "warning",
        code: "departure-too-soon",
        itemId: outbound.id,
        message: `${outbound.code} departs at ${fmt(outbound.departAt)}, before your ${req.time} start. Allow time to reach the airport.`,
      });
    if (outbound.availability === "limited")
      conflicts.push({
        level: "info",
        code: "limited-seats",
        itemId: outbound.id,
        message: `${outbound.code} has limited seats left. Price is only held while this build stays open.`,
      });
    push(day1, {
      time: fmt(outbound.arriveAt),
      at: outbound.arriveAt,
      kind: "arrive",
      category: "flights",
      itemId: outbound.id,
      title: `Arrive in ${outbound.destination}`,
      subtitle: `${outbound.destinationCode} · baggage ${outbound.baggageKg || 0} kg`,
    });
    let cursor = outbound.arriveAt;
    if (transfer) {
      push(day1, {
        time: fmt(cursor),
        at: cursor,
        kind: "transfer",
        category: "transfers",
        itemId: transfer.id,
        title: `${transfer.source} · ${transfer.vehicle}`,
        subtitle: `${outbound.destinationCode} → ${hotel ? hotel.name : "hotel"} · ₹${transfer.price} · ${transfer.etaMinutes} min`,
      });
      cursor = plus(cursor, transfer.etaMinutes);
    } else if (hotel) {
      const wait = 35;
      conflicts.push({
        level: "info",
        code: "no-transfer",
        message: `Add airport transport — we assumed a ${wait}-minute taxi wait for the plan.`,
      });
      cursor = plus(cursor, wait);
    }
    if (hotel) {
      const checkInISO = cursor;
      push(day1, {
        time: fmt(checkInISO),
        at: checkInISO,
        kind: "hotel",
        category: "hotels",
        itemId: hotel.id,
        title: `Check in at ${hotel.name}`,
        subtitle: `${hotel.stars}★ · ${hotel.roomType} · ₹${hotel.pricePerNight}/night`,
      });
      const minutes = minutesOfDay(fmt(checkInISO));
      if (minutes > 23 * 60 + 30)
        conflicts.push({
          level: "error",
          code: "checkin-missed",
          itemId: hotel.id,
          message: `You would reach ${hotel.name} at ${fmt(checkInISO)}, after its ${hotel.checkInTime} check-in desk closes. Pick an earlier arrival or another hotel.`,
        });
      cursor = plus(checkInISO, 60);
    } else {
      conflicts.push({
        level: "info",
        code: "no-hotel",
        message: "Choose a hotel to place check-in, dinner and the rest of the day.",
      });
    }
    const dinner = restaurants[0];
    if (hotel && dinner) {
      const dinnerAt = plus(cursor, 90);
      const minutes = minutesOfDay(fmt(dinnerAt));
      const closed = minutes >= dinner.closesAtMinutes;
      push(day1, {
        time: fmt(dinnerAt),
        at: dinnerAt,
        kind: "meal",
        category: "restaurants",
        itemId: dinner.id,
        title: `Dinner · ${dinner.name}`,
        subtitle: closed
          ? `Closes ${dinner.closeTime} — incompatible with this arrival`
          : `${dinner.cuisine} · ${dinner.priceBand} · ₹${dinner.price}`,
      });
      if (closed)
        conflicts.push({
          level: "warning",
          code: "restaurant-closed",
          itemId: dinner.id,
          message: `${dinner.name} closes at ${dinner.closeTime}, but you would arrive around ${fmt(dinnerAt)}. Choose another restaurant.`,
        });
    }
    push(day1, {
      time: "22:30",
      at: at(req.date, "22:30"),
      kind: "rest",
      title: "Rest",
      subtitle: hotel ? hotel.name : "Hotel",
    });
  }

  const middleDays = Math.max(0, req.durationDays - 2);
  let queue = [...activities];
  for (let i = 1; i <= middleDays; i++) {
    const date = addDays(req.date, i);
    const day = makeDay(date);
    push(day, {
      time: build.constraints.earliestStart === "09:00" ? "08:00" : "09:30",
      at: at(date, build.constraints.earliestStart === "09:00" ? "08:00" : "09:30"),
      kind: "meal",
      title: "Breakfast",
      subtitle: hotel ? `At ${hotel.name}` : "Included where available",
    });
    if (build.constraints.keepFreeDay && i === middleDays) {
      push(day, {
        time: "10:00",
        at: at(date, "10:00"),
        kind: "free",
        title: "Free day",
        subtitle: "Kept clear at your request",
      });
      push(day, {
        time: "19:30",
        at: at(date, "19:30"),
        kind: "meal",
        category: restaurants[0] ? "restaurants" : undefined,
        itemId: restaurants[0]?.id,
        title: restaurants[0] ? `Dinner · ${restaurants[0].name}` : "Dinner at leisure",
        subtitle: "No fixed booking",
      });
      continue;
    }
    // Three blocks: morning, afternoon and an evening block for night-time
    // activities. A visit that cannot fit waits for opening time, moves to the
    // next block, or rolls over to the next day — it is never silently dropped.
    const blocks = [
      {
        start: Math.max(minutesOfDay(build.constraints.earliestStart), 9 * 60),
        end: 12 * 60 + 30,
      },
      { start: 14 * 60, end: 17 * 60 + 30 },
      { start: 19 * 60, end: 22 * 60 + 30, evening: true },
    ];
    let cursor = blocks[0].start;
    let block = 0;
    let eveningActivity = false;
    while (block < blocks.length) {
      const activity = queue[0];
      if (!activity) break;
      const b = blocks[block];
      const travel = travelMinutes(activity.distanceKm);
      if (
        build.constraints.maxLocalTravelMinutes &&
        travel > build.constraints.maxLocalTravelMinutes
      ) {
        conflicts.push({
          level: "warning",
          code: "travel-too-long",
          itemId: activity.id,
          message: `${activity.name} is about ${travel} min away — beyond your ${build.constraints.maxLocalTravelMinutes} min limit.`,
        });
        queue.shift();
        continue;
      }
      const opens = minutesOfDay(activity.openTime);
      if (b.evening && opens < 17 * 60) break;
      let startMinutes = Math.max(cursor, b.start) + travel;
      if (startMinutes < opens) startMinutes = opens;
      const endMinutes = startMinutes + activity.durationMinutes;
      const closesAt = Math.min(
        activity.closeMinutes > opens ? activity.closeMinutes : 23 * 60 + 30,
        23 * 60 + 30,
      );
      if (endMinutes > b.end || endMinutes > closesAt) {
        if (block < blocks.length - 1) {
          block++;
          cursor = blocks[block].start;
          continue;
        }
        break;
      }
      const startISO = at(
        date,
        `${String(Math.floor(startMinutes / 60)).padStart(2, "0")}:${String(startMinutes % 60).padStart(2, "0")}`,
      );
      push(day, {
        time: fmt(startISO),
        at: startISO,
        kind: "activity",
        category: "activities",
        itemId: activity.id,
        title: activity.name,
        subtitle: `${activity.activityKind} · ${Math.round(activity.durationMinutes / 60)}h · ₹${activity.price} · ${travel} min travel`,
      });
      if (b.evening) eveningActivity = true;
      queue.shift();
      cursor = endMinutes + 15;
      if (cursor >= b.end) {
        block++;
        if (block < blocks.length) cursor = blocks[block].start;
      }
    }
    if (!day.events.some((e) => e.kind === "activity"))
      push(day, {
        time: "10:30",
        at: at(date, "10:30"),
        kind: "free",
        title: "Free time",
        subtitle: "Nothing scheduled",
      });
    push(day, {
      time: "12:45",
      at: at(date, "12:45"),
      kind: "meal",
      category: restaurants[1] ? "restaurants" : undefined,
      itemId: restaurants[1]?.id,
      title: restaurants[1] ? `Lunch · ${restaurants[1].name}` : "Lunch",
      subtitle: restaurants[1] ? `${restaurants[1].cuisine} · ₹${restaurants[1].price}` : "Wherever you like",
    });
    if (restaurants[2])
      push(day, {
        time: "16:30",
        at: at(date, "16:30"),
        kind: "meal",
        title: `Snack · ${restaurants[2].name}`,
        subtitle: `${restaurants[2].cuisine} · ${restaurants[2].priceBand} · ₹${restaurants[2].price}`,
      });
    push(day, {
      time: "17:45",
      at: at(date, "17:45"),
      kind: "rest",
      title: "Rest & refresh",
      subtitle: hotel ? `Back at ${hotel.name}` : "",
    });
    if (eveningActivity)
      push(day, {
        time: "22:45",
        at: at(date, "22:45"),
        kind: "meal",
        title: "Late dinner",
        subtitle: "After your evening activity",
      });
    else
      push(day, {
        time: "19:45",
        at: at(date, "19:45"),
        kind: "meal",
        category: restaurants[0] ? "restaurants" : undefined,
        itemId: restaurants[0]?.id,
        title: restaurants[0] ? `Dinner · ${restaurants[0].name}` : "Dinner",
        subtitle: restaurants[0]
          ? `${restaurants[0].cuisine} · ₹${restaurants[0].price}`
          : "At leisure",
      });
  }

  const last = makeDay(addDays(req.date, Math.max(1, req.durationDays - 1)));
  push(last, {
    time: "08:30",
    at: at(last.date, "08:30"),
    kind: "meal",
    title: "Breakfast & check-out",
    subtitle: hotel ? `${hotel.name} · check-out by ${hotel.checkOutTime}` : "",
  });
  if (returnLeg) {
    const activityEnds = days
      .flatMap((d) => d.events)
      .filter((e) => e.kind === "activity")
      .at(-1);
    if (activityEnds && Date.parse(activityEnds.at) > Date.parse(returnLeg.departAt) - 90 * 60000)
      conflicts.push({
        level: "error",
        code: "activity-after-departure",
        itemId: returnLeg.id,
        message: `${activityEnds.title} ends after your return departure at ${fmt(returnLeg.departAt)}. Move it earlier or choose a later return.`,
      });
    push(last, {
      time: fmt(returnLeg.departAt),
      at: returnLeg.departAt,
      kind: "transport",
      category: "flights",
      itemId: returnLeg.id,
      title: `${returnLeg.origin} → ${returnLeg.destination}`,
      subtitle: `Return · ${returnLeg.source} · ${returnLeg.code}`,
    });
  } else {
    push(last, {
      time: "11:00",
      at: at(last.date, "11:00"),
      kind: "free",
      title: "Return journey",
      subtitle: "No return transport selected yet",
    });
  }
  if (queue.length)
    conflicts.push({
      level: "warning",
      code: "activities-do-not-fit",
      message: `${queue.length} activity(ies) do not fit the current ${req.durationDays}-day plan (${queue.map((a) => a.name).join(", ")}). Add a day, remove one, or shorten a visit.`,
    });
  for (const r of restaurants)
    if (!days.some((d) => d.events.some((e) => e.itemId === r.id)))
      conflicts.push({
        level: "info",
        code: "restaurant-unplaced",
        itemId: r.id,
        message: `${r.name} is selected but not placed in the plan yet. Add a day or replace another meal.`,
      });
  return { days, conflicts, ready };
}

// --- natural-language constraints (rule-based) ------------------------------

const titleCase = (text) =>
  text
    .split(" ")
    .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");

const ACTIVITY_WORDS =
  /(water park|snow park|national park|theme park|museum|fort|palace|beach|shopping|walking tour|adventure|nightlife|temple|garden)/i;

export function parseConstraint(text) {
  const v = String(text || "");
  const patch = {};
  const notes = [];
  const money = v.match(/(\d[\d,]{2,})\s*(k|thousand)?/i);
  if (
    money &&
    /budget|under|below|within|not more than|spend/i.test(v) &&
    !/more than \d+\s*min/i.test(v)
  ) {
    patch.budgetMax =
      Number(money[1].replaceAll(",", "")) * (money[2] ? 1000 : 1);
    notes.push(`keep the total at or under ₹${patch.budgetMax.toLocaleString("en-IN")}`);
  }
  if (/cheap|save money|lower.*cost|reduce.*cost|less expensive|affordable|budget option/i.test(v)) {
    patch.objective = "cheapest";
    notes.push("prefer the cheaper options");
  }
  if (/fastest|quickest|shortest|minimum travel time/i.test(v)) {
    patch.objective = "fastest";
    notes.push("minimise travel time");
  }
  if (/comfort|relax|not rush/i.test(v)) {
    patch.objective = "comfort";
    notes.push("prefer comfort over price");
  }
  if (/more (activity|activities|sightseeing|adventure|things to do)/i.test(v)) {
    patch.moreActivities = true;
    notes.push("add more things to do");
  }
  const stars = v.match(/(\d)\s*star/i);
  if (stars) {
    patch.hotelMinStars = clamp(Number(stars[1]), 1, 5);
    notes.push(`hotel of at least ${patch.hotelMinStars}★`);
  } else if (/better hotel|nicer hotel|upgrade.*hotel|luxury/i.test(v)) {
    patch.hotelMinStars = 4;
    notes.push("hotel of at least 4★");
  }
  const mins = v.match(/(\d+)\s*min/i);
  if (mins && /travel|between|away|commut|transport/i.test(v) && !patch.budgetMax) {
    patch.maxLocalTravelMinutes = clamp(Number(mins[1]), 5, 180);
    notes.push(`no more than ${patch.maxLocalTravelMinutes} min between stops`);
  }
  const add = v.match(
    new RegExp(`\\b(?:add|include|want|fancy)\\b[^.]*?\\b${ACTIVITY_WORDS.source}`, "i"),
  );
  if (add) {
    const kind = (v.match(ACTIVITY_WORDS) || [])[1];
    patch.addActivityKind = titleCase(kind);
    notes.push(`add a ${patch.addActivityKind}`);
  }
  const remove = v.match(/\b(?:remove|drop|skip|delete|cancel)\b[^.]*?(\w[\w ]{2,30})/i);
  if (remove) {
    const kind = (v.match(ACTIVITY_WORDS) || [])[1];
    patch.removeActivityKind = kind ? titleCase(kind) : titleCase(remove[1].trim());
    notes.push(`remove the ${patch.removeActivityKind.toLowerCase()}`);
  }
  if (/change (the )?hotel|different hotel|another hotel|replace .*hotel/i.test(v)) {
    patch.replaceCategory = "hotels";
    notes.push("swap the hotel");
  }
  if (/change (the )?flight|different flight|another flight|replace .*flight/i.test(v)) {
    patch.replaceCategory = "flights";
    notes.push("swap the flight");
  }
  if (/change (the )?transfer|different transfer|another transfer/i.test(v)) {
    patch.replaceCategory = "transfers";
    notes.push("swap the airport transfer");
  }
  if (/no early|don'?t want to wake up early|late start|not too early|sleep in/i.test(v)) {
    patch.earliestStart = "10:00";
    notes.push("start the days later");
  }
  if (/free day|keep .* free|nothing scheduled/i.test(v)) {
    patch.keepFreeDay = true;
    notes.push("keep a free day");
  }
  if (/more (restaurant|food|dining)/i.test(v)) {
    patch.moreRestaurants = true;
    notes.push("more restaurant options");
  }
  return { patch, notes, understood: notes.length > 0 };
}

// --- optimization -----------------------------------------------------------

const pickBy = (list, objective) => {
  if (!list.length) return null;
  const byPrice = [...list].sort((a, b) => a.price - b.price);
  if (objective === "cheapest") return byPrice[0];
  if (objective === "fastest")
    return [...list].sort(
      (a, b) =>
        (a.durationMinutes || a.etaMinutes || 0) -
          (b.durationMinutes || b.etaMinutes || 0) || a.price - b.price,
    )[0];
  if (objective === "comfort")
    return [...list].sort((a, b) => (b.rating || 0) - (a.rating || 0) || a.price - b.price)[0];
  // Balanced: among the cheaper half, take the best rated option.
  const median = byPrice[Math.floor(byPrice.length / 2)]?.price ?? byPrice[0].price;
  const shortlist = list.filter((x) => x.price <= median);
  return (
    [...(shortlist.length ? shortlist : list)].sort(
      (a, b) => (b.rating || 0) - (a.rating || 0) || a.price - b.price,
    )[0] || byPrice[0]
  );
};

const activityTravel = (item) => travelMinutes(item.distanceKm);

export function optimize(build, patch = {}) {
  const items = catalogue(build);
  const before = costOf(build, items);
  const changes = [];
  const req = build.request;
  const c = build.constraints;
  if (patch.budgetMax) req.budget = patch.budgetMax;
  if (patch.objective) c.objective = patch.objective;
  if (patch.hotelMinStars) c.hotelMinStars = patch.hotelMinStars;
  if (patch.maxLocalTravelMinutes) c.maxLocalTravelMinutes = patch.maxLocalTravelMinutes;
  if (patch.earliestStart) c.earliestStart = patch.earliestStart;
  if (patch.keepFreeDay) c.keepFreeDay = true;
  if (patch.moreActivities) c.wantMoreActivities = true;
  if (patch.moreRestaurants) c.wantMoreRestaurants = true;
  const objective = c.objective;
  // Any constraint change re-runs the choice, so "make it cheaper" actually
  // re-picks rather than only applying when a slot is empty.
  const reoptimize = !!(
    patch.objective ||
    patch.budgetMax ||
    patch.hotelMinStars ||
    patch.maxLocalTravelMinutes ||
    patch.replaceCategory
  );

  const budget = Number(req.budget) || 0;
  // Stay affordable when a budget exists, but never return nothing.
  const afford = (list, share) => {
    if (!budget) return list;
    const fitted = list.filter((x) => x.price <= budget * share);
    // Nothing fits the share: fall back to the cheapest slice, not the priciest.
    return fitted.length ? fitted : [...list].sort((a, b) => a.price - b.price).slice(0, 6);
  };
  const eligibleFlights = afford(
    items.flights.filter(
      (f) =>
        !f.returnLeg &&
        f.availability !== "sold-out" &&
        Date.parse(f.departAt) >= Date.parse(at(req.date, req.time)) - 6 * 3600000,
    ),
    0.4,
  );
  const eligibleReturns = afford(
    items.flights.filter((f) => f.returnLeg && f.availability !== "sold-out"),
    0.4,
  );
  const eligibleHotels = afford(
    items.hotels.filter(
      (h) => h.availability !== "sold-out" && h.stars >= (c.hotelMinStars || 0),
    ),
    0.5,
  );
  const transferPool = items.transfers.filter(
    (t) => t.availability !== "sold-out" && t.distanceKm <= 25,
  );
  // Public transport stays selectable, but is not auto-picked for a
  // luggage-carrying airport transfer.
  const privateTransfers = transferPool.filter((t) => t.providerId !== "public");
  const eligibleTransfers = afford(
    privateTransfers.length ? privateTransfers : transferPool,
    0.1,
  );

  const apply = (category, key, next, label) => {
    if (!next) return;
    const current = key === "transfers" ? build.selection.transfers[0] : build.selection[key];
    if (current && current.id === next.id) return;
    build.selection[key] = key === "transfers" ? [next] : next;
    build.quotes[next.id] = next.price;
    changes.push({
      category,
      label,
      before: current ? current.name || current.vehicle || current.code : "none",
      after: next.name || next.vehicle || next.code,
      delta: next.price - (current?.price || 0),
    });
  };

  const flightNext =
    patch.replaceCategory === "flights"
      ? pickBy(
          eligibleFlights.filter((f) => f.id !== build.selection.flight?.id),
          objective,
        )
      : pickBy(eligibleFlights, objective);
  if (!build.selection.flight || reoptimize || patch.replaceCategory === "flights")
    apply("flights", "flight", flightNext, "Flight / rail");

  const hotelNext =
    patch.replaceCategory === "hotels"
      ? pickBy(
          eligibleHotels.filter((h) => h.id !== build.selection.hotel?.id),
          objective,
        )
      : pickBy(eligibleHotels, objective);
  if (!build.selection.hotel || reoptimize || patch.replaceCategory === "hotels")
    apply("hotels", "hotel", hotelNext, "Hotel");

  const setReturn = (next) => {
    if (!next) return;
    const current = build.selection.returnFlight;
    if (current && current.id === next.id) return;
    build.selection.returnFlight = next;
    build.quotes[next.id] = next.price;
    changes.push({
      category: "flights",
      label: "Return flight / rail",
      before: current ? current.code : "none",
      after: next.code,
      delta: next.price - (current?.price || 0),
    });
  };
  if (!build.selection.returnFlight || reoptimize)
    setReturn(pickBy(eligibleReturns, objective));

  const transferNext =
    patch.replaceCategory === "transfers"
      ? pickBy(
          eligibleTransfers.filter((t) => t.id !== build.selection.transfers[0]?.id),
          objective,
        )
      : pickBy(eligibleTransfers, objective);
  if (!build.selection.transfers.length || reoptimize || patch.replaceCategory === "transfers")
    apply("transfers", "transfers", transferNext, "Airport transfer");

  const allowedActivities = items.activities.filter(
    (a) =>
      a.availability !== "sold-out" &&
      (!c.maxLocalTravelMinutes || activityTravel(a) <= c.maxLocalTravelMinutes),
  );
  const wanted = build.selection.activities.slice();
  if (patch.removeActivityKind) {
    const kind = patch.removeActivityKind.toLowerCase();
    const kept = wanted.filter(
      (a) => a.activityKind.toLowerCase() !== kind && a.name.toLowerCase() !== kind,
    );
    if (kept.length !== wanted.length)
      changes.push({
        category: "activities",
        label: "Activity removed",
        before: patch.removeActivityKind,
        after: "removed",
        delta: -(wanted.reduce((n, a) => n + a.price, 0) - kept.reduce((n, a) => n + a.price, 0)),
      });
    build.selection.activities = kept;
  }
  if (patch.addActivityKind) {
    const kind = patch.addActivityKind.toLowerCase();
    const match = allowedActivities
      .filter((a) => a.activityKind.toLowerCase() === kind)
      .sort((a, b) => b.rating - a.rating)[0];
    if (!match)
      return {
        ...summarize(build, before, changes),
        notes: [`No ${patch.addActivityKind} is available near ${req.destination} right now.`],
      };
    if (!build.selection.activities.some((a) => a.id === match.id)) {
      build.selection.activities.push(match);
      build.quotes[match.id] = match.price;
      changes.push({
        category: "activities",
        label: `Added ${match.activityKind}`,
        before: "none",
        after: match.name,
        delta: match.price,
      });
    }
  }
  if (c.wantMoreActivities && build.selection.activities.length < 4) {
    for (const activity of allowedActivities.sort((a, b) => b.rating - a.rating))
      if (
        build.selection.activities.length < 4 &&
        !build.selection.activities.some((a) => a.id === activity.id)
      ) {
        build.selection.activities.push(activity);
        build.quotes[activity.id] = activity.price;
        changes.push({
          category: "activities",
          label: "Added activity",
          before: "none",
          after: activity.name,
          delta: activity.price,
        });
      }
  }
  if (c.wantMoreRestaurants && build.selection.restaurants.length < 3) {
    for (const r of items.restaurants.sort((a, b) => b.rating - a.rating))
      if (
        build.selection.restaurants.length < 3 &&
        !build.selection.restaurants.some((x) => x.id === r.id)
      )
        build.selection.restaurants.push(r);
  }
  if (
    objective === "cheapest" &&
    build.selection.restaurants.length === 1 &&
    items.restaurants.length
  ) {
    const cheaper = items.restaurants
      .filter((r) => r.id !== build.selection.restaurants[0].id)
      .sort((a, b) => a.price - b.price)[0];
    if (cheaper && cheaper.price < build.selection.restaurants[0].price)
      build.selection.restaurants = [cheaper];
  }
  // A baseline plan should be complete: fill meals and a few activities.
  const affordableActivities = budget
    ? allowedActivities.filter((a) => a.price <= budget * 0.08)
    : allowedActivities;
  const activityPool = affordableActivities.length ? affordableActivities : allowedActivities;
  if (!build.selection.activities.length) {
    const target = Math.max(1, Math.min(3, req.durationDays - 1));
    let freeUsed = false;
    for (const activity of [...activityPool].sort(
      (a, b) => (b.rating || 0) - (a.rating || 0) || a.price - b.price,
    )) {
      if (build.selection.activities.length >= target) break;
      if ((activity.price || 0) === 0) {
        if (freeUsed) continue;
        freeUsed = true;
      }
      build.selection.activities.push(activity);
      build.quotes[activity.id] = activity.price;
      changes.push({
        category: "activities",
        label: "Activity",
        before: "none",
        after: activity.name,
        delta: activity.price,
      });
    }
  }
  if (!build.selection.restaurants.length) {
    const cheapRestaurants = [...items.restaurants].sort(
      (a, b) => (b.rating || 0) - (a.rating || 0) || a.price - b.price,
    );
    for (const r of cheapRestaurants)
      if (build.selection.restaurants.length < 2) {
        build.selection.restaurants.push(r);
        build.quotes[r.id] = r.price;
      }
  }
  if (reoptimize && objective === "cheapest" && build.selection.activities.length > 1) {
    const cap = budget
      ? budget * 0.06
      : [...build.selection.activities].sort((a, b) => a.price - b.price)[
          Math.floor(build.selection.activities.length / 2)
        ].price;
    const trimmed = build.selection.activities.filter((a) => a.price <= cap);
    if (trimmed.length) build.selection.activities = trimmed;
  }
  const maxActivities = Math.max(1, Math.min(4, req.durationDays));
  if (build.selection.activities.length > maxActivities)
    build.selection.activities = build.selection.activities.slice(0, maxActivities);
  build.status = build.status === "booked" ? "booked" : "draft";
  const summary = summarize(build, before, changes);
  const notes = [];
  if (budget && summary.total > budget)
    notes.push(
      `Even after re-planning, the cheapest feasible total is ₹${summary.total.toLocaleString("en-IN")} — ₹${(summary.total - budget).toLocaleString("en-IN")} over your ₹${budget.toLocaleString("en-IN")} budget. The simulated providers have no combination that fits.`,
    );
  return { ...summary, notes };
}

const summarize = (build, before, changes) => {
  const after = costOf(build, catalogue(build));
  return {
    changes,
    previousTotal: before.total,
    total: after.total,
    delta: after.total - before.total,
  };
};

export function explain(build) {
  const c = build.constraints;
  const sel = build.selection;
  const lines = [];
  if (sel.flight)
    lines.push(
      `Flight: ${sel.flight.source} ${sel.flight.code} departs ${fmt(sel.flight.departAt)} and arrives ${fmt(sel.flight.arriveAt)} — ${sel.flight.stops ? `${sel.flight.stops} stop, ` : "nonstop, "}₹${sel.flight.price} for ${build.request.travelers} traveler(s).${c.objective === "fastest" ? " Chosen for the shortest travel time." : c.objective === "cheapest" ? " Chosen as the cheapest feasible option." : " Chosen as a balanced price/rating option."}`,
    );
  if (sel.hotel)
    lines.push(
      `Hotel: ${sel.hotel.name} (${sel.hotel.stars}★, ${sel.hotel.rating} rating) at ₹${sel.hotel.pricePerNight}/night, ${sel.hotel.distanceFromAirportKm} km from the airport.${c.hotelMinStars ? ` It is the cheapest option meeting your ${c.hotelMinStars}★ requirement.` : ""}`,
    );
  if (sel.transfers[0])
    lines.push(
      `Transfer: ${sel.transfers[0].source} ${sel.transfers[0].vehicle} — ₹${sel.transfers[0].price}, about ${sel.transfers[0].etaMinutes} min for ${sel.transfers[0].distanceKm} km. This is an estimate, not a live quote.`,
    );
  if (sel.activities.length)
    lines.push(
      `Activities: ${sel.activities.map((a) => `${a.name} (${a.activityKind})`).join(", ")}.${c.maxLocalTravelMinutes ? ` All are within your ${c.maxLocalTravelMinutes}-minute travel limit.` : ""}`,
    );
  if (sel.restaurants.length)
    lines.push(
      `Food: ${sel.restaurants.map((r) => `${r.name} (${r.cuisine}, ${r.priceBand})`).join(", ")} — used for the estimated food line, not a reservation.`,
    );
  lines.push(
    "Uncertain items: every option here is simulated provider data. Availability, prices and amenities are illustrative — nothing is reserved until you confirm.",
  );
  return lines;
}

// --- automated recovery conversation ----------------------------------------

export function startItineraryJob(build, nowMs = Date.now()) {
  build.jobs.itinerary = {
    category: "itinerary",
    startedAt: new Date(nowMs).toISOString(),
    etaMs: timings.itinerary,
    state: "SEARCHING",
    paused: false,
    outage: false,
    invalidatedAt: null,
    invalidatedReason: "",
  };
}

const say = (build, payload, nowMs = Date.now()) => {
  const message = { role: "assistant", at: new Date(nowMs).toISOString(), ...payload };
  build.conversation.push(message);
  return message;
};

const planSummary = (build, items) => {
  const cost = costOf(build, items);
  return {
    lines: cost.lines.map((l) => ({ label: l.label, amount: l.amount, fidelity: l.fidelity })),
    total: cost.total,
    budget: cost.budget,
    remaining: cost.remaining,
    overBudget: cost.overBudget,
    overBy: cost.overBy,
  };
};

// Called on read: once every simulated search has finished or failed, the
// automated mode assembles a plan from all categories that did return results.
export function autoAdvance(build, nowMs = Date.now()) {
  if (build.mode !== "auto" || build.phase !== "searching") return false;
  const done = CATEGORY_LIST.every(
    (c) =>
      build.jobs[c] &&
      ["COMPLETED", "FAILED", "TIMEOUT", "CANCELLED"].includes(
        jobState(build.jobs[c], nowMs),
      ),
  );
  if (!done) return false;
  const result = optimize(build, {});
  build.phase = "review";
  startItineraryJob(build, nowMs);
  const items = catalogue(build);
  return !!say(
    build,
    {
      text: `I have enough to build your trip from ${build.request.origin} to ${build.request.destination}. Here is the current plan — every price comes from the simulated provider results, so nothing is booked yet.`,
      plan: planSummary(build, items),
      explanation: explain(build),
      changes: result.changes,
      event: "TRIP_READY",
    },
    nowMs,
  );
}

export function autoMessage(build, text, nowMs = Date.now()) {
  const raw = String(text || "").trim();
  if (!raw) throw Object.assign(Error("Type a message first"), { status: 400 });
  if (raw.length > 2000) throw Object.assign(Error("Message is too long"), { status: 400 });
  // Keep the assistant's last question in view while interpreting short answers.
  // A bare city or amount has no reliable meaning without that context.
  const lastQuestion = [...build.conversation].reverse().find(
    (message) => message.role === "assistant" && message.questions?.length,
  );
  const pendingQuestions = lastQuestion?.questions || [];
  const answeringOrigin = pendingQuestions.some((question) => /where are you right now/i.test(question));
  build.conversation.push({ role: "user", text: raw, at: new Date(nowMs).toISOString() });
  const items = catalogue(build);
  const u = understand(raw);
  const req = build.request;
  const answerCity = cityNames.find((city) => new RegExp(`\\b${city}\\b`, "i").test(raw));
  if (pendingQuestions.some((question) => /where are you right now/i.test(question)) && answerCity && !req.origin)
    req.origin = answerCity;
  if (pendingQuestions.some((question) => /where are you trying to get to/i.test(question)) && answerCity && !req.destination)
    req.destination = answerCity;
  if (pendingQuestions.some((question) => /how many people are travelling/i.test(question)) && !req.travelers) {
    const travelerAnswer = raw.match(/\b(\d+)\b/);
    if (/solo|alone|just me|only me/i.test(raw)) req.travelers = 1;
    else if (travelerAnswer && Number(travelerAnswer[1]) >= 1)
      req.travelers = clamp(Number(travelerAnswer[1]), 1, 20);
  }
  if (pendingQuestions.some((question) => /approximate budget/i.test(question)) && !req.budget) {
    const amount = raw.match(/(?:₹|rs\.?|inr)?\s*(\d[\d,]*(?:\.\d+)?)\s*(k|thousand|lakh)?/i);
    if (amount) {
      const multiplier = /lakh/i.test(amount[2] || "") ? 100000 : /k|thousand/i.test(amount[2] || "") ? 1000 : 1;
      const value = Math.round(Number(amount[1].replaceAll(",", "")) * multiplier);
      if (value > 0) req.budget = value;
    }
  }
  if (!req.origin && u.current) req.origin = u.current;
  if (!answeringOrigin && !req.destination && u.destination) req.destination = u.destination;
  if (!req.travelers && u.travelers) req.travelers = u.travelers;
  if (!req.budget && u.budget) req.budget = u.budget;
  if (u.problem && !build.problem) build.problem = u.problem;
  if (req.origin && req.origin === req.destination) {
    if (answeringOrigin) {
      req.origin = "";
      return say(
        build,
        {
          text: `${req.destination} is already your destination. Choose a different city for your current location.`,
          questions: ["Where are you right now?"],
          event: "USER_CONFIRMATION_REQUIRED",
        },
        nowMs,
      );
    }
    req.origin = "";
  }
  const { patch, notes } = parseConstraint(raw);

  const missing = [];
  if (!req.origin) missing.push("Where are you right now?");
  if (!req.destination) missing.push("Where are you trying to get to?");
  if (!req.travelers) missing.push("How many people are travelling?");
  if (!req.budget) missing.push("What is your approximate budget in INR?");

  if (build.phase === "collect" || build.phase === "configured") {
    if (missing.length)
      return say(
        build,
        {
          text: build.problem
            ? `Understood — ${build.problem}. I only need a couple of things before I start searching:`
            : "Happy to build this. Before I start searching, I need:",
          questions: missing,
          event: "USER_CONFIRMATION_REQUIRED",
        },
        nowMs,
      );
    startSearch(build, CATEGORY_LIST, nowMs);
    startItineraryJob(build, nowMs);
    build.phase = "searching";
    return say(
      build,
      {
        text: `Rebuilding your journey from ${req.origin} to ${req.destination} with a ₹${Number(req.budget).toLocaleString("en-IN")} budget for ${req.travelers} traveler(s). Searches are running in parallel — results appear here as each provider responds.`,
        searching: true,
        event: "TRIP_BUILD_STARTED",
      },
      nowMs,
    );
  }

  if (/^(ok(ay)?[,!.]?|yes|go ahead|book it|confirm|proceed)\b/i.test(raw)) {
    if (!build.selection.flight || !build.selection.hotel)
      return say(
        build,
        { text: "I still need a flight and a hotel selected before I can confirm anything." },
        nowMs,
      );
    build.status = "confirmed";
    return say(
      build,
      {
        text: "Thank you. Nothing has been booked yet — press “Confirm & book” in the plan panel, and only then do I simulate the supplier bookings.",
        event: "USER_CONFIRMATION_REQUIRED",
        requiresBooking: true,
      },
      nowMs,
    );
  }

  const replaceMatch = raw.match(/\b(?:option|number)\s*(\d)\b/i) || raw.match(/\b(\d)(?:st|nd|rd|th)\b/i);
  if (replaceMatch && build.lastOptions) {
    const index = Number(replaceMatch[1]) - 1;
    const item = build.lastOptions.items[index];
    if (item) {
      const category = build.lastOptions.category;
      selectItem(build, category, item.id, item);
      delete build.lastOptions;
      const summary = planSummary(build, items);
      return say(
        build,
        {
          text: `Done — switched to ${item.name || item.code || item.vehicle}.`,
          plan: summary,
          explanation: explain(build),
        },
        nowMs,
      );
    }
  }

  if (!notes.length)
    return say(
      build,
      {
        text: "I could not map that to a change. Try “make it cheaper”, “I want a 4-star hotel”, “add a water park”, “remove the museum”, “change the hotel” or “keep it under ₹15,000”.",
        explanation: explain(build),
      },
      nowMs,
    );

  const result = optimize(build, patch);
  const summary = planSummary(build, items);
  const change = patch.replaceCategory;
  const wantsAlternatives = change || patch.moreRestaurants;
  const options = wantsAlternatives
    ? {
        category: change || "hotels",
        items: (items[change || "hotels"] || [])
          .filter((x) => x.availability !== "sold-out")
          .slice(0, 5),
      }
    : null;
  if (options) build.lastOptions = options;
  return say(
    build,
    {
      text: [
        `Applied: ${notes.join(", ")}.`,
        result.delta === 0
          ? `The total is unchanged at ₹${result.total.toLocaleString("en-IN")}.`
          : `Your total changed from ₹${result.previousTotal.toLocaleString("en-IN")} to ₹${result.total.toLocaleString("en-IN")} (${result.delta > 0 ? "+" : "−"}₹${Math.abs(result.delta).toLocaleString("en-IN")}).`,
        summary.overBudget
          ? `That is ₹${summary.overBy.toLocaleString("en-IN")} over your ₹${summary.budget.toLocaleString("en-IN")} budget.`
          : summary.budget
            ? `₹${summary.remaining.toLocaleString("en-IN")} remains against your budget.`
            : "",
      ]
        .filter(Boolean)
        .join(" "),
      changes: result.changes,
      notes: result.notes || [],
      plan: summary,
      explanation: explain(build),
      options,
    },
    nowMs,
  );
}

// --- confirmation, booking simulation and conversion ------------------------

export function bookingSummary(build) {
  const sel = build.selection;
  const rows = [];
  const add = (category, label, item, amount) => {
    if (item) rows.push({ category, label, title: item.name || item.code || item.vehicle || label, amount, fidelity: item.fidelity });
  };
  add("flights", "Flight / rail", sel.flight, sel.flight?.price || 0);
  add("flights", "Return flight / rail", sel.returnFlight, sel.returnFlight?.price || 0);
  add("transfers", "Airport transfer", sel.transfers[0], sel.transfers[0]?.price || 0);
  add("hotels", "Hotel", sel.hotel, sel.hotel?.price || 0);
  sel.restaurants.forEach((r) => add("restaurants", "Restaurant (estimate)", r, r.price));
  sel.activities.forEach((a) => add("activities", "Activity", a, a.price));
  return {
    items: rows,
    count: rows.length,
    total: rows.reduce((n, r) => n + r.amount, 0),
  };
}

export function confirmBuild(build) {
  if (build.status === "confirmed" || build.status === "booked" || build.status === "partial")
    return build.status;
  if (!build.selection.flight || !build.selection.hotel)
    throw Object.assign(
      Error("Select at least a flight and a hotel before confirming"),
      { status: 409 },
    );
  build.status = "confirmed";
  return build.status;
}

const PREFIX = {
  flights: "WP",
  transfers: "TR",
  hotels: "HT",
  restaurants: "RS",
  activities: "AC",
};

const reference = (build, category, index) => {
  const seed = `${build.id}|${category}|${index}`;
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) % 90000;
  return `${PREFIX[category] || "WP"}-${10000 + h}`;
};

// Found ≠ Selected ≠ Reserved ≠ Booked. Booking is simulated; the hotel step
// fails on purpose so the recovery path can be demonstrated.hotel fails on
// purpose so the failure path is demonstrable.
export function bookBuild(build, nowMs = Date.now()) {
  if (build.status !== "confirmed" && build.status !== "partial")
    throw Object.assign(Error("Confirm the plan before booking"), { status: 409 });
  if (build.attempts.length) return build.attempts;
  const summary = bookingSummary(build);
  const attempts = summary.items.map((row, index) => ({
    id: crypto.randomUUID(),
    category: row.category,
    title: row.title,
    provider: row.title,
    amount: row.amount,
    reference: reference(build, row.category, index),
    status: "PENDING_CONFIRMATION",
    at: new Date(nowMs).toISOString(),
  }));
  for (const attempt of attempts) {
    const hotelFailure = attempt.category === "hotels";
    attempt.status = hotelFailure ? "FAILED" : "CONFIRMED";
    if (hotelFailure) {
      const alternative = catalogue(build).hotels
        .filter(
          (h) =>
            h.id !== build.selection.hotel?.id &&
            h.availability !== "sold-out" &&
            h.stars >= (build.constraints.hotelMinStars || 0),
        )
        .sort((a, b) => a.price - b.price)[0];
      attempt.failureReason =
        "The selected room became unavailable while the plan was being booked.";
      attempt.replacementId = alternative?.id || null;
      attempt.replacementTitle = alternative?.name || "No alternative available";
      attempt.replacementPrice = alternative?.price || 0;
      attempt.status = "FAILED";
    }
  }
  build.attempts = attempts;
  build.status = attempts.some((a) => a.status === "FAILED") ? "partial" : "booked";
  build.phase = "booked";
  return attempts;
}

export function recoverAttempt(build, attemptId, nowMs = Date.now()) {
  const attempt = build.attempts.find((a) => a.id === attemptId);
  if (!attempt) throw Object.assign(Error("Booking attempt not found"), { status: 404 });
  if (attempt.status !== "FAILED")
    throw Object.assign(Error("That booking is not in a failed state"), { status: 409 });
  const alternative = catalogue(build).hotels.find((h) => h.id === attempt.replacementId);
  if (!alternative)
    throw Object.assign(Error("The alternative is no longer available"), { status: 409 });
  build.selection.hotel = alternative;
  build.quotes[alternative.id] = alternative.price;
  attempt.status = "CONFIRMED";
  attempt.recovered = true;
  attempt.amount = alternative.price;
  attempt.title = alternative.name;
  attempt.reference = reference(build, "hotels", build.attempts.indexOf(attempt));
  attempt.at = new Date(nowMs).toISOString();
  build.status = build.attempts.some((a) => a.status === "FAILED") ? "partial" : "booked";
  return attempt;
}

const BOOKING_TYPE = { flights: "flight", trains: "train", transfers: "transfer", hotels: "hotel", activities: "activity", restaurants: "event" };
const cityCodeOf = (name) => cities[name]?.code || String(name || "???").slice(0, 3).toUpperCase();

export function toTrip(build) {
  const { days } = scheduleOf(build);
  const req = build.request;
  const home = cityCodeOf(req.destination);
  const selected = days
    .flatMap((d) => d.events)
    .filter((e) => e.itemId && ["transport", "transfer", "hotel", "activity", "meal"].includes(e.kind));
  const bookings = [];
  for (const event of selected) {
    const item = findItem(build, event.category, event.itemId) || {};
    const type = BOOKING_TYPE[event.category] || "event";
    const duration =
      event.kind === "activity"
        ? item.durationMinutes || 120
        : event.kind === "meal"
          ? 75
          : event.kind === "hotel"
            ? 60
            : event.kind === "transfer"
              ? item.etaMinutes || 30
              : event.kind === "transport"
                ? item.durationMinutes || 60
                : 30;
    const start = event.at;
    // Every booking must end after it starts, so keep a minimum duration.
    const end = plus(start, Math.max(duration, 15));
    const returns = event.category === "flights" && item.origin === req.destination;
    bookings.push({
      id: crypto.randomUUID(),
      type,
      title: event.kind === "transport"
        ? `${item.origin} → ${item.destination}`
        : event.kind === "hotel"
          ? `Check in at ${item.name || "hotel"}`
          : event.title,
      provider: [item.source, item.code].filter(Boolean).join(" · ") || "Simulated provider",
      start,
      end,
      from: event.kind === "transport"
        ? returns ? cityCodeOf(req.destination) : cityCodeOf(req.origin)
        : home,
      to: event.kind === "transport"
        ? returns ? cityCodeOf(req.origin) : cityCodeOf(req.destination)
        : home,
      price: Math.round(item.price || 0),
      refund: item.refundable ? 0.75 : 0.3,
      refundDeadline: new Date(Date.parse(start) - 48 * 3600000).toISOString(),
      dependencies: [],
      status: "confirmed",
      reference: (item.code || "WP").toString().replace(/\s+/g, "-"),
    });
  }
  bookings.sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  for (let i = 1; i < bookings.length; i++) {
    const previous = bookings[i - 1],
      current = bookings[i];
    if (previous.to === current.from && Date.parse(previous.end) <= Date.parse(current.start))
      current.dependencies = [{ id: previous.id, buffer: 15 }];
  }
  return {
    trip: {
      id: "build",
      name: `${req.origin} → ${req.destination}`,
      subtitle: "Built with the Waypoint Trip Builder (simulated providers)",
      destination: `${req.destination}, India`,
      travelers: req.travelers,
      start: req.date,
      end: req.returnDate,
      bookings,
    },
    offers: [],
    preferences: {
      budget: Number(req.budget) || 0,
      priority: build.constraints.objective === "cheapest" ? "budget" : build.constraints.objective === "fastest" ? "fastest" : "balanced",
      accessible: false,
    },
    disruptions: [],
    history: [],
  };
}
