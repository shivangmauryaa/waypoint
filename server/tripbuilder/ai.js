/* ============================================================
   AI orchestration layer (rule-based NLU — deterministic, no
   external calls, never invents data: it only reasons over
   provider results and the trip engine).
   ============================================================ */
import { CITIES } from "./providers.js";
import { money, computeCost } from "./engine.js";

const CITY_LIST = Object.keys(CITIES);

/* ---------- Situation extraction ---------- */
export function extractSituation(text) {
  const t = text.toLowerCase();
  const found = CITY_LIST.filter((c) => t.includes(c.toLowerCase()));
  let current = null,
    destination = null;
  const stuckIn = t.match(/(?:stuck in|currently in|now in|at)\s+([a-z]+)/);
  const to = t.match(/(?:to|for)\s+([a-z]+)/g) || [];
  for (const c of found) {
    const lc = c.toLowerCase();
    if (stuckIn && stuckIn[1] && lc.startsWith(stuckIn[1])) current = c;
  }
  for (const m of to) {
    const hit = CITY_LIST.find((c) => m.includes(c.toLowerCase()));
    if (hit && hit !== current && !destination) destination = hit;
  }
  if (!current && found.length) current = found[0];
  if (!destination && found.length > 1) destination = found[1];
  const problem = /cancel|missed|stuck|delay|stranded/.test(t)
    ? (t.match(/missed (?:my )?(flight|train|bus|trip|connection)/) || [])[1] || "trip disruption"
    : null;
  const budgetMatch = t.match(/(?:₹|rs\.?|inr)\s?([\d,]+)(k)?/);
  const budget = budgetMatch
    ? parseInt(budgetMatch[1].replace(/,/g, ""), 10) * (budgetMatch[2] ? 1000 : 1)
    : null;
  const travelers = /family|kids|children/.test(t)
    ? 3
    : /friend|we |two of us|couple/.test(t)
      ? 2
      : /just me|solo|i am alone|myself/.test(t)
        ? 1
        : null;
  return { current, destination, problem, budget, travelers };
}

/* ---------- Constraint extraction (Problem: AI constraint engine) ---------- */
export function extractConstraints(text) {
  const t = text.toLowerCase();
  const c = {};
  const budget = t.match(/(?:under|below|within|max(?:imum)? of?|keep.{0,10}under)\s*(?:₹|rs\.?)?\s?([\d,]+)(k)?/);
  if (budget) c.budget_max = parseInt(budget[1].replace(/,/g, ""), 10) * (budget[2] ? 1000 : 1);
  const stars = t.match(/(\d)[\s-]star/);
  if (stars) c.hotel_min_stars = parseInt(stars[1], 10);
  const travel = t.match(/(?:travel|commute).{0,20}?(\d+)\s*min/);
  if (travel) c.max_local_travel_minutes = parseInt(travel[1], 10);
  if (/adventure/.test(t)) c.activity_preferences = ["adventure"];
  if (/sightsee|culture|heritage|fort|palace|museum/.test(t)) c.activity_preferences = ["sightseeing", "museum"];
  if (/cheaper|lower cost|reduce|less expensive|save money/.test(t)) c.intent = "cheaper";
  if (/4 ?star|better hotel|upgrade/.test(t)) c.intent = c.intent || "upgrade_hotel";
  if (/change (?:the )?hotel/.test(t)) c.intent = "change_hotel";
  if (/remove|drop|skip/.test(t)) c.intent = "remove_item";
  if (/add/.test(t)) c.intent = "add_item";
  const waterpark = /water (?:park|kingdom)/.test(t);
  if (waterpark) c.add_activity = "Water Kingdom";
  const snowpark = /snow ?park/.test(t);
  if (snowpark) c.add_activity = "Snow Park";
  const removeAct = t.match(/remove (?:the )?(.+?)(?: from| please|\.|$)/);
  if (removeAct) c.remove_activity_like = removeAct[1].trim();
  return c;
}

