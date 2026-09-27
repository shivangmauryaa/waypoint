const cache = new Map();
const inFlight = new Map();
const successTtl = 10 * 60 * 1000;
const failureTtl = 15 * 60 * 1000;
const staleTtl = 6 * 60 * 60 * 1000;
const defaultRetrySeconds = 15 * 60;
const cityLocations = {
  Mumbai: [19.076, 72.8777, "Maharashtra"],
  Jaipur: [26.9124, 75.7873, "Rajasthan"],
  Delhi: [28.6139, 77.209, "Delhi"],
  Udaipur: [24.5854, 73.7125, "Rajasthan"],
  Goa: [15.4909, 73.8278, "Goa"],
  Bengaluru: [12.9716, 77.5946, "Karnataka"],
  Bangalore: [12.9716, 77.5946, "Karnataka"],
  Agra: [27.1767, 78.0081, "Uttar Pradesh"],
  Varanasi: [25.3176, 82.9739, "Uttar Pradesh"],
  Manali: [32.2432, 77.1892, "Himachal Pradesh"],
  Hyderabad: [17.385, 78.4867, "Telangana"],
  Chennai: [13.0827, 80.2707, "Tamil Nadu"],
  Kolkata: [22.5726, 88.3639, "West Bengal"],
  Ahmedabad: [23.0225, 72.5714, "Gujarat"],
};

const cleanCity = (value = "") => String(value).split(",")[0].trim();

function retryDelay(response) {
  const header = response.headers?.get?.("retry-after");
  if (!header) return defaultRetrySeconds;
  const seconds = Number(header);
  const delay = Number.isFinite(seconds)
    ? seconds
    : Math.ceil((Date.parse(header) - Date.now()) / 1000);
  return Math.max(60, Math.min(60 * 60, delay > 0 ? delay : defaultRetrySeconds));
}

async function json(url, fetchImpl, provider) {
  const response = await fetchImpl(url, {
    signal: AbortSignal.timeout(4500),
    headers: { "User-Agent": "WaypointTravel/1.0 (trip weather workspace)" },
  });
  if (!response.ok) {
    const error = new Error(`${provider} returned ${response.status}`);
    error.status = response.status;
    error.retryAfterSeconds = response.status === 429 ? retryDelay(response) : defaultRetrySeconds;
    throw error;
  }
  return response.json();
}

async function fetchTripWeather(city, fetchImpl, now) {
  const result = {
    city,
    fetchedAt: new Date(now()).toISOString(),
    source: "Open-Meteo",
    current: null,
    hourly: [],
    daily: [],
    news: [],
    coordinates: null,
    warnings: [],
  };
  try {
    const known = cityLocations[city];
    const location = known
      ? { name: city, latitude: known[0], longitude: known[1], admin1: known[2], country: "India" }
      : (await json(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`, fetchImpl, "Weather geocoding service")).results?.[0];
    if (!location) throw new Error(`Could not locate ${city}`);
    result.city = location.name;
    result.region = location.admin1;
    result.country = location.country;
    result.coordinates = { latitude: location.latitude, longitude: location.longitude };

    const params = new URLSearchParams({
      latitude: String(location.latitude),
      longitude: String(location.longitude),
      timezone: "auto",
      forecast_days: "7",
      current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,visibility,uv_index",
      hourly: "temperature_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m,uv_index",
      daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max",
    });
    const query = encodeURIComponent(`("${city}" OR "${result.region || city}") (weather OR rain OR travel OR transport OR tourism)`);
    const newsPromise = json(
      `https://api.gdeltproject.org/api/v2/doc/doc?query=${query}&mode=ArtList&format=json&sort=DateDesc&maxrecords=6`,
      fetchImpl,
      "Area news service",
    );
    const forecastPromise = json(
      `https://api.open-meteo.com/v1/forecast?${params}`,
      fetchImpl,
      "Open-Meteo",
    );
    const [forecastResult, newsResult] = await Promise.allSettled([forecastPromise, newsPromise]);
    const forecast = forecastResult.status === "fulfilled" ? forecastResult.value : null;
    if (newsResult.status === "fulfilled") {
      result.news = (newsResult.value.articles || []).slice(0, 6).map((article) => ({
        title: article.title,
        url: article.url,
        source: article.domain || article.source,
        publishedAt: String(article.seendate || "").replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/, "$1-$2-$3T$4:$5:$6Z"),
      }));
    } else {
      result.warnings.push("Nearby news is temporarily unavailable.");
    }
    if (!forecast) {
      const error = forecastResult.reason;
      result.retryAfterSeconds = Math.max(
        defaultRetrySeconds,
        error.status === 429 ? error.retryAfterSeconds || defaultRetrySeconds : defaultRetrySeconds,
      );
      result.warnings.unshift(error.status === 429
        ? `The live forecast service is busy. Please retry in about ${Math.ceil(result.retryAfterSeconds / 60)} minutes.`
        : "The live forecast is temporarily unavailable. Please try again later.");
      return result;
    }

    result.current = { ...forecast.current, timezone: forecast.timezone, units: forecast.current_units };
    result.hourlyUnits = forecast.hourly_units;
    result.dailyUnits = forecast.daily_units;
    result.hourly = forecast.hourly
      ? Object.keys(forecast.hourly.time).map((key) => Object.fromEntries(Object.entries(forecast.hourly).map(([name, values]) => [name, values[key]])))
      : [];
    result.daily = forecast.daily
      ? Object.keys(forecast.daily.time).map((key) => Object.fromEntries(Object.entries(forecast.daily).map(([name, values]) => [name, values[key]])))
      : [];
  } catch {
    result.retryAfterSeconds = defaultRetrySeconds;
    result.warnings.unshift("The live forecast is temporarily unavailable. Please try again later.");
  }
  return result;
}

