/* ============================================================
   Trip Builder prototype — mounted at /temprory.
   Fully independent of the main Waypoint app state.
   Progressive search lifecycle, AI recovery mode,
   simulated booking with partial failure + recovery.
   ============================================================ */
import { Router } from "express";
import { randomUUID } from "node:crypto";
import {
  searchTransport,
  searchHotels,
  searchTransfers,
  searchRestaurants,
  searchActivities,
} from "./providers.js";
import {
  computeCost,
  buildSchedule,
  validate,
  dedupe,
  onSelectionChanged,
  suggestTransfers,
  money,
} from "./engine.js";
import {
  extractSituation,
  extractConstraints,
  assemblePlan,
  reoptimize,
} from "./ai.js";

const router = Router();

/* ---------- Session middleware (cookie + response header) ---------- */
router.use((req, res, next) => {
  let id = req.headers["x-tb-session"];
  const cookies = String(req.headers.cookie || "");
  if (!id) {
    const m = cookies.match(/tb_session=([\w-]+)/);
    if (m) id = m[1];
  }
  if (!id) id = randomUUID();
  res.setHeader("x-tb-session", id);
  res.setHeader(
    "Set-Cookie",
    `tb_session=${id}; Path=/temprory; HttpOnly; SameSite=Lax; Max-Age=21600`,
  );
  req.session = session(id);
  next();
});

/* ---------- In-memory sessions ---------- */
const sessions = new Map();
const session = (id) => {
  if (!sessions.has(id))
    sessions.set(id, {
      id,
      createdAt: Date.now(),
      mode: null, // "manual" | "ai"
      travelers: 1,
      budget: 0,
      nights: 2,
      items: [],
      pool: { transport: [], hotels: [], transfers: [], restaurants: [], activities: [] },
      events: [], // search lifecycle events
      log: [],
      chat: [],
      constraints: {},
      plan: null,
      bookings: [],
      bookingState: "idle",
      destinations: {},
      expiredAt: Date.now() + 6 * 60 * 60 * 1000,
    });
  return sessions.get(id);
};

/* Search lifecycle states (Problem 10) */
const STATES = ["QUEUED", "SEARCHING", "PARTIAL", "FOUND", "COMPLETED", "FAILED", "TIMEOUT", "CANCELLED"];
const pushEvent = (s, code, detail) => {
  s.events.push({ code, detail, at: Date.now() });
};

/* ---------- API: start a trip build ---------- */
router.post("/start", (req, res) => {
  const s = req.session;
  const { mode, from, to, date, travelers, budget, nights, prefs } = req.body || {};
  s.mode = mode === "ai" ? "ai" : "manual";
  s.from = from || "Mumbai";
  s.to = to || "Jaipur";
  s.date = date || "2026-10-15";
  s.travelers = Math.max(1, Math.min(9, Number(travelers) || 1));
  s.budget = Number(budget) || 0;
  s.nights = Math.max(1, Math.min(10, Number(nights) || 2));
  s.prefs = prefs || [];
  s.items = [];
  s.events = [];
  s.bookings = [];
  s.bookingState = "idle";
  /* Problem 12: invalidate all previous search results on a new build */
  s.pool = { transport: [], hotels: [], transfers: [], restaurants: [], activities: [] };
  s.plan = null;
  s.cost = undefined;
  s.schedule = undefined;
  s.issues = undefined;
  s.destinations = { from: s.from, to: s.to, date: s.date };
  pushEvent(s, "TRIP_BUILD_STARTED", `${s.from} → ${s.to} · ${s.date} · ${s.travelers} traveler(s)`);
  /* kick off the background search immediately; SSE clients subscribe via /search */
  s.followers = s.followers || new Set();
  runSearch(s, (event, data) => {
    for (const send of s.followers) {
      try { send(event, data); } catch { s.followers.delete(send); }
    }
  });
  res.json({ ok: true, sessionId: s.id, from: s.from, to: s.to, date: s.date, travelers: s.travelers, budget: s.budget, nights: s.nights });
});

