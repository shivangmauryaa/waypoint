const cache = new Map();
const ttl = 5 * 60 * 1000;
const cityLocations = {
  Mumbai: [19.076, 72.8777, "Maharashtra"], Jaipur: [26.9124, 75.7873, "Rajasthan"], Delhi: [28.6139, 77.209, "Delhi"],
  Udaipur: [24.5854, 73.7125, "Rajasthan"], Goa: [15.4909, 73.8278, "Goa"], Bengaluru: [12.9716, 77.5946, "Karnataka"],
  Bangalore: [12.9716, 77.5946, "Karnataka"], Agra: [27.1767, 78.0081, "Uttar Pradesh"], Varanasi: [25.3176, 82.9739, "Uttar Pradesh"],
  Manali: [32.2432, 77.1892, "Himachal Pradesh"], Hyderabad: [17.385, 78.4867, "Telangana"], Chennai: [13.0827, 80.2707, "Tamil Nadu"],
  Kolkata: [22.5726, 88.3639, "West Bengal"], Ahmedabad: [23.0225, 72.5714, "Gujarat"],
};
const cleanCity = (value = "") => String(value).split(",")[0].trim();
const json = async (url) => {
  const response = await fetch(url, { signal: AbortSignal.timeout(4500), headers: { "User-Agent": "WaypointTravel/1.0 (trip weather workspace)" } });
  if (!response.ok) throw new Error(`Weather provider returned ${response.status}`);
  return response.json();
};

export async function getTripWeather(destination) {
  const city = cleanCity(destination) || "Jaipur";
  const cached = cache.get(city.toLowerCase());
  if (cached && Date.now() - cached.at < ttl) return cached.data;
  const result = { city, fetchedAt: new Date().toISOString(), source: "Open-Meteo", current: null, hourly: [], daily: [], news: [], coordinates: null, warnings: [] };
  try {
    const known = cityLocations[city];
    const location = known ? { name: city, latitude: known[0], longitude: known[1], admin1: known[2], country: "India" } : (await json(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`)).results?.[0];
    if (!location) throw new Error(`Could not locate ${city}`);
    result.city = location.name;
    result.region = location.admin1;
    result.country = location.country;
    result.coordinates = { latitude: location.latitude, longitude: location.longitude };
    const params = new URLSearchParams({
      latitude: String(location.latitude), longitude: String(location.longitude), timezone: "auto", forecast_days: "7",
      current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,visibility,uv_index",
      hourly: "temperature_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m,uv_index",
      daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max",
    });
    const newsPromise = (async () => {
      const query = encodeURIComponent(`("${city}" OR "${result.region || city}") (weather OR rain OR travel OR transport OR tourism)`);
      const news = await json(`https://api.gdeltproject.org/api/v2/doc/doc?query=${query}&mode=ArtList&format=json&sort=DateDesc&maxrecords=6`);
      result.news = (news.articles || []).slice(0, 6).map((article) => ({ title: article.title, url: article.url, source: article.domain || article.source, publishedAt: String(article.seendate || "").replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/, "$1-$2-$3T$4:$5:$6Z"), language: article.language }));
    })();
    const forecastPromise = json(`https://api.open-meteo.com/v1/forecast?${params}`);
    const [forecastResult, newsResult] = await Promise.allSettled([forecastPromise, newsPromise]);
    const forecast = forecastResult.status === "fulfilled" ? forecastResult.value : null;
    if (forecastResult.status === "rejected") result.warnings.push(`Live forecast unavailable: ${forecastResult.reason.message}`);
    if (newsResult.status === "rejected") result.warnings.push(`Area news unavailable: ${newsResult.reason.message}`);
    if (!forecast) throw new Error("Weather forecast is temporarily unavailable");
    result.current = { ...forecast.current, timezone: forecast.timezone, units: forecast.current_units };
    result.hourly = forecast.hourly ? Object.keys(forecast.hourly.time).map((key) => Object.fromEntries(Object.entries(forecast.hourly).map(([name, values]) => [name, values[key]]))) : [];
    result.daily = forecast.daily ? Object.keys(forecast.daily.time).map((key) => Object.fromEntries(Object.entries(forecast.daily).map(([name, values]) => [name, values[key]]))) : [];
    result.hourlyUnits = forecast.hourly_units;
    result.dailyUnits = forecast.daily_units;
  } catch (error) {
    if (!result.warnings.some((warning) => warning.startsWith("Live forecast unavailable:"))) result.warnings.push(`Live forecast unavailable: ${error.message}`);
  }
  cache.set(city.toLowerCase(), { at: Date.now(), data: result });
  return result;
}

export function weatherSummary(weather) {
  if (!weather?.current) return `${weather?.city || "Destination"}: live weather is temporarily unavailable.`;
  const current = weather.current;
  const hours = weather.hourly.slice(0, 12).map((h) => `${h.time}: ${h.temperature_2m}°C, ${h.precipitation_probability}% rain chance`).join("; ");
  const days = weather.daily.slice(0, 5).map((d) => `${d.time}: ${d.temperature_2m_min}–${d.temperature_2m_max}°C, ${d.precipitation_probability_max}% precipitation chance`).join("; ");
  const headlines = weather.news.slice(0, 5).map((n) => `${n.title} (${n.source})`).join("; ");
  return `${weather.city}${weather.region ? `, ${weather.region}` : ""}: ${current.temperature_2m}°C, feels like ${current.apparent_temperature}°C, humidity ${current.relative_humidity_2m}%, wind ${current.wind_speed_10m} km/h, precipitation ${current.precipitation} mm, weather code ${current.weather_code}. Hourly forecast: ${hours || "unavailable"}. Daily forecast: ${days || "unavailable"}. Recent area news: ${headlines || "no headlines available"}. Data fetched ${weather.fetchedAt}.`;
}
