export const host = process.env.HOST || "0.0.0.0";
export const publicMode = process.env.PUBLIC_MODE === "1";
export const trustTunnel = process.env.TRUST_TUNNEL === "1";
export const allowedOrigins = new Set(
  (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean),
);
export const localRequest = (req) =>
  ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(req.socket.remoteAddress);
export const remoteAccountBlocked = (req, user) =>
  publicMode &&
  !localRequest(req) &&
  ((user?.role === "admin" && !user.remoteAdminEnabled) ||
    user?.email === "traveler@waypoint.local");
export function originAllowed(origin, req) {
  if (!origin) return true;
  if (/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin)) return true;
  if (/^https:\/\/[a-z0-9-]+\.onrender\.com$/.test(origin)) return true;
  if (allowedOrigins.has(origin)) return true;
  if (trustTunnel && /^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/.test(origin)) return true;
  if (req && req.get("host")) {
    const hostHeader = req.get("host");
    try {
      const originUrl = new URL(origin);
      if (originUrl.host === hostHeader) return true;
    } catch {}
  }
  return false;
}