export async function getTripWeather(destination, { fetchImpl = fetch, now = Date.now } = {}) {
  const city = cleanCity(destination) || "Jaipur";
  const key = city.toLowerCase();
  const time = now();
  const cached = cache.get(key);
  if (cached && time < cached.expiresAt) return cached.data;
  if (inFlight.has(key)) return inFlight.get(key);

  const staleData = cached?.lastSuccessAt && time - cached.lastSuccessAt < staleTtl
    ? cached.successData
    : null;
  const request = (async () => {
    const live = await fetchTripWeather(city, fetchImpl, now);
    const completedAt = now();
    if (live.current) {
      cache.set(key, {
        data: live,
        successData: live,
        lastSuccessAt: completedAt,
        expiresAt: completedAt + successTtl,
      });
      return live;
    }
    if (staleData?.current) {
      const stale = {
        ...staleData,
        source: "Open-Meteo · last known forecast",
        servedStale: true,
        retryAfterSeconds: Math.max(defaultRetrySeconds, live.retryAfterSeconds || defaultRetrySeconds),
        warnings: [live.warnings[0] || "Live weather is temporarily unavailable.", "Showing the last available forecast."],
      };
      cache.set(key, {
        data: stale,
        successData: staleData,
        lastSuccessAt: cached.lastSuccessAt,
        expiresAt: completedAt + stale.retryAfterSeconds * 1000,
      });
      return stale;
    }
    const retryAfterSeconds = Math.max(defaultRetrySeconds, live.retryAfterSeconds || defaultRetrySeconds);
    cache.set(key, {
      data: live,
      successData: null,
      lastSuccessAt: null,
      expiresAt: completedAt + Math.max(failureTtl, retryAfterSeconds * 1000),
    });
    return live;
  })();
  inFlight.set(key, request);
  try {
    return await request;
  } finally {
    if (inFlight.get(key) === request) inFlight.delete(key);
  }
}

export function weatherSummary(weather) {
  if (!weather?.current) return `${weather?.city || "Destination"}: live weather is temporarily unavailable.`;
  const current = weather.current;
  const hours = weather.hourly.slice(0, 12).map((hour) => `${hour.time}: ${hour.temperature_2m}°C, ${hour.precipitation_probability}% rain chance`).join("; ");
  const days = weather.daily.slice(0, 5).map((day) => `${day.time}: ${day.temperature_2m_min}–${day.temperature_2m_max}°C, ${day.precipitation_probability_max}% precipitation chance`).join("; ");
  const headlines = weather.news.slice(0, 5).map((item) => `${item.title} (${item.source})`).join("; ");
  return `${weather.city}${weather.region ? `, ${weather.region}` : ""}: ${current.temperature_2m}°C, feels like ${current.apparent_temperature}°C, humidity ${current.relative_humidity_2m}%, wind ${current.wind_speed_10m} km/h, precipitation ${current.precipitation} mm, weather code ${current.weather_code}. Hourly forecast: ${hours || "unavailable"}. Daily forecast: ${days || "unavailable"}. Recent area news: ${headlines || "no headlines available"}. Data fetched ${weather.fetchedAt}.`;
}
