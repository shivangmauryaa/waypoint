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
export function originAllowed(origin) {
  return (
    !origin ||
    /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin) ||
    allowedOrigins.has(origin) ||
    (trustTunnel && /^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/.test(origin))
  );
}
