import { navigate } from "./navigation";
export async function api(path, body, method = "POST") {
  const response = await fetch("/api/" + path, {
    method: body === undefined ? "GET" : method,
    headers: { "Content-Type": "application/json", "X-Waypoint-Request": "1" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const value = await response.json();
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith("auth")) go("login");
    throw Error(value.error || "Request failed");
  }
  return value;
}
export const go = (path) => {
  navigate(path);
};
export const fields = (form) => Object.fromEntries(new FormData(form));
export const localDate = (value) =>
  new Date(Date.parse(value) + 330 * 60000).toISOString().slice(0, 16);
export const iso = (value) => new Date(value + "+05:30").toISOString();