/* ---------- API: progressive search (SSE stream) ---------- */
/* ---------- Search orchestration (runs in background on /start) ---------- */
function runSearch(s, emit) {
  const gen = (s.searchGen = (s.searchGen || 0) + 1);
  const jobs = [
    { key: "transport", label: "flights / trains / buses", gap: 250 },
    { key: "hotels", label: "hotels", gap: 450 },
    { key: "transfers", label: "airport transfers", gap: 330 },
    { key: "restaurants", label: "restaurants", gap: 550 },
    { key: "activities", label: "activities", gap: 750 },
  ];
  const base = {
    transport: () =>
      dedupe([
        ...searchTransport({ from: s.from, to: s.to, date: s.date, kind: "flight", budgetPerHead: s.budget / s.travelers }),
        ...searchTransport({ from: s.from, to: s.to, date: s.date, kind: "train" }),
        ...searchTransport({ from: s.from, to: s.to, date: s.date, kind: "bus" }),
      ]),
    hotels: () => searchHotels({ city: s.to, nights: s.nights, date: s.date, budget: s.budget }),
    transfers: () => [],
    restaurants: () => searchRestaurants({ city: s.to, near: "center" }),
    activities: () => searchActivities({ city: s.to, prefs: s.prefs }),
  };
  let jobIdx = 0;
  const step = () => {
    if (s.searchGen !== gen) return; /* superseded by a newer search */
    if (jobIdx >= jobs.length) {
      s.pool.transfers = suggestTransfers(s);
      pushEvent(s, "TRIP_READY", "All categories complete");
      emit("done", { pool: s.pool, transfers: s.pool.transfers });
      return;
    }
    const job = jobs[jobIdx++];
    setTimeout(() => {
      if (s.searchGen !== gen) return;
      pushEvent(s, job.key.toUpperCase() + "_SEARCH_STARTED", job.label);
      emit("progress", { key: job.key, label: job.label, state: "SEARCHING" });
      const results = base[job.key]();
      const chunkDelays = [180, 260, 340, 420];
      let sent = 0;
      const chunk = (i) => {
        if (s.searchGen !== gen) return;
        if (i < chunkDelays.length) {
          setTimeout(() => {
            sent += Math.min(results.length - sent, Math.ceil(results.length / 4)) || 0;
            emit("partial", { key: job.key, state: "PARTIAL", count: sent });
            chunk(i + 1);
          }, chunkDelays[i]);
        } else {
          s.pool[job.key] = results; /* progressive commit */
          pushEvent(s, job.key.toUpperCase() + "_SEARCH_COMPLETED", `${results.length} ${job.label}`);
          emit("complete", { key: job.key, results, state: "COMPLETED", count: results.length });
          setTimeout(step, job.gap);
        }
      };
      chunk(0);
    }, job.gap);
  };
  step();
}

/* ---------- API: subscribe to search progress (SSE) ---------- */
router.get("/search", (req, res) => {
  const s = req.session;
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  const send = (event, data) =>
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  send("start", { from: s.from, to: s.to, date: s.date });
  /* if a search is already running, just follow it; otherwise none is —
     the UI opens this stream right after /start, which kicks the search */
  s.followers = s.followers || new Set();
  s.followers.add(send);
  req.on("close", () => s.followers.delete(send));
});

/* ---------- API: select / change / remove ---------- */
router.post("/select", (req, res) => {
  const s = req.session;
  const item = req.body?.item;
  if (!item?.id || !item?.kind) return res.status(400).json({ error: "item required" });
  const kindGroup = { flight: "transport", train: "transport", bus: "transport", hotel: "hotel", transfer: "transfer", restaurant: "restaurant", activity: "activity" };
  const group = kindGroup[item.kind];
  s.items = s.items.filter((i) => kindGroup[i.kind] !== group || (item.kind === "restaurant" && false));
  if (item.kind === "restaurant") {
    s.items.push(item); // multiple restaurants allowed
  } else {
    s.items = s.items.filter((i) => i.kind !== item.kind || item.kind === "restaurant");
    s.items.push(item);
  }
  onSelectionChanged(s);
  if (item.kind === "hotel" || item.kind === "flight" || item.kind === "train" || item.kind === "bus") {
    s.pool.transfers = suggestTransfers(s);
  }
  s.cost = computeCost(s.items, { travelers: s.travelers, budget: s.budget });
  s.schedule = buildSchedule(s.items, {});
  s.issues = validate(s.items);
  pushEvent(s, "COST_CALCULATION_UPDATED", money(s.cost.total));
  res.json({ ok: true, items: s.items, cost: s.cost, schedule: s.schedule, issues: s.issues, transfers: s.pool.transfers });
});

