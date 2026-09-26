import test from "node:test";
import assert from "node:assert/strict";
import { dedupe, computeCost, validate, buildSchedule } from "../server/tripbuilder/engine.js";
import { extractSituation, extractConstraints } from "../server/tripbuilder/ai.js";
import { searchTransport, searchHotels, searchTransfers } from "../server/tripbuilder/providers.js";
import { search as searchBuildOptions } from "../server/providers.js";

test("providers return deterministic, route-correct results", () => {
  const a = searchTransport({ from: "Mumbai", to: "Jaipur", date: "2026-10-15", kind: "flight" });
  const b = searchTransport({ from: "Mumbai", to: "Jaipur", date: "2026-10-15", kind: "flight" });
  assert.equal(a.length, b.length);
  assert.deepEqual(a[0], b[0]);
  for (const t of a) {
    assert.equal(t.from, "Mumbai");
    assert.equal(t.to, "Jaipur");
  }
  const h = searchHotels({ city: "Jaipur", nights: 2, date: "2026-10-15" });
  for (const x of h) assert.ok(x.name.includes("Jaipur"));
  const sameCity = searchTransport({ from: "Jaipur", to: "Jaipur", date: "x", kind: "flight" });
  assert.equal(sameCity.length, 0);
});

test("dedupe removes identical provider results", () => {
  const items = [
    { kind: "flight", provider: "IndiGo", from: "A", to: "B", depart: "10:00", pricePerHead: 100, id: "1" },
    { kind: "flight", provider: "IndiGo", from: "A", to: "B", depart: "10:00", pricePerHead: 100, id: "2" },
    { kind: "flight", provider: "Air India", from: "A", to: "B", depart: "11:00", pricePerHead: 120, id: "3" },
  ];
  assert.equal(dedupe(items).length, 2);
});

test("cost engine totals per-head and absolute prices", () => {
  const c = computeCost(
    [
      { kind: "flight", provider: "IndiGo", pricePerHead: 1000 },
      { kind: "hotel", provider: "Taj", total_price: 4000 },
      { kind: "restaurant", provider: "X", price_per_person: 500 },
    ],
    { travelers: 2, budget: 10000 },
  );
  // flight 2000 + hotel 4000 + food 1000 = 7000 + 1.2% fees = 7084
  assert.equal(c.total, 7084);
  assert.equal(c.over_budget, false);
  const over = computeCost([{ kind: "hotel", provider: "Taj", total_price: 4000 }], {
    travelers: 1,
    budget: 3000,
  });
  assert.equal(over.over_budget, true);
  assert.equal(over.over, 4048 - 3000);
});

test("schedule builds chronological day plans", () => {
  const days = buildSchedule([
    { kind: "train", provider: "E", from: "A", to: "B", depart: "08:00", arrive: "12:00", durationMin: 240 },
    { kind: "hotel", name: "H", stars: 3, rating: "4.0", check_in: "14:00" },
    { kind: "restaurant", name: "R", cuisine: "thali", price_per_person: 400, closing_time: "23:00" },
    { kind: "activity", name: "Fort", category: "sightseeing", durationMin: 120, duration: "2h 0m", price: 500 },
  ]);
  assert.equal(days.length, 2);
  assert.ok(days[0].events.some((e) => e.title.includes("A → B")));
});

test("validation rejects city mismatch and flags over-budget", () => {
  const issues = validate([
    { kind: "flight", provider: "F", from: "A", to: "Jaipur", depart: "08:00", durationMin: 120 },
    { kind: "hotel", provider: "H", city: "Goa", stars: 3, rating: "4" },
  ]);
  assert.ok(issues.some((i) => i.level === "error" && i.msg.includes("Goa")));
});

test("AI extracts situation, budget and constraints without inventing data", () => {
  const s = extractSituation(
    "I missed my Jaipur flight and I'm stuck in Mumbai with ₹20,000, just me",
  );
  assert.equal(s.current, "Mumbai");
  assert.equal(s.destination, "Jaipur");
  assert.equal(s.budget, 20000);
  assert.equal(s.travelers, 1);
  const c = extractConstraints("keep it under ₹15000 and I want a 4-star hotel");
  assert.equal(c.budget_max, 15000);
  assert.equal(c.hotel_min_stars, 4);
});

test("transfers are generated per city pair", () => {
  const t = searchTransfers({ city: "Jaipur", toPlace: "Taj Jaipur", km: 12 });
  assert.ok(t.length >= 3);
  assert.ok(t[0].estimated_price <= t[t.length - 1].estimated_price);
});

test("build results use curated destination-specific demo restaurants and attractions", () => {
  const request = { origin: "Mumbai", destination: "Jaipur", date: "2026-10-15", returnDate: "", travelers: 1, checkIn: "2026-10-15", checkOut: "2026-10-18", nights: 3 };
  const restaurants = searchBuildOptions("restaurants", request).options;
  const activities = searchBuildOptions("activities", request).options;
  assert.ok(restaurants.some((item) => item.name.includes("Rawat Mishtan Bhandar")));
  assert.ok(activities.some((item) => item.name === "Amber Fort"));
  assert.ok(restaurants.every((item) => item.fidelity === "Simulated" && item.source.includes("demo")));
  assert.ok(activities.every((item) => item.fidelity === "Simulated" && item.distanceKm <= 18));

  const delhiRestaurants = searchBuildOptions("restaurants", { ...request, destination: "Delhi" }).options;
  assert.ok(delhiRestaurants.some((item) => item.name.includes("Karim's")));
  assert.ok(!delhiRestaurants.some((item) => item.name.includes("Rawat Mishtan Bhandar")));
});
