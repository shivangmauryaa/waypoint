/* ============================================================
   Trip engine — shared by BOTH manual and automated modes.
   Pure rules: cost calculation, itinerary assembly, schedule
   validation, dedupe, dependency recalculation. No AI here.
   ============================================================ */
import { distanceKm, searchTransfers } from "./providers.js";

export const money = (n) => "₹" + Math.round(n).toLocaleString("en-IN");
const toMin = (t) => {
  const [h, m] = String(t).split(":").map(Number);
  return h * 60 + (m || 0);
};
const toClock = (m) =>
  `${String(Math.floor(((m % 1440) + 1440) % 1440 / 60)).padStart(2, "0")}:${String(((m % 60) + 60) % 60).padStart(2, "0")}`;

/* ---------- Dedupe (Problem 4) ---------- */
export function dedupe(items) {
  const seen = new Map();
  for (const it of items) {
    const key = `${it.kind}|${it.provider}|${it.from || it.city || ""}|${it.to || ""}|${it.depart || ""}|${it.pricePerHead || it.total_price || it.price || it.estimated_price || ""}`;
    if (!seen.has(key)) seen.set(key, it);
  }
  return [...seen.values()];
}

/* ---------- Cost engine (instant recalculation) ---------- */
export function computeCost(items, { travelers = 1, budget = 0 } = {}) {
  const lines = [];
  const add = (label, amt) => {
    if (amt > 0) lines.push({ label, amount: Math.round(amt) });
  };
  const transport = items.find((i) => i.kind === "flight" || i.kind === "train" || i.kind === "bus");
  const hotel = items.find((i) => i.kind === "hotel");
  const transfer = items.find((i) => i.kind === "transfer");
  if (transport) add(transport.kind + " · " + transport.provider, transport.pricePerHead * travelers);
  if (hotel) add("Hotel · " + hotel.provider, hotel.total_price);
  if (transfer) add("Airport transfer · " + transfer.provider, transfer.estimated_price);
  const food = items.filter((i) => i.kind === "restaurant");
  if (food.length) add(`Food × ${food.length}`, food.reduce((s, r) => s + (r.price_per_person || 600) * travelers, 0));
  const acts = items.filter((i) => i.kind === "activity");
  if (acts.length) add(`Activities × ${acts.length}`, acts.reduce((s, a) => s + (a.price || 0) * travelers, 0));
  const local = items.filter((i) => i.kind === "local");
  if (local.length) add(`Local transport × ${local.length}`, local.reduce((s, l) => s + l.estimated_price, 0));
  const base = lines.reduce((s, l) => s + l.amount, 0);
  const fees = Math.round(base * 0.012);
  if (fees) lines.push({ label: "Fees & taxes (1.2%)", amount: fees });
  const total = base + fees;
  return {
    lines,
    total,
    budget: budget || 0,
    over: budget ? Math.max(0, total - budget) : 0,
    over_budget: budget ? total > budget : false,
  };
}

/* ---------- Schedule assembly (chronological + travel times) ---------- */
export function buildSchedule(items, { dayStart = 8 * 60 } = {}) {
  const days = [];
  let cur = { index: 1, events: [] };
  const push = (time, icon, title, detail, ref) =>
    cur.events.push({ time: toClock(time), min: ((time % 1440) + 1440) % 1440, icon, title, detail, ref });
  const transport = items.find((i) => ["flight", "train", "bus"].includes(i.kind));
  const hotel = items.find((i) => i.kind === "hotel");
  const transfer = items.find((i) => i.kind === "transfer");
  let t = dayStart;
  if (transport) {
    push(toMin(transport.depart), "✈️", `${transport.from} → ${transport.to}`, `${transport.provider} · ${transport.duration}`, transport.id);
    t = toMin(transport.depart) + transport.durationMin;
    push(t, "🛬", `Arrive ${transport.to}`, transport.arrive + " local", transport.id);
  }
  if (transfer) {
    const km = transport ? 12 : 8;
    push(t + 30, "🚕", `Transfer → ${hotel ? hotel.name : "hotel"}`, `${transfer.provider} · ${transfer.eta_min} min · ${money(transfer.estimated_price)}`, transfer.id);
    t = t + 30 + transfer.eta_min;
  }
  if (hotel) {
    push(Math.max(t, toMin(hotel.check_in || "14:00")), "🏨", `Check-in ${hotel.name}`, `★ ${hotel.stars} · ${hotel.rating}`, hotel.id);
    t = Math.max(t, toMin(hotel.check_in || "14:00")) + 40;
  }
  const meals = items.filter((i) => i.kind === "restaurant");
  const acts = items.filter((i) => i.kind === "activity");
  const dinner = meals[0];
  if (dinner) push(Math.max(t + 60, 20 * 60), "🍛", `Dinner · ${dinner.name}`, `${dinner.cuisine} · ${money(dinner.price_per_person)}/person`, dinner.id);
  days.push(cur);
  /* Day 2+: activities */
  let day = 2,
    cursor = dayStart;
  const rest = [...acts];
  if (rest.length) {
    cur = { index: day, events: [] };
    push(cursor, "🍳", "Breakfast", "At hotel", null);
    for (const a of rest) {
      const start = cursor + 30;
      push(start, "🎯", a.name, `${a.category} · ${a.duration} · ${money(a.price)}`, a.id);
      cursor = start + a.durationMin;
      if (cursor > 21 * 60) {
        days.push(cur);
        day++;
        cur = { index: day, events: [] };
        cursor = dayStart;
        push(cursor, "🍳", "Breakfast", "At hotel", null);
      }
    }
    const lunch = meals[1];
    if (lunch) push(13 * 60, "🍛", `Lunch · ${lunch.name}`, lunch.cuisine, lunch.id);
    days.push(cur);
  }
  return days.sort((a, b) => a.index - b.index);
}