router.post("/remove", (req, res) => {
  const s = req.session;
  const { id } = req.body || {};
  s.items = s.items.filter((i) => i.id !== id);
  onSelectionChanged(s);
  s.cost = computeCost(s.items, { travelers: s.travelers, budget: s.budget });
  s.schedule = buildSchedule(s.items, {});
  s.issues = validate(s.items);
  res.json({ ok: true, items: s.items, cost: s.cost, schedule: s.schedule, issues: s.issues });
});

/* ---------- API: current state (poll-safe) ---------- */
router.get("/state", (req, res) => {
  const s = req.session;
  res.json({
    ok: true,
    mode: s.mode,
    from: s.from,
    to: s.to,
    date: s.date,
    travelers: s.travelers,
    budget: s.budget,
    nights: s.nights,
    items: s.items,
    cost: s.cost || computeCost([], { travelers: s.travelers, budget: s.budget }),
    schedule: s.schedule || [],
    issues: s.issues || [],
    pool: s.pool,
    events: s.events,
    chat: s.chat,
    bookings: s.bookings,
    bookingState: s.bookingState,
  });
});

/* ---------- API: AI recovery chat ---------- */
router.post("/ai", async (req, res) => {
  const s = req.session;
  const text = String(req.body?.text || "");
  s.chat.push({ role: "user", text, at: Date.now() });
  const reply = { role: "ai", parts: [], at: Date.now() };

  const respond = () => {
    s.chat.push(reply);
    res.json({ ok: true, reply, state: publicState(s) });
  };
  const publicState = (s) => ({
    items: s.items,
    cost: s.cost,
    schedule: s.schedule,
    issues: s.issues,
    pool: s.pool,
    transfers: s.pool.transfers,
  });

  /* First message: situation extraction */
  if (!s.plan) {
    const sit = extractSituation(text);
    s.mode = "ai";
    s.from = sit.current || "Mumbai";
    s.to = sit.destination || "Jaipur";
    s.travelers = sit.travelers || 1;
    s.budget = sit.budget || 20000;
    s.nights = 2;
    const missing = [];
    if (!sit.budget) missing.push("approximate budget");
    pushEvent(s, "SITUATION_UNDERSTOOD", `${s.from} → ${s.to} · problem: ${sit.problem || "none stated"}`);
    reply.parts.push({
      type: "text",
      text:
        `Got it. You're in ${s.from}, heading to ${s.to}. Problem noted: ${sit.problem || "disruption"}.\n` +
        `I'll rebuild your journey now — searching transport, stays, food and things to do. ${missing.length ? `One thing: what's your ${missing[0]}? (I'll assume ₹20,000 unless you say.)` : "Budget: " + money(s.budget) + "."}`,
    });
    /* kick off searches */
    s.pool.transport = dedupe([
      ...searchTransport({ from: s.from, to: s.to, date: s.date || "2026-10-15", kind: "flight" }),
      ...searchTransport({ from: s.from, to: s.to, date: s.date || "2026-10-15", kind: "train" }),
    ]);
    s.pool.hotels = searchHotels({ city: s.to, nights: s.nights, date: s.date || "2026-10-15", budget: s.budget });
    s.pool.restaurants = searchRestaurants({ city: s.to, near: "center" });
    s.pool.activities = searchActivities({ city: s.to, prefs: [] });
    const plan = assemblePlan(s.pool, { travelers: s.travelers, budget: s.budget, nights: s.nights, constraints: s.constraints });
    s.items = plan.chosen;
    /* now that transport+hotel exist, fetch transfers and add the cheapest */
    s.pool.transfers = suggestTransfers(s);
    if (s.pool.transfers.length && !s.items.some((i) => i.kind === "transfer")) {
      s.items.push(s.pool.transfers[0]);
      plan.chosen = s.items;
      plan.explain.push(`${s.pool.transfers[0].provider} airport transfer included (${money(s.pool.transfers[0].estimated_price)}).`);
    }
    s.plan = plan;
    s.cost = computeCost(s.items, { travelers: s.travelers, budget: s.budget });
    s.schedule = buildSchedule(s.items, {});
    s.issues = validate(s.items);
    s.pool.transfers = suggestTransfers(s);
    pushEvent(s, "ITINERARY_BUILD_COMPLETED", money(s.cost.total));
    reply.parts.push({ type: "progress", lines: [
      `✈️ ${s.pool.transport.filter((x) => x.kind === "flight").length} flights found`,
      `🚆 ${s.pool.transport.filter((x) => x.kind === "train").length} trains found`,
      `🏨 ${s.pool.hotels.length} hotels found`,
      `🚕 ${s.pool.transfers.length} transfer options found`,
      `🍛 ${s.pool.restaurants.length} restaurants found`,
      `🎯 ${s.pool.activities.length} activities found`,
    ]});
    reply.parts.push({ type: "plan", items: s.items, cost: s.cost, explain: plan.explain });
    reply.parts.push({
      type: "text",
      text: `Review the plan on the right. Say "make it cheaper", "add a water park", "change the hotel" — or "book it" to confirm.`,
    });
    return respond();
  }

  /* Modification intents */
  const c = extractConstraints(text);
  const tLow = text.toLowerCase();

  /* "Use alternative HT-..." / "use the second one" — chat replacement flow */
  const altPick = tLow.match(/use (?:the )?(?:alternative )?(ht-[\w-]+|second|first|third)/);
  if (altPick && s.lastAlternatives?.length) {
    let pick = null;
    if (/^ht-/i.test(altPick[1]))
      pick = s.lastAlternatives.find((a) => a.id.toLowerCase() === altPick[1].toLowerCase());
    else {
      const idx = { first: 0, second: 1, third: 2 }[altPick[1]] ?? 0;
      pick = s.lastAlternatives[idx];
    }
    delete s.lastAlternatives;
    if (pick) {
      const before = s.cost?.total ?? 0;
      s.items = s.items.filter((i) => i.kind !== pick.kind);
      s.items.push(pick);
      s.cost = computeCost(s.items, { travelers: s.travelers, budget: s.budget });
      s.schedule = buildSchedule(s.items, {});
      s.issues = validate(s.items);
      reply.parts.push({
        type: "text",
        text: `Done. Switched to ${pick.name}. Your total changed from ${money(before)} to ${money(s.cost.total)}.`,
      });
      reply.parts.push({ type: "plan", items: s.items, cost: s.cost, explain: [] });
      return respond();
    }
  }

  /* Budget cap: store it AND actually re-optimize toward it */
  if (c.budget_max) {
    s.budget = c.budget_max;
    s.constraints = { ...s.constraints, ...c };
    const logs = reoptimize(s, "cheaper", s.pool);
    s.cost = computeCost(s.items, { travelers: s.travelers, budget: s.budget });
    s.schedule = buildSchedule(s.items, {});
    s.issues = validate(s.items);
    reply.parts.push({
      type: "text",
      text: s.cost.over_budget
        ? `Tight. I've trimmed what I could — still ${money(s.cost.over)} over your ${money(s.budget)} cap. Want me to drop an activity or a night?`
        : `Done — I've adjusted the plan to fit under ${money(s.budget)}.`,
    });
    if (logs.length) reply.parts.push({ type: "progress", lines: logs });
    reply.parts.push({ type: "plan", items: s.items, cost: s.cost, explain: [] });
    return respond();
  }

  const applyIntent = (intent) => {
    s.pendingAdd = c.add_activity;
    s.pendingRemoveLike = c.remove_activity_like;
    return reoptimize(s, intent, s.pool);
  };
  let logs = [];
  if (c.intent === "cheaper") logs = applyIntent("cheaper");
  else if (c.intent === "add_item") logs = applyIntent("add_item");
  else if (c.intent === "remove_item") logs = applyIntent("remove_item");
  else if (c.intent === "change_hotel") logs = applyIntent("change_hotel");
  else if (/book|confirm/.test(tLow)) {
    return startBooking(s, res, reply);
  } else {
    reply.parts.push({
      type: "text",
      text: `I can: make it cheaper · change the hotel · add a water park / snow park · remove an item · keep it under ₹X · book it.`,
    });
    return respond();
  }
  s.cost = computeCost(s.items, { travelers: s.travelers, budget: s.budget });
  s.schedule = buildSchedule(s.items, {});
  s.issues = validate(s.items);
  if (s.offerAlternatives) {
    s.lastAlternatives = s.offerAlternatives;
    reply.parts.push({ type: "alternatives", items: s.offerAlternatives });
    delete s.offerAlternatives;
  }
  if (logs.length) reply.parts.push({ type: "progress", lines: logs });
  reply.parts.push({ type: "plan", items: s.items, cost: s.cost, explain: [] });
  respond();
});

