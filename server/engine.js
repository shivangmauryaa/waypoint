export const minute = 60000;
export const types = [
  "delay",
  "cancellation",
  "weather",
  "missed_connection",
  "transfer_failure",
  "traveler_change",
];
export function topological(bookings) {
  const result = [],
    visited = new Set(),
    active = new Set(),
    map = new Map(bookings.map((b) => [b.id, b]));
  function visit(b) {
    if (active.has(b.id))
      throw new Error("Itinerary contains a dependency cycle");
    if (visited.has(b.id)) return;
    active.add(b.id);
    for (const d of b.dependencies) {
      if (!map.has(d.id)) throw new Error("Unknown dependency");
      visit(map.get(d.id));
    }
    active.delete(b.id);
    visited.add(b.id);
    result.push(b);
  }
  bookings.forEach(visit);
  return result;
}
export function impacted(state) {
  const results = new Map();
  for (const b of topological(state.trip.bookings)) {
    const disruptions = state.disruptions.filter((d) => d.bookingId === b.id);
    const unavailable = disruptions.some((d) =>
      [
        "cancellation",
        "weather",
        "missed_connection",
        "transfer_failure",
      ].includes(d.type),
    );
    const delay = Math.max(0, ...disruptions.map((d) => d.delayMinutes || 0));
    const blockers = b.dependencies.filter((d) => {
      const p = results.get(d.id);
      return (
        p.blocked ||
        p.end + d.buffer * minute > Date.parse(b.start) + delay * minute
      );
    });
    results.set(b.id, {
      id: b.id,
      direct: disruptions.length > 0,
      blocked: unavailable || blockers.length > 0,
      affected: disruptions.length > 0 || blockers.length > 0,
      end: Date.parse(b.end) + delay * minute,
      delay,
      reason: disruptions.length
        ? `${disruptions.at(-1).type.replaceAll("_", " ")}${delay ? ` · +${delay} min` : ""}`
        : blockers.length
          ? `Depends on ${blockers.map((d) => state.trip.bookings.find((x) => x.id === d.id).title).join(", ")}`
          : "",
    });
  }
  return [...results.values()];
}
export function warnings(state) {
  const list = [];
  const map = new Map(state.trip.bookings.map((b) => [b.id, b]));
  for (const b of state.trip.bookings)
    for (const d of b.dependencies) {
      const slack =
        (Date.parse(b.start) - Date.parse(map.get(d.id).end)) / minute -
        d.buffer;
      const wrongLocation = map.get(d.id).to !== b.from;
      if (slack < 30 || wrongLocation)
        list.push({
          bookingId: b.id,
          title: wrongLocation
            ? "Missing location connection"
            : slack < 0
              ? "Connection is not feasible"
              : "A little more breathing room",
          message: wrongLocation
            ? `${b.title} starts at ${b.from}, but its dependency ends at ${map.get(d.id).to}. Add a transfer or correct the locations.`
            : slack < 0
              ? `${b.title} is short by ${-slack} minutes after its ${d.buffer}-minute connection allowance.`
              : `${b.title} has ${slack} minutes of spare time after its ${d.buffer}-minute connection allowance.`,
          severity: slack < 0 || wrongLocation ? "high" : "medium",
        });
    }
  return list;
}
export function insights(state) {
  const bookings = state.trip.bookings,
    clock = Date.parse(state.clock || new Date().toISOString());
  const byType = {};
  for (const b of bookings) byType[b.type] = (byType[b.type] || 0) + b.price;
  const upcoming = bookings
    .filter((b) => Date.parse(b.start) >= clock)
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  const next = upcoming[0]
    ? {
        id: upcoming[0].id,
        title: upcoming[0].title,
        provider: upcoming[0].provider,
        start: upcoming[0].start,
        minutesUntil: Math.round(
          (Date.parse(upcoming[0].start) - clock) / minute,
        ),
      }
    : null;
  const value = bookings.reduce((sum, b) => sum + b.price, 0);
  const refundable = bookings.reduce(
    (sum, b) =>
      Date.parse(b.refundDeadline) >= clock
        ? sum + Math.round(b.price * b.refund)
        : sum,
    0,
  );
  const tripStart = Date.parse(state.trip.start + "T00:00:00+05:30");
  return {
    value,
    refundable,
    refundExposure: value - refundable,
    byType,
    bookings: bookings.length,
    travelers: state.trip.travelers,
    upcoming: upcoming.length,
    next,
    daysUntil: Math.ceil((tripStart - clock) / 86400000),
    warnings: warnings(state).length,
    perTraveler: bookings.length
      ? Math.round(value / state.trip.travelers)
      : 0,
  };
}
const istHour = (value) =>
  Math.floor(((Date.parse(value) + 19800000) / 3600000) % 24);