/* ---------- Validation (Problem 5: impossible itineraries) ---------- */
export function validate(items) {
  const issues = [];
  const transport = items.find((i) => ["flight", "train", "bus"].includes(i.kind));
  const hotel = items.find((i) => i.kind === "hotel");
  const acts = items.filter((i) => i.kind === "activity");
  const meals = items.filter((i) => i.kind === "restaurant");
  if (transport && hotel && transport.to !== hotel.city)
    issues.push({ level: "error", msg: `Transport arrives in ${transport.to} but hotel is in ${hotel.city}.` });
  for (const a of acts) {
    if (!a.opening_time || !a.closing_time) continue;
    const open = toMin(a.opening_time),
      close = toMin(a.closing_time);
    /* naive: check scheduled slot from schedule is inside opening hours */
    const slot = a._slotMin;
    if (slot != null && (slot < open || slot + a.durationMin > close))
      issues.push({ level: "error", msg: `${a.name} is closed at its scheduled time (open ${a.opening_time}–${a.closing_time}).`, ref: a.id });
  }
  /* overlap check between activities on same day */
  const sorted = [...acts].sort((x, y) => (x._slotMin ?? 0) - (y._slotMin ?? 0));
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1],
      curA = sorted[i];
    if (prev._slotMin == null || curA._slotMin == null) continue;
    if (curA._slotMin < prev._slotMin + prev.durationMin)
      issues.push({ level: "error", msg: `${prev.name} and ${curA.name} overlap.`, ref: curA.id });
  }
  if (transport && meals[0] && hotel) {
    const arrive = toMin(transport.depart) + transport.durationMin;
    /* dinner is scheduled at 20:00 or after arrival+90min; warn only if the
       scheduled dinner slot collides with closing time, not on morning arrivals */
    const dinnerSlot = Math.max(arrive + 90, 20 * 60);
    if (dinnerSlot + 60 > toMin(meals[0].closing_time))
      issues.push({ level: "warn", msg: `Dinner at ${meals[0].name} would end after its ${meals[0].closing_time} closing time.`, ref: meals[0].id });
  }
  return issues;
}

/* ---------- Dependency recalculation (Problem 3 & 15) ---------- */
export function onSelectionChanged(session) {
  const items = session.items;
  const transport = items.find((i) => ["flight", "train", "bus"].includes(i.kind));
  const hotel = items.find((i) => i.kind === "hotel");
  /* hotel city must match transport destination; if mismatch, drop hotel */
  if (transport && hotel && hotel.city !== transport.to) {
    session.items = items.filter((i) => i.id !== hotel.id);
    session.log.push({ level: "info", msg: `Hotel removed — transport now arrives in ${transport.to}.` });
  }
  /* invalidate transfers that no longer match the hotel city */
  session.items = session.items.filter((i) => {
    if (i.kind !== "transfer") return true;
    return transport && i.route.startsWith(transport.to);
  });
  return session;
}

export function suggestTransfers(session) {
  const transport = session.items.find((i) => ["flight", "train", "bus"].includes(i.kind));
  const hotel = session.items.find((i) => i.kind === "hotel");
  if (!transport || !hotel) return [];
  const km = 8 + (parseFloat(hotel.distance_from_airport_km) || 8);
  return dedupe(searchTransfers({ city: transport.to, toPlace: hotel.name, km }));
}