/* ---------- Booking simulation with partial failure ---------- */
function startBooking(s, res, reply) {
  const groups = {};
  for (const i of s.items) {
    if (i.kind === "restaurant") groups[i.kind + ":" + i.id] = i;
    else groups[i.kind] = i;
  }
  const list = Object.values(groups);
  s.bookingState = "booking";
  const failIdx = list.length > 3 ? 2 : -1; // 3rd item fails (hotel or transfer)
  let idx = 0;
  const step = () => {
    if (idx >= list.length) {
      s.bookingState = "done";
      const okCount = s.bookings.filter((b) => b.status === "BOOKED").length;
      pushEvent(s, "BOOKING_COMPLETED", `${okCount}/${list.length} booked`);
      reply.parts.push({
        type: "booking",
        bookings: s.bookings,
        summary: `${okCount} / ${list.length} bookings confirmed`,
      });
      s.chat.push(reply);
      return res.json({ ok: true, reply, state: { items: s.items, cost: s.cost, bookings: s.bookings, bookingState: s.bookingState } });
    }
    const item = list[idx];
    const failed = idx === failIdx;
    const ref = item.kind.slice(0, 2).toUpperCase() + "-" + Math.floor(10000 + Math.random() * 89999);
    const booking = {
      id: ref,
      item,
      status: failed ? "FAILED" : "BOOKED",
      reason: failed ? "The selected room became unavailable." : null,
    };
    /* spec §34: offer a concrete replacement for the failed component */
    if (failed) {
      const altPool = item.kind === "hotel" ? s.pool.hotels : item.kind === "activity" ? s.pool.activities : item.kind === "restaurant" ? s.pool.restaurants : s.pool.transfers;
      const alt = (altPool || []).find((a) => a.id !== item.id);
      if (alt) booking.alternative = alt;
    }
    s.bookings.push(booking);
    idx++;
    setTimeout(step, 900);
  };
  pushEvent(s, "BOOKING_STARTED", `${list.length} items`);
  reply.parts.push({ type: "progress", lines: ["Booking your trip..."] });
  step();
}