export function risk(state) {
  const map = new Map(state.trip.bookings.map((b) => [b.id, b])),
    clock = Date.parse(state.clock || new Date().toISOString());
  const items = state.trip.bookings
    .map((b) => {
      const factors = [];
      let score = 0,
        slack = null;
      for (const d of b.dependencies) {
        const dep = map.get(d.id);
        if (!dep) continue;
        const spare =
          (Date.parse(b.start) - Date.parse(dep.end)) / minute - d.buffer;
        slack = slack === null ? spare : Math.min(slack, spare);
        if (dep.to !== b.from) {
          score += 25;
          factors.push(
            `Route break: ${dep.title} ends at ${dep.to}, but ${b.title} starts at ${b.from}.`,
          );
        }
        if (spare < 0) {
          score += 40;
          factors.push(
            `${Math.abs(Math.round(spare))} min short of the ${d.buffer}-minute buffer after ${dep.title}.`,
          );
        } else if (spare < 30) {
          score += 20;
          factors.push(`Only ${Math.round(spare)} min of slack after ${dep.title}.`);
        } else if (spare < 90) {
          score += 8;
          factors.push(`${Math.round(spare)} min of slack after ${dep.title}.`);
        }
      }
      const own = state.disruptions.filter((d) => d.bookingId === b.id),
        hard = own.find((d) =>
          [
            "cancellation",
            "weather",
            "missed_connection",
            "transfer_failure",
          ].includes(d.type),
        );
      if (hard) {
        score += 45;
        factors.push(
          `Active ${hard.type.replaceAll("_", " ")} makes this booking unavailable.`,
        );
      } else if (own.length) {
        const delay = Math.max(...own.map((d) => d.delayMinutes || 0));
        score += 25;
        factors.push(
          `Active ${own.at(-1).type.replaceAll("_", " ")}${delay ? ` (+${delay} min)` : ""}.`,
        );
      }
      const hour = istHour(b.start);
      if (hour < 6 || hour >= 22) {
        score += 10;
        factors.push(
          `Departs at ${String(hour).padStart(2, "0")}:00 IST — a low-resilience window with fewer same-day alternatives.`,
        );
      }
      if (
        b.dependencies.length &&
        b.dependencies.some((d) => {
          const dep = map.get(d.id);
          return dep && dep.to !== b.from;
        })
      )
        score += 5;
      if (Date.parse(b.start) < clock)
        factors.push("Already underway relative to the simulation clock.");
      score = Math.max(0, Math.min(100, score));
      return {
        id: b.id,
        title: b.title,
        start: b.start,
        score,
        slack: slack === null ? null : Math.round(slack),
        band:
          score >= 70
            ? "critical"
            : score >= 40
              ? "high"
              : score >= 20
                ? "medium"
                : "low",
        factors,
      };
    })
    .sort((a, b) => b.score - a.score);
  const overall = items.length
    ? Math.round(items.reduce((n, x) => n + x.score, 0) / items.length)
    : 0;
  return {
    overall,
    band:
      overall >= 70
        ? "critical"
        : overall >= 40
          ? "high"
          : overall >= 20
            ? "medium"
            : "low",
    worst: items[0] || null,
    items,
  };
}
export function policy(state) {
  const clock = Date.parse(state.clock || new Date().toISOString());
  return state.trip.bookings.map((b) => {
    const deadline = Date.parse(b.refundDeadline),
      eligible = clock <= deadline,
      disruption = state.disruptions.find((d) => d.bookingId === b.id),
      cancelled = disruption?.type === "cancellation";
    const amount = cancelled
      ? b.price
      : eligible
        ? Math.round(b.price * b.refund)
        : 0;
    return {
      id: b.id,
      title: b.title,
      provider: b.provider,
      price: b.price,
      refund: b.refund,
      refundDeadline: b.refundDeadline,
      eligible,
      cancelled,
      amount,
      status: cancelled
        ? "full"
        : !eligible
          ? "expired"
          : b.refund > 0
            ? "partial"
            : "none",
      note: cancelled
        ? "Supplier cancellation: full refund in this demo."
        : !eligible
          ? `The refund deadline (${b.refundDeadline.slice(0, 10)}) has passed at the current trip clock, so nothing is refundable.`
          : b.refund > 0
            ? `${Math.round(b.refund * 100)}% refundable until ${b.refundDeadline.slice(0, 10)}.`
            : "Non-refundable policy: cancelling forfeits the full amount.",
    };
  });
}
export function recover(state) {
  if (!state.disruptions.length) return [];
  const ordered = topological(state.trip.bookings),
    analysis = impacted(state);
  let paths = [{ bookings: [], changes: [], gross: 0, refund: 0, delay: 0 }];
  for (const b of ordered) {
    const impact = analysis.find((x) => x.id === b.id),
      ds = state.disruptions.filter((d) => d.bookingId === b.id);
    const unavailable = ds.some((d) =>
      [
        "cancellation",
        "weather",
        "missed_connection",
        "transfer_failure",
      ].includes(d.type),
    );
    const original = {
      ...b,
      start: new Date(
        Date.parse(b.start) + impact.delay * minute,
      ).toISOString(),
      end: new Date(Date.parse(b.end) + impact.delay * minute).toISOString(),
    };
    const candidates = [
      ...(!unavailable && !ds.some((d) => d.type === "traveler_change")
        ? [original]
        : []),
      ...state.offers.filter(
        (o) =>
          o.bookingId === b.id &&
          o.seats >= state.trip.travelers &&
          (!state.preferences.accessible || o.accessible) &&
          o.from === b.from &&
          o.to === b.to,
      ),
    ];
    const next = [];
    for (const path of paths)
      for (const option of candidates) {
        if (
          option.id !== b.id &&
          state.clock &&
          Date.parse(option.start) < Date.parse(state.clock)
        )
          continue;
        if (
          option.id !== b.id &&
          state.clock &&
          Date.parse(b.end) <= Date.parse(state.clock) &&
          !ds.length
        )
          continue;
        if (Date.parse(option.start) < Date.parse(b.start)) continue;
        if (
          ds.some((d) => d.type === "traveler_change") &&
          Date.parse(option.start) < Date.parse(b.start) + impact.delay * minute
        )
          continue;
        if (
          ds.some((d) => d.type === "weather") &&
          Date.parse(option.start) <
            Date.parse(b.start) + (impact.delay || 180) * minute
        )
          continue;
        if (
          !b.dependencies.every((d) => {
            const p = path.bookings.find((x) => x.id === d.id);
            return (
              p &&
              p.to === option.from &&
              Date.parse(p.end) + d.buffer * minute <= Date.parse(option.start)
            );
          })
        )
          continue;
        const replaced = option.id !== b.id,
          changed = replaced || impact.delay > 0;
        const fullRefund = ds.some((d) => d.type === "cancellation");
        const eligible =
          Date.parse(state.clock || state.disruptions.at(-1).occurredAt) <=
          Date.parse(b.refundDeadline);
        const refund = replaced
          ? Math.round(b.price * (fullRefund ? 1 : eligible ? b.refund : 0))
          : 0;
        const gross = path.gross + (replaced ? option.price : 0),
          totalRefund = path.refund + refund;
        next.push({
          bookings: [
            ...path.bookings,
            {
              ...option,
              id: b.id,
              offerId: replaced ? option.id : b.offerId,
              dependencies: b.dependencies,
              status: changed ? "recovered" : b.status,
            },
          ],
          changes: [
            ...path.changes,
            ...(changed
              ? [
                  {
                    bookingId: b.id,
                    title: b.title,
                    before: b.start,
                    after: option.start,
                    provider: option.provider,
                    cost: replaced ? option.price : 0,
                    refund,
                    reason: replaced
                      ? "Replacement that satisfies location, availability and connection constraints."
                      : "Keep the booking at its delayed time.",
                  },
                ]
              : []),
          ],
          gross,
          refund: totalRefund,
          delay:
            path.delay +
            Math.max(0, (Date.parse(option.end) - Date.parse(b.end)) / minute),
        });
      }
    paths = next
      .sort(
        (a, b) =>
          a.gross - a.refund + a.delay * 4 - (b.gross - b.refund + b.delay * 4),
      )
      .slice(0, 400);
  }
  const selected = [],
    rankers = [
      [
        "balanced",
        "Best balance",
        (p) => p.gross - p.refund + p.delay * 8 + p.changes.length * 400,
      ],
      ["budget", "Cost-conscious option", (p) => p.gross - p.refund],
      ["fastest", "Time-focused option", (p) => p.delay],
      [
        "preserve",
        "Fewer-change option",
        (p) => p.changes.length * 100000 + p.delay,
      ],
    ];
  const preferred = state.preferences.priority;
  rankers.sort((a, b) => (b[0] === preferred) - (a[0] === preferred));
  for (const [strategy, label, score] of rankers) {
    const p = paths
      .filter((p) => p.gross - p.refund <= state.preferences.budget)
      .sort((a, b) => score(a) - score(b))
      .find(
        (p) =>
          !selected.some(
            (s) => JSON.stringify(s.bookings) === JSON.stringify(p.bookings),
          ),
      );
    if (p)
      selected.push({
        ...p,
        id: strategy,
        label,
        net: p.gross - p.refund,
        preservation: Math.round(
          ((ordered.length - p.changes.length) / ordered.length) * 100,
        ),
        recommended: !selected.length,
      });
    if (selected.length === 3) break;
  }
  return selected;
}
