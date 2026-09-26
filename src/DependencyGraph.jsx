import React, { useMemo, useState } from "react";
export default function DependencyGraph({ bookings, impacts, onSelect }) {
  const [selected, setSelected] = useState(null);
  const ordered = useMemo(() => {
    const list = [],
      seen = new Set();
    function add(b) {
      if (seen.has(b.id)) return;
      seen.add(b.id);
      b.dependencies.forEach((d) => {
        const p = bookings.find((x) => x.id === d.id);
        if (p) add(p);
      });
      list.push(b);
    }
    bookings.forEach(add);
    return list;
  }, [bookings]);
  const affected = new Set();
  function walk(id) {
    if (affected.has(id)) return;
    affected.add(id);
    bookings
      .filter((b) => b.dependencies.some((d) => d.id === id))
      .forEach((b) => walk(b.id));
  }
  if (selected) walk(selected);
  const h = ordered.length * 100 + 30;
  return (
    <div className="dependency-diagram">
      <p>
        Select a node to highlight its downstream chain. Double-click to open
        its booking.
      </p>
      <svg
        viewBox={`0 0 560 ${Math.max(150, h)}`}
        role="img"
        aria-label="Connected booking dependency diagram"
      >
        <defs>
          <marker
            id="graphArrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a97e" />
          </marker>
        </defs>
        {ordered.flatMap((b, i) =>
          b.dependencies.map((d, j) => {
            const parent = ordered.findIndex((x) => x.id === d.id),
              x = 20 + j * 12;
            return (
              <g key={b.id + d.id}>
                <path
                  d={`M 70 ${parent * 100 + 52} H ${x} V ${i * 100 + 52} H 70`}
                  fill="none"
                  stroke={affected.has(b.id) ? "#c29a55" : "#a8b898"}
                  strokeWidth="2"
                  markerEnd="url(#graphArrow)"
                />
                <text
                  x="455"
                  y={i * 100 + 63 + j * 12}
                  fontSize="9"
                  fill="#93a080"
                >
                  {d.buffer} min buffer
                </text>
              </g>
            );
          }),
        )}
        {ordered.map((b, i) => {
          const impact = impacts.find((x) => x.id === b.id);
          return (
            <g
              key={b.id}
              tabIndex={0}
              role="button"
              aria-label={`${b.title}; ${impact?.affected ? "affected" : "confirmed"}`}
              onClick={() => setSelected(b.id)}
              onDoubleClick={() => onSelect(b)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSelect(b);
                if (e.key === " ") setSelected(b.id);
              }}
              style={{ cursor: "pointer" }}
            >
              <rect
                x="70"
                y={i * 100 + 20}
                width="370"
                height="67"
                rx="8"
                fill={
                  affected.has(b.id)
                    ? "#f6eddb"
                    : impact?.affected
                      ? "#fcf2e5"
                      : "#f5f8ef"
                }
                stroke={selected === b.id ? "#587b40" : "#dfe6d4"}
                strokeWidth={selected === b.id ? 2 : 1}
              />
              <text x="86" y={i * 100 + 43} fontSize="9" fill="#9ca887">
                {b.type.toUpperCase()} ·{" "}
                {impact?.direct
                  ? "DIRECT IMPACT"
                  : impact?.affected
                    ? "DOWNSTREAM IMPACT"
                    : "CONFIRMED"}
              </text>
              <text x="86" y={i * 100 + 67} fontSize="12" fill="#61794d">
                {b.title.length > 45 ? b.title.slice(0, 43) + "…" : b.title}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
