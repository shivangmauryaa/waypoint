import React, { useEffect, useState } from "react";
import {
  ArrowRight, BedDouble, BriefcaseBusiness, BusFront, CalendarDays, Camera,
  ChevronLeft, ChevronRight, CircleAlert, Cloud, CloudDrizzle, CloudRain,
  CloudSun, Compass, Droplets, Eye, Leaf, MapPin, MoreVertical, Plane,
  Send, ShieldCheck, Sparkles, Sun, TriangleAlert, Umbrella, Users, Wallet,
  Wind, RefreshCw, Maximize2, Pencil, Luggage,
} from "lucide-react";
import { api } from "./api";
import { destinationPhoto } from "./BuilderVisuals";
import "./trip-weather.css";

const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0);
const date = (value) => value ? new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
const time = (value) => new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const condition = (code) => code == null ? "Forecast unavailable" : code === 0 ? "Clear sky" : code <= 3 ? "Partly cloudy" : code <= 48 ? "Foggy" : code <= 67 ? "Light rain" : code <= 77 ? "Snow" : code <= 82 ? "Rain showers" : "Thunderstorms";
const WeatherGlyph = ({ code, size = 64 }) => {
  const Icon = code == null ? Cloud : code === 0 ? Sun : code <= 3 ? CloudSun : code <= 48 ? Cloud : code <= 67 ? CloudDrizzle : CloudRain;
  return <Icon size={size} strokeWidth={1.6} />;
};
export function TripWeather({ tripId, data, onNavigate }) {
  const trip = data?.trip || {};
  const city = (trip.destination || "Jaipur").split(",")[0].trim();
  const bookings = trip.bookings || [];
  const origin = (trip.name || "").split(/\s*(?:→|->| to )\s*/i)[0] || "Your trip";
  const tripTitle = trip.name || `${origin} → ${city}`;
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [overlay, setOverlay] = useState("rain");
  const [mapReady, setMapReady] = useState(false);
  const [hourOffset, setHourOffset] = useState(0);
  const [prompt, setPrompt] = useState("");
  const [chat, setChat] = useState([]);
  const [sending, setSending] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const loadWeather = async () => {
    setLoading(true); setError("");
    try {
      const next = await api(`trips/${tripId}/weather`);
      setWeather(next);
      if (!next.current) setError(next.warnings?.[0] || "Live forecast is unavailable.");
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    loadWeather();
    const timer = setInterval(loadWeather, 300000);
    return () => clearInterval(timer);
  }, [tripId]);

  const current = weather?.current;
  const allHours = weather?.hourly || [];
  // Open-Meteo returns local clock strings when timezone=auto. Compare in the city's timezone.
  const cityClock = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Kolkata" }).replace(" ", "T");
  const futureHours = allHours.filter((hour) => hour.time >= cityClock.slice(0, 13));
  const hours = futureHours.slice(hourOffset, hourOffset + 6);
  const rainTodayRisk = futureHours.slice(0, 24).some((hour) => Number(hour.precipitation_probability) >= 60);
  const tripForecast = (weather?.daily || []).filter((day) => day.time >= trip.start && day.time <= trip.end);
  const rainRisk = tripForecast.length
    ? tripForecast.some((day) => Number(day.precipitation_probability_max) >= 60)
    : trip.start <= cityClock.slice(0, 10) && rainTodayRisk;
  const outdoors = bookings.filter((item) => /activity|event/i.test(item.type));
  const transfers = bookings.filter((item) => /flight|train|transfer/i.test(item.type));
  const relevantRain = rainRisk && (outdoors.length > 0 || transfers.length > 0);
  const nextBookings = [...bookings].filter((item) => new Date(item.end || item.start).getTime() >= Date.now()).sort((a, b) => new Date(a.start) - new Date(b.start)).slice(0, 3);
  const temp = current?.temperature_2m == null ? "—" : Math.round(current.temperature_2m);
  const code = current?.weather_code;
  const mapSrc = weather?.coordinates && `https://embed.windy.com/embed2.html?lat=${weather.coordinates.latitude}&lon=${weather.coordinates.longitude}&detailLat=${weather.coordinates.latitude}&detailLon=${weather.coordinates.longitude}&width=100%25&height=100%25&zoom=9&level=surface&overlay=${overlay}&product=ecmwf&menu=&message=false&marker=true&calendar=now&pressure=false&type=map&location=coordinates&detail=false&metricRain=mm&metricTemp=%C2%B0C`;
  const ask = async (value = prompt) => {
    const message = String(value || "").trim();
    if (!message || sending) return;
    setPrompt(""); setChat((items) => [...items, { by: "you", text: message }]); setSending(true);
    try {
      const result = await api(`trips/${tripId}/assistant`, { message });
      setChat((items) => [...items, { by: "assistant", text: result.answer }]);
    } catch (err) { setChat((items) => [...items, { by: "assistant", text: err.message }]); }
    finally { setSending(false); }
  };
  const tripValue = data?.insights?.value || 0;
  const heroPhoto = origin.toLowerCase() === "udaipur" ? "/images/weather/udaipur-sunset.png" : destinationPhoto(origin);
  const cityPhoto = city.toLowerCase() === "bengaluru" || city.toLowerCase() === "bangalore" ? "/images/weather/bengaluru-rain.png" : destinationPhoto(city);

  return <div className="wx-page">
    <header className="wx-hero" style={{ backgroundImage: `linear-gradient(90deg,rgba(11,39,70,.88),rgba(12,36,67,.37) 53%,rgba(8,28,56,.1)),url('${heroPhoto}')` }}>
      <div className="wx-hero-top"><div className="wx-crumb"><a href="/trips">Trips</a><ChevronRight/><span>{tripTitle}</span><ChevronRight/><span>Weather</span></div><div className="wx-hero-actions"><span className="wx-monitor"><ShieldCheck/> Monitoring</span><button aria-label="More trip options" onClick={() => setMenuOpen(!menuOpen)}><MoreVertical/></button>{menuOpen && <div className="wx-menu"><button onClick={() => { setMenuOpen(false); loadWeather(); }}>Refresh weather</button><button onClick={() => { setMenuOpen(false); onNavigate?.("overview"); }}>Open trip</button></div>}</div></div>
      <h1>{tripTitle} <button aria-label="Edit trip" onClick={() => onNavigate?.("settings")}><Pencil/></button></h1>
      <div className="wx-hero-meta"><CalendarDays/> {date(trip.start)} – {date(trip.end)} <i/><MapPin/> {trip.destination}</div>
      <div className="wx-hero-weather"><WeatherGlyph code={code} size={44}/><span><small>{city}</small><b>{temp}°C</b><small>{condition(code)}</small></span></div>
      <div className="wx-summary">
        <span><i className="blue"><BriefcaseBusiness/></i><b>{bookings.length}</b><small>Bookings</small></span>
        <span><i className="mint"><Users/></i><b>{trip.travelers || 1}</b><small>Traveler{trip.travelers === 1 ? "" : "s"}</small></span>
        <span><i className="violet"><Wallet/></i><b>{money(tripValue)}</b><small>Total value</small></span>
        <span><i className="orange"><TriangleAlert/></i><b>{data?.disruptions?.length || data?.warnings?.length || 0}</b><small>Needs attention</small></span>
      </div>
    </header>
    <div className="wx-columns"><main className="wx-main">
      <section className="wx-current" style={{ backgroundImage: `linear-gradient(90deg,rgba(7,36,65,.83),rgba(7,36,65,.22)),url('${cityPhoto}')` }}>
        <div className="wx-live"><b>{weather?.city || city}{weather?.region ? `, ${weather.region}` : ", India"}</b><span>● Live</span><small>{current ? `Updated ${Math.max(0, Math.floor((Date.now() - Date.parse(weather.fetchedAt)) / 60000))} min ago` : loading ? "Loading conditions…" : "Forecast unavailable"}</small></div>
        <button className="wx-rain-banner" onClick={() => ask(`How will the latest weather affect my ${city} itinerary?`)}><Droplets/>{rainTodayRisk ? "Rain possible in the next 24 hours" : rainRisk ? "Rain possible during your trip" : "Review the latest forecast"}<ChevronRight/></button>
        <div className="wx-temp"><WeatherGlyph code={code} size={94}/><span><strong>{temp}°C</strong><b>{condition(code)}</b><small>Feels like {current?.apparent_temperature == null ? "—" : Math.round(current.apparent_temperature)}°C <i/> H: {weather?.daily?.[0]?.temperature_2m_max ?? "—"}° &nbsp; L: {weather?.daily?.[0]?.temperature_2m_min ?? "—"}°</small></span></div>
        <div className="wx-metrics">
          <span><i><Droplets/></i><b>{current?.relative_humidity_2m ?? "—"}%</b><small>Humidity</small></span>
          <span><i><Wind/></i><b>{current?.wind_speed_10m ?? "—"} km/h</b><small>Wind</small></span>
          <span><i><Leaf/></i><b>{current?.uv_index == null ? "—" : Number(current.uv_index) <= 2 ? "Good" : Number(current.uv_index) <= 5 ? "Moderate" : "High"} ({current?.uv_index ?? "—"})</b><small>UV exposure</small></span>
          <span><i><Sun/></i><b>{weather?.daily?.[0]?.uv_index_max ?? "—"} max</b><small>UV index</small></span>
          <span><i><Eye/></i><b>{current?.visibility == null ? "—" : `${(current.visibility / 1000).toFixed(0)} km`}</b><small>Visibility</small></span>
        </div>
      </section>
      {error && <div className="wx-error" role="status">{error} <button onClick={loadWeather}>Retry</button></div>}
      <div className="wx-forecast-row"><section className="wx-hourly"><div className="wx-hours"><button aria-label="Earlier hours" disabled={!hourOffset} onClick={() => setHourOffset(Math.max(0, hourOffset - 1))}><ChevronLeft/></button><div className="wx-hour-list">{hours.length ? hours.map((hour, index) => <article key={hour.time} className={hourOffset === 0 && index === 0 ? "selected" : ""}><small>{hourOffset === 0 && index === 0 ? "Now" : new Date(`${hour.time}:00`).toLocaleTimeString("en-US", { hour: "numeric" })}</small><WeatherGlyph code={hour.weather_code} size={30}/><b>{Math.round(hour.temperature_2m)}°</b><em><Droplets/>{hour.precipitation_probability ?? 0}%</em></article>) : <p>{loading ? "Loading hourly forecast…" : "Hourly forecast unavailable."}</p>}</div><button aria-label="Later hours" disabled={hourOffset + 6 >= futureHours.length} onClick={() => setHourOffset(hourOffset + 1)}><ChevronRight/></button></div></section>
      <section className="wx-map"><div className="wx-map-frame"><div className="wx-map-preview"><b>{city}</b><small>Map preview</small></div>{mapSrc && <iframe key={overlay} title={`${city} ${overlay} weather map`} src={mapSrc} loading="lazy" style={{ opacity: mapReady ? 1 : 0 }} onLoad={() => setMapReady(true)}/>}<div className="wx-map-switch">{[["rain", "Radar"], ["temp", "Map"], ["clouds", "Satellite"]].map(([key, label]) => <button key={key} className={overlay === key ? "active" : ""} onClick={() => { setMapReady(false); setOverlay(key); }}>{label}</button>)}</div><a className="wx-map-full" href={weather?.coordinates ? `https://www.windy.com/?${weather.coordinates.latitude},${weather.coordinates.longitude},9` : `https://www.windy.com/search/${encodeURIComponent(city)}`} target="_blank" rel="noreferrer" aria-label="Open full weather map"><Maximize2/></a></div></section></div>
      <section className="wx-impact"><h2>Weather impact on your trip</h2><div>
        <article><i className="mint"><Plane/></i><span><b>Flights</b><em className={rainRisk ? "warn" : "good"}>{rainRisk ? "Check conditions" : "No weather alert"}</em><small>{transfers.length ? `${transfers.length} transport item${transfers.length === 1 ? "" : "s"} planned` : "No transport booked"}</small></span></article>
        <article><i className="orange"><BusFront/></i><span><b>Transport</b><em className={rainRisk ? "warn" : "good"}>{rainRisk ? "Allow extra time" : "On track"}</em><small>Check local traffic near departure</small></span></article>
        <article><i className="mint"><BedDouble/></i><span><b>Hotels</b><em className="good">No direct impact</em><small>Normal check-in planned</small></span></article>
        <article><i className="red"><Camera/></i><span><b>Outdoor activities</b><em className={relevantRain && outdoors.length ? "warn" : "good"}>{relevantRain && outdoors.length ? "Review weather" : "No current impact"}</em><small>{outdoors.length ? `${outdoors.length} activities on itinerary` : "No activities booked"}</small></span></article>
      </div></section>
      <section className="wx-ask"><div className="wx-ask-head"><Sparkles/><div><h2>Ask Waypoint <span>● Live data</span></h2><p>Get real-time weather updates, travel impact, and planning suggestions.</p></div></div><div className="wx-prompts">{[`Will it rain during my flight?`, "Is metro running today?", "Suggest indoor activities", "Check airport weather", "Best time to travel tomorrow"].map((question) => <button key={question} onClick={() => ask(question)}>{question}</button>)}</div>{chat.length > 0 && <div className="wx-chat" aria-live="polite">{chat.slice(-4).map((item, index) => <p className={item.by} key={index}><b>{item.by === "you" ? "You" : "Waypoint"}</b>{item.text}</p>)}</div>}<form onSubmit={(event) => { event.preventDefault(); ask(); }}><input value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Ask anything about weather, travel impact, or your trip..." aria-label="Ask Waypoint"/><button disabled={sending || !prompt.trim()} aria-label="Send message"><Send/></button></form></section>
      {weather?.news?.length > 0 && <section className="wx-news"><h2>Recent area updates</h2>{weather.news.slice(0, 3).map((item) => <a href={item.url} target="_blank" rel="noreferrer" key={item.url}>{item.title} <ArrowRight/></a>)}</section>}
    </main><aside className="wx-side">
      <section className="wx-side-card wx-trip-card"><div className="wx-card-heading"><h2>Current Trip</h2><button onClick={() => onNavigate?.("settings")}><Pencil/> Edit trip</button></div><div className="wx-trip-line"><img src={heroPhoto} alt=""/><span><b>{tripTitle}</b><small>{date(trip.start)} – {date(trip.end)}</small></span></div><div className="wx-trip-counts"><span><Users/><b>{trip.travelers || 1}</b><small>Traveler</small></span><span><BriefcaseBusiness/><b>{bookings.length}</b><small>Bookings</small></span><span><Wallet/><b>{money(tripValue)}</b><small>Total value</small></span></div></section>
      <section className={`wx-side-card wx-alert-card ${relevantRain ? "risk" : "calm"}`}><div className="wx-card-heading"><h2><TriangleAlert/> Active Impact</h2><span>{relevantRain ? "1 issue" : "Monitoring"}</span></div><div className="wx-alert-inner"><CloudRain/><span><b>{rainTodayRisk ? "Rain possible in the next 24 hours" : rainRisk ? "Rain possible during your trip" : "No active weather alert"}</b><small>{rainRisk ? "Review outdoor plans and allow extra travel time." : "Weather is being monitored for your trip."}</small></span></div><button className="wx-recovery" onClick={() => onNavigate?.("recovery")}>View recovery options <ArrowRight/></button></section>
      <section className="wx-side-card wx-next"><div className="wx-card-heading"><h2>Next 3 items</h2><button onClick={() => onNavigate?.("overview")}>View full itinerary <ArrowRight/></button></div>{nextBookings.length ? nextBookings.map((item) => { const Icon = item.type === "flight" ? Plane : item.type === "hotel" ? BedDouble : /transfer|train/i.test(item.type) ? BusFront : Camera; return <article key={item.id}><i><Icon/></i><span><small>{time(item.start)}</small><b>{item.title}</b><small>{item.provider}</small></span><em className={rainRisk && /transfer|activity|event/i.test(item.type) ? "watch" : "ok"}>{rainRisk && /transfer|activity|event/i.test(item.type) ? "Check weather" : "On time"}</em></article>; }) : <p className="wx-empty">No upcoming itinerary items.</p>}</section>
      <section className="wx-side-card wx-suggestions"><div className="wx-suggest-title"><Sparkles/><span><h2>AI Suggestions</h2><small>Based on current weather and real-world signals</small></span></div><div><button onClick={() => ask(`Suggest indoor activities in ${city} for my trip.`)}><i><Umbrella/></i><span><b>Consider indoor activities</b><small>Explore museums, malls or indoor attractions if rain is forecast.</small></span></button><button onClick={() => ask(`How much travel buffer should I leave for my trip in ${city}?`)}><i><BusFront/></i><span><b>Keep buffer time</b><small>Allow extra time for road or airport transfers in wet weather.</small></span></button></div></section>
    </aside></div>
  </div>;
}
