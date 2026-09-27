/**
 * Static fallback shown when WebGL is unavailable, so the page never renders a
 * broken canvas. It keeps the Mumbai -> Delhi story readable without 3D, in the
 * same bright daylight language as the live scene.
 */
export function ScenePoster() {
  return (
    <div className="poster" aria-hidden="true">
      <svg viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="route" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.25" />
            <stop offset="55%" stopColor="#0ea5e9" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0.5" />
          </linearGradient>
        </defs>

        {/* soft clouds */}
        {[
          { cx: 220, cy: 150, rx: 120, ry: 44 },
          { cx: 640, cy: 96, rx: 160, ry: 52 },
          { cx: 980, cy: 190, rx: 130, ry: 46 },
        ].map((cloud, i) => (
          <ellipse
            key={i}
            cx={cloud.cx}
            cy={cloud.cy}
            rx={cloud.rx}
            ry={cloud.ry}
            fill="#ffffff"
            opacity="0.7"
          />
        ))}

        {/* horizon grid */}
        {Array.from({ length: 16 }).map((_, i) => (
          <line
            key={`v-${i}`}
            x1={i * 80}
            y1="470"
            x2={i * 80}
            y2="700"
            stroke="#c6d4e2"
            strokeWidth="1"
          />
        ))}
        {Array.from({ length: 6 }).map((_, i) => (
          <line
            key={`h-${i}`}
            x1="0"
            y1={470 + i * 46}
            x2="1200"
            y2={470 + i * 46}
            stroke="#c6d4e2"
            strokeWidth="1"
          />
        ))}

        {/* flight arc */}
        <path
          d="M 150 470 Q 600 120 1050 470"
          fill="none"
          stroke="url(#route)"
          strokeWidth="2.5"
          strokeDasharray="9 11"
        />
        <circle cx="150" cy="470" r="5.5" fill="#2563eb" />
        <circle cx="1050" cy="470" r="5.5" fill="#0ea5e9" />

        {/* aircraft glyph at the apex of the arc */}
        <g transform="translate(600 150) rotate(12)">
          <path
            d="M0 -14 L3 -2 L18 6 L3 4 L1 14 L-1 14 L-3 4 L-18 6 L-3 -2 Z"
            fill="#1e293b"
            opacity="0.92"
          />
        </g>
      </svg>
    </div>
  );
}
