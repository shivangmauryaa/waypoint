import test from "node:test";
import assert from "node:assert/strict";
import { getTripWeather } from "../server/weather.js";

const response = (status, data, headers = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: (name) => headers[name.toLowerCase()] || null },
  json: async () => data,
});

const forecast = {
  timezone: "Asia/Kolkata",
  current: { temperature_2m: 28, apparent_temperature: 30, weather_code: 61 },
  current_units: { temperature_2m: "°C" },
  hourly_units: {},
  daily_units: {},
  hourly: { time: ["2026-09-27T12:00"], temperature_2m: [28], precipitation_probability: [40] },
  daily: { time: ["2026-09-27"], temperature_2m_min: [24], temperature_2m_max: [32], precipitation_probability_max: [60] },
};

test("weather requests for one city share the same in-flight provider calls", async () => {
  let calls = 0;
  const fetchImpl = async (url) => {
    calls++;
    await new Promise((resolve) => setTimeout(resolve, 5));
    return url.includes("api.open-meteo.com")
      ? response(200, forecast)
      : response(200, { articles: [] });
  };
  const [first, second] = await Promise.all([
    getTripWeather("Jaipur", { fetchImpl }),
    getTripWeather("Jaipur", { fetchImpl }),
  ]);
  assert.equal(calls, 2);
  assert.equal(first, second);
  assert.equal(first.current.temperature_2m, 28);
});

test("weather 429 is converted to a friendly cached result with a retry window", async () => {
  let calls = 0;
  let clock = Date.parse("2026-09-27T00:00:00Z");
  const fetchImpl = async (url) => {
    calls++;
    return url.includes("api.open-meteo.com")
      ? response(429, {}, { "retry-after": "120" })
      : response(200, { articles: [] });
  };
  const first = await getTripWeather("Delhi", { fetchImpl, now: () => clock });
  assert.equal(first.current, null);
  assert.equal(first.retryAfterSeconds, 900);
  assert.match(first.warnings[0], /15 minutes/);
  assert.match(first.warnings[0], /forecast service is busy/i);
  assert.doesNotMatch(first.warnings.join(" "), /returned 429/i);
  clock += 60_000;
  const second = await getTripWeather("Delhi", { fetchImpl, now: () => clock });
  assert.equal(second, first);
  assert.equal(calls, 2, "a cached rate-limit response should not hit providers again");
});

test("weather keeps the last forecast when the next refresh is rate-limited", async () => {
  let calls = 0;
  let clock = Date.parse("2026-09-27T00:00:00Z");
  let failForecast = false;
  const fetchImpl = async (url) => {
    calls++;
    if (url.includes("api.open-meteo.com")) {
      return failForecast
        ? response(429, {}, { "retry-after": "120" })
        : response(200, forecast);
    }
    return response(200, { articles: [] });
  };
  const first = await getTripWeather("Goa", { fetchImpl, now: () => clock });
  assert.equal(first.current.temperature_2m, 28);
  failForecast = true;
  clock += 11 * 60 * 1000;
  const refreshed = await getTripWeather("Goa", { fetchImpl, now: () => clock });
  assert.equal(refreshed.current.temperature_2m, 28);
  assert.equal(refreshed.servedStale, true);
  assert.match(refreshed.warnings[1], /last available forecast/i);
  assert.equal(calls, 4);
});