/* Retry a failed booking with the offered alternative */
router.post("/booking/retry", (req, res) => {
  const s = req.session;
  const { id } = req.body || {};
  const b = s.bookings.find((x) => x.id === id);
  if (!b) return res.status(404).json({ error: "booking not found" });
  const alt = b.alternative;
  /* swap the failed item in the trip for the alternative (dependency recalc) */
  s.items = s.items.filter((i) => i.id !== b.item.id);
  if (alt) {
    s.items.push(alt);
    b.note = `Alternative ${alt.kind} found: ${alt.provider || alt.name}`;
  } else {
    const fallbackPool =
      b.item.kind === "hotel" ? s.pool.hotels : b.item.kind === "activity" ? s.pool.activities : b.item.kind === "restaurant" ? s.pool.restaurants : s.pool.transfers;
    const fb = (fallbackPool || []).find((h) => h.id !== b.item.id);
    if (fb) {
      s.items.push(fb);
      b.note = `Alternative ${fb.kind} found: ${fb.provider || fb.name}`;
    }
  }
  b.item = alt || s.items[s.items.length - 1] || b.item;
  b.status = "BOOKED";
  b.reason = null;
  s.cost = computeCost(s.items, { travelers: s.travelers, budget: s.budget });
  s.schedule = buildSchedule(s.items, {});
  s.issues = validate(s.items);
  res.json({ ok: true, bookings: s.bookings, cost: s.cost, items: s.items, schedule: s.schedule, issues: s.issues });
});

/* ---------- Demo seed scenario ---------- */
router.get("/demo", (req, res) => {
  res.json({
    script: [
      "I was supposed to go to Jaipur but my flight was cancelled. I'm stuck in Mumbai airport with ₹20,000. I don't know what to do.",
      "make it cheaper",
      "add a water park",
      "book it",
    ],
  });
});

export default router;
