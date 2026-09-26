import test from "node:test";
import assert from "node:assert/strict";
import { seed } from "../server/seed.js";
import {
  impacted,
  recover,
  warnings,
  insights,
  risk,
  policy,
  topological,
} from "../server/engine.js";
function disrupt(type = "delay", bookingId = "flight", delayMinutes = 120) {
  const s = seed();
  s.disruptions = [
    {
      id: "test",
      bookingId,
      type,
      delayMinutes,
      occurredAt: "2026-10-12T01:30:00Z",
    },
  ];
  return s;
}
test("healthy itinerary has no recovery and exposes tight connections", () => {
  const s = seed();
  assert.equal(recover(s).length, 0);
  assert.equal(impacted(s).filter((i) => i.affected).length, 0);
  assert.ok(warnings(s).length > 0);
});
test("flight delay propagates to transfer, hotel and activity", () => {
  const impacts = impacted(disrupt());
  for (const id of ["flight", "transfer", "hotel", "tour"])
    assert.ok(impacts.find((i) => i.id === id).affected);
});
test("all recovery plans are feasible, priced and deterministic", () => {
  const s = disrupt(),
    plans = recover(s);
  assert.ok(plans.length >= 2);
  assert.deepEqual(plans, recover(s));
  for (const plan of plans) {
    assert.equal(plan.net, plan.gross - plan.refund);
    assert.ok(plan.net <= s.preferences.budget);
    for (const b of plan.bookings)
      for (const dep of b.dependencies) {
        const parent = plan.bookings.find((p) => p.id === dep.id);
        assert.ok(
          Date.parse(parent.end) + dep.buffer * 60000 <= Date.parse(b.start),
        );
        assert.equal(parent.to, b.from);
      }
  }
});
test("cancellation replaces root and credits sample supplier refund", () => {
  const s = disrupt("cancellation");
  for (const p of recover(s)) {
    assert.notEqual(p.bookings[0].offerId, "flight");
    assert.equal(p.changes.find((c) => c.bookingId === "flight").refund, 4200);
  }
});
test("zero budget never produces over-budget plans", () => {
  const s = disrupt();
  s.preferences.budget = 0;
  assert.equal(recover(s).length, 0);
});
test("unavailable inventory gives no feasible plan", () => {
  const s = disrupt("cancellation");
  s.offers = [];
  assert.equal(recover(s).length, 0);
});
test("weather avoids closed departure window", () => {
  const s = disrupt("weather", "flight", 240);
  s.preferences.budget = 25000;
  const plans = recover(s);
  assert.ok(plans.length);
  for (const p of plans)
    assert.ok(
      Date.parse(p.bookings[0].start) >=
        Date.parse(s.trip.bookings[0].start) + 240 * 60000,
    );
});
test("hotel cancellation can be recovered independently", () => {
  const s = disrupt("cancellation", "hotel", 0);
  assert.ok(recover(s).length);
  assert.equal(impacted(s).find((i) => i.id === "flight").affected, false);
});
test("accessibility and seat availability are enforced", () => {
  const s = disrupt("cancellation");
  s.preferences.accessible = true;
  for (const p of recover(s))
    for (const b of p.bookings) if (b.offerId) assert.equal(b.accessible, true);
  s.offers.forEach((o) => (o.seats = 1));
  assert.equal(recover(s).length, 0);
});
test("multiple disruptions are resolved together", () => {
  const s = disrupt();
  s.disruptions.push({
    bookingId: "dinner",
    type: "cancellation",
    delayMinutes: 0,
    occurredAt: "2026-10-12T01:30:00Z",
  });
  assert.ok(recover(s).length);
  for (const p of recover(s))
    assert.ok(p.changes.some((c) => c.bookingId === "dinner"));
});
test("dependency cycles are rejected", () => {
  const s = seed();
  const first = s.trip.bookings[0];
  const last = s.trip.bookings[s.trip.bookings.length - 1];
  first.dependencies = [{ id: last.id, buffer: 0 }];
  last.dependencies = [{ id: first.id, buffer: 0 }];
  assert.throws(() => topological(s.trip.bookings), /cycle/);
});
test("traveler changes require a priced alternative, not a free reschedule", () => {
  const s = disrupt("traveler_change", "flight", 120);
  s.offers = [];
  assert.equal(recover(s).length, 0);
});
test("replacement departures before the simulation clock are rejected", () => {
  const s = disrupt("cancellation");
  s.clock = "2026-10-15T12:00:00+05:30";
  assert.equal(recover(s).length, 0);
});
test("location mismatches produce proactive warnings", () => {
  const s = seed();
  s.trip.bookings[1].from = "Different airport";
  assert.ok(warnings(s).some((w) => w.title === "Missing location connection"));
});
test("insights summarise value, refund exposure and the next booking", () => {
  const s = seed();
  s.clock = "2026-10-11T10:00:00Z";
  const info = insights(s);
  const value = s.trip.bookings.reduce((n, b) => n + b.price, 0);
  assert.equal(info.value, value);
  assert.equal(info.bookings, s.trip.bookings.length);
  assert.equal(info.travelers, s.trip.travelers);
  assert.ok(info.refundable > 0 && info.refundable < value);
  assert.equal(info.refundExposure, value - info.refundable);
  assert.equal(info.next.id, "flight");
  assert.equal(info.daysUntil, 1);
  assert.equal(
    Object.values(info.byType).reduce((n, x) => n + x, 0),
    value,
  );
});
test("insights become conservative once refund deadlines pass", () => {
  const s = seed();
  s.clock = "2026-10-12T02:30:00Z";
  const info = insights(s);
  assert.equal(info.refundable, 0);
  assert.equal(info.refundExposure, info.value);
  assert.equal(info.next.id, "flight");
  assert.equal(info.next.minutesUntil, 0);
});
test("risk scores reflect tight connections and active disruptions", () => {
  const healthy = risk(seed());
  assert.equal(healthy.items.length, seed().trip.bookings.length);
  assert.ok(healthy.overall >= 0 && healthy.overall <= 100);
  const cancelled = risk(disrupt("cancellation"));
  assert.ok(cancelled.overall > healthy.overall);
  assert.ok(cancelled.worst.score >= 40);
  assert.equal(cancelled.worst.id, "flight");
  assert.ok(cancelled.worst.factors.some((f) => /unavailable/.test(f)));
});
test("route breaks dominate the risk score", () => {
  const s = seed();
  s.trip.bookings[1].from = "Different airport";
  const r = risk(s);
  const broken = r.items.find((i) =>
    i.factors.some((f) => /Route break/.test(f)),
  );
  assert.ok(broken);
  assert.ok(broken.score >= 25);
  assert.equal(r.worst.id, broken.id);
});
test("policy explains refund eligibility against the trip clock", () => {
  const early = policy({ ...seed(), clock: "2026-01-01T00:00:00Z" });
  assert.ok(early.every((p) => p.eligible));
  assert.ok(early.every((p) => ["partial", "none"].includes(p.status)));
  assert.ok(early.some((p) => p.status === "partial"));
  assert.ok(early.some((p) => p.status === "none"));
  assert.ok(early.every((p) => p.amount === Math.round(p.price * p.refund)));
  const late = policy({ ...seed(), clock: "2027-01-01T00:00:00Z" });
  assert.ok(
    late.every((p) => !p.eligible && p.status === "expired" && p.amount === 0),
  );
});
test("supplier cancellation refunds the full booking in the demo", () => {
  const p = policy(disrupt("cancellation")).find((x) => x.id === "flight");
  assert.equal(p.status, "full");
  assert.equal(p.amount, p.price);
});
