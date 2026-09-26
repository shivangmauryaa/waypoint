import { randomBytes, scrypt, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
const derive = promisify(scrypt);
export const token = () => randomBytes(32).toString("hex");
export const digest = (value) =>
  createHash("sha256").update(value).digest("hex");
export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const key = await derive(password, salt, 64);
  return `${salt}:${key.toString("hex")}`;
}
export async function checkPassword(password, hash) {
  const [salt, encoded] = hash.split(":");
  const key = await derive(password, salt, 64);
  return timingSafeEqual(key, Buffer.from(encoded, "hex"));
}
export function publicUser(user) {
  const { passwordHash, ...safe } = user;
  return safe;
}
export function sessionCookie(value, age = 604800) {
  return `waypoint_session=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${age}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
}