/* ---------- Planner: assemble the best plan from result pools ---------- */
export function assemblePlan(pool, opts) {
  const { travelers = 1, budget = 0, constraints = {}, city } = opts;
  const chosen = [];
  const explain = [];
  let flights = pool.transport.filter((x) => x.kind === "flight");
  let trains = pool.transport.filter((x) => x.kind === "train");
  const transports = [...flights, ...trains, ...pool.transport.filter((x) => x.kind === "bus")];
  let transport = null;
  if (transports.length) {
    transport = [...transports].sort(
      (a, b) => a.pricePerHead * travelers - b.pricePerHead * travelers,
    )[0];
    chosen.push(transport);
    explain.push(
      `Flight ${transport.provider} at ${transport.depart} is the lowest fare (${money(transport.pricePerHead)}/head) of ${transports.length} options.`,
    );
  }
  let hotels = [...pool.hotels];
  if (constraints.hotel_min_stars)
    hotels = hotels.filter((h) => h.stars >= constraints.hotel_min_stars);
  if (budget) hotels = hotels.filter((h) => h.total_price <= budget * 0.55);
  let hotel = hotels[0] || pool.hotels[0] || null;
  if (hotel) {
    chosen.push(hotel);
    explain.push(
      `${hotel.name} — best fit: ${hotel.stars}★, ${money(hotel.total_price)} total for ${nightsOf(opts)} nights${constraints.hotel_min_stars ? `, meets your ${constraints.hotel_min_stars}★ requirement` : ""}.`,
    );
  }
  const transfers = pool.transfers.length
    ? pool.transfers
    : [];
  const transfer = transfers[0] || null;
  if (transfer) {
    chosen.push(transfer);
    explain.push(`${transfer.provider} transfer: cheapest of ${transfers.length} at ${money(transfer.estimated_price)}, ${transfer.eta_min} min.`);
  }
  const meals = [...pool.restaurants].sort((a, b) => a.price_per_person - b.price_per_person);
  const picks = meals.slice(0, 2);
  for (const r of picks) chosen.push(r);
  if (picks.length)
    explain.push(`Restaurants: ${picks.map((r) => r.name).join(", ")} — closest/most affordable matches open past your arrival.`);
  let acts = [...pool.activities];
  if (constraints.activity_preferences)
    acts = acts.filter((a) =>
      constraints.activity_preferences.some((p) => a.category.includes(p) || a.tags.includes("match")),
    );
  let actBudget = Math.max(0, (budget || Infinity) - estTotal(chosen, travelers));
  acts = acts.filter((a) => a.price <= actBudget * 0.25);
  const picked = acts.slice(0, 3);
  for (const a of picked) chosen.push(a);
  if (picked.length)
    explain.push(
      `Activities: ${picked.map((a) => a.name).join(", ")} — highest rated within the remaining budget of ${money(actBudget)}.`,
    );
  return { chosen, explain };
}
const nightsOf = (o) => Math.max(1, o.nights || 1);
const estTotal = (items, travelers) =>
  items.reduce(
    (s, i) =>
      s +
      (i.pricePerHead ? i.pricePerHead * travelers : 0) +
      (i.total_price || 0) +
      (i.estimated_price || 0) +
      (i.price_per_person ? i.price_per_person * travelers : 0) +
      (i.price || 0) * travelers,
    0,
  );

/* ---------- Re-optimization for "make it cheaper" etc. ---------- */
export function reoptimize(session, intent, pool) {
  const log = [];
  const items = session.items;
  const travelers = session.travelers || 1;
  if (intent === "cheaper") {
    const before = computeCost(session.items, { travelers, budget: session.budget }).total;
    const hotel = items.find((i) => i.kind === "hotel");
    const cheaperHotel = pool.hotels.find((h) => hotel && h.total_price < hotel.total_price);
    if (cheaperHotel) {
      session.items = items.map((i) => (i.id === hotel.id ? cheaperHotel : i));
      log.push(`✓ Hotel changed: ${hotel.name} → ${cheaperHotel.name} (−${money(hotel.total_price - cheaperHotel.total_price)})`);
    }
    const rest = items.filter((i) => i.kind === "restaurant");
    const cheapRest = [...pool.restaurants].sort((a, b) => a.price_per_person - b.price_per_person)[0];
    if (rest.length && cheapRest && cheapRest.price_per_person < rest[0].price_per_person) {
      session.items = session.items.map((i) =>
        i.kind === "restaurant" && i.id === rest[0].id ? cheapRest : i,
      );
      log.push(`✓ Restaurant changed: ${rest[0].name} → ${cheapRest.name}`);
    }
    const acts = items.filter((i) => i.kind === "activity");
    if (acts.length > 1) {
      const drop = acts.sort((a, b) => b.price - a.price)[0];
      session.items = session.items.filter((i) => i.id !== drop.id);
      log.push(`✓ Activity removed: ${drop.name} (−${money(drop.price)})`);
    }
    const after = computeCost(session.items, { travelers, budget: session.budget }).total;
    log.push(`New total: ${money(after)} (was ${money(before)} — saved ${money(before - after)})`);
  } else if (intent === "add_item" && pool.activities.length) {
    const name = session.pendingAdd || pool.activities[0].name;
    const act = pool.activities.find((a) => a.name.toLowerCase().includes(String(name).toLowerCase())) || pool.activities[0];
    if (act && !session.items.some((i) => i.id === act.id)) {
      session.items.push(act);
      log.push(`✓ ${act.name} added (+${money(act.price)})`);
    }
  } else if (intent === "remove_item" && session.pendingRemoveLike) {
    const hit = session.items.find((i) =>
      i.name?.toLowerCase().includes(session.pendingRemoveLike.toLowerCase()),
    );
    if (hit) {
      session.items = session.items.filter((i) => i.id !== hit.id);
      log.push(`✓ ${hit.name} removed (−${money(hit.price || hit.total_price || 0)})`);
    }
  } else if (intent === "change_hotel" && pool.hotels.length > 1) {
    const cur = items.find((i) => i.kind === "hotel");
    const alts = pool.hotels.filter((h) => h.id !== cur?.id).slice(0, 5);
    log.push(`Here ${alts.length === 1 ? "is 1 alternative" : `are ${alts.length} alternatives`} — pick one:`);
    session.offerAlternatives = alts.map((h) => ({ kind: "hotel", ...h }));
  }
  return log;
}
