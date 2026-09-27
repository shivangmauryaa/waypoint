/* ============================================================
   Nugen AI adapter (server-side proxy).

   Wraps Nugen's OpenAI-compatible chat endpoint so the browser never
   sees the API key. Configure with environment variables:

     NUGEN_API_KEY   required to enable AI replies
     NUGEN_MODEL     default: gpt-oss-120b (verified available)
     NUGEN_BASE_URL  default: https://api.nugen.in
     NUGEN_TIMEOUT_MS default: 20000

   When no key is configured Ã¢â‚¬â€ or the upstream errors (e.g. the model
   is not deployed, or a 502 from the gateway) Ã¢â‚¬â€ callers fall back to
   the deterministic rule-based engine. AI is an enhancement, never a
   hard dependency.
   ============================================================ */

// Read env lazily so a .env file loaded at startup is picked up.
const BASE = () => process.env.NUGEN_BASE_URL || "https://api.nugen.in";
const MODEL = () => process.env.NUGEN_MODEL || "gpt-oss-120b";
const KEY = () => process.env.NUGEN_API_KEY || "";
const TIMEOUT_MS = () => Number(process.env.NUGEN_TIMEOUT_MS || 20000);
const PATH = "/api/v3/inference/chat/completions";

export const configured = () => Boolean(KEY());
export const modelName = () => MODEL();

const headers = () => ({
  Authorization: `Bearer ${KEY()}`,
  "Content-Type": "application/json",
  accept: "application/json",
});

/** One-shot completion. Throws on any failure so callers can fall back. */
export async function chat(messages, { maxTokens = 400, temperature = 0.3 } = {}) {
  if (!KEY()) throw Object.assign(Error("Nugen API key is not configured"), { code: "NO_KEY" });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS());
  try {
    const response = await fetch(BASE() + PATH, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ model: MODEL(), messages, max_tokens: maxTokens, temperature, stream: false }),
      signal: controller.signal,
    });
    const text = await response.text();
    if (!response.ok) throw Error(`Nugen ${response.status}: ${text.slice(0, 180)}`);
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw Error(`Nugen returned non-JSON: ${text.slice(0, 120)}`);
    }
    const reply = data?.choices?.[0]?.message?.content;
    if (!reply) throw Error("Nugen returned an empty completion");
    return { reply: String(reply).trim(), model: data.model || MODEL(), usage: data.usage };
  } finally {
    clearTimeout(timer);
  }
}

/** Streaming completion: async generator of text deltas. */
export async function* chatStream(messages, { maxTokens = 400, temperature = 0.3 } = {}) {
  if (!KEY()) throw Object.assign(Error("Nugen API key is not configured"), { code: "NO_KEY" });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS());
  try {
    const response = await fetch(BASE() + PATH, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ model: MODEL(), messages, max_tokens: maxTokens, temperature, stream: true }),
      signal: controller.signal,
    });
    if (!response.ok || !response.body) throw Error(`Nugen ${response.status}`);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const raw of lines) {
        const line = raw.trim();
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const event = JSON.parse(payload);
          if (event.error) throw Error(event.error.message || "Nugen stream error");
          const delta = event.choices?.[0]?.delta?.content;
          if (delta) yield delta;
        } catch (error) {
          if (error instanceof SyntaxError) continue;
          throw error;
        }
      }
    }
  } finally {
    clearTimeout(timer);
  }
}

// --- Prompt building for the trip builder's automated recovery ---------------

const itemLabel = (item) =>
  item ? item.name || item.source || item.code || item.vehicle || item.title || "an option" : null;

export function buildContextMessages(view, userMessage) {
  const req = view.request || {};
  const selection = view.selection || {};
  const chosen = [
    itemLabel(selection.flight),
    itemLabel(selection.returnFlight),
    itemLabel(selection.hotel),
    ...(selection.transfers || []).map(itemLabel),
    ...(selection.restaurants || []).map(itemLabel),
    ...(selection.activities || []).map(itemLabel),
  ].filter(Boolean);
  const context = [
    `Route: ${req.origin || "?"} -> ${req.destination || "?"}`,
    `Dates: ${req.date || "?"}${req.returnDate ? " to " + req.returnDate : ""}`,
    `Travelers: ${req.travelers || 1} Ã‚Â· Budget: INR ${req.budget || 0}`,
    `Status: ${view.status || "draft"} Ã‚Â· Phase: ${view.phase || "?"}`,
    `Selected so far: ${chosen.length ? chosen.join(", ") : "nothing yet"}`,
    `Estimated total: INR ${view.cost?.total || 0}`,
    view.problem ? `Reported problem: ${view.problem}` : null,
  ]
    .filter(Boolean)
    .join("\n");
  const history = (view.conversation || [])
    .filter((m) => m.text && ["user", "assistant"].includes(m.role))
    .slice(-6)
    .map((m) => ({ role: m.role, content: m.text }));
  return [
    {
      role: "system",
      content:
        "You are Waypoint's automated trip-recovery assistant. Help the traveller recover or build a trip. " +
        "Be warm, concise (2-4 short sentences) and practical. Never invent bookings, prices or availability Ã¢â‚¬â€ " +
        "only reference the trip context provided. If something is unknown, say so plainly. " +
        "Prices in this app are simulated estimates.",
    },
    { role: "system", content: "Current trip context:\n" + context },
    ...history,
    { role: "user", content: userMessage },
  ];
}
