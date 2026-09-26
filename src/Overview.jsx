import React, { useEffect, useState } from "react";
import { ArrowRight, ArrowUpRight, Plane, Bot, Luggage, Wallet, TriangleAlert, GitBranch, ShieldCheck, CircleCheck, Heart, MapPin, Compass, LoaderCircle, Bookmark, Building2, CarFront, Hotel, Camera, Check, CircleMinus, CalendarDays } from "lucide-react";
import { api } from "./api";
import { destinations, TripPhoto } from "./BuilderVisuals";
import "./overview.css";

const money = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);
const colors = ["#8069e8", "#3889ed", "#ea7656", "#42b09d", "#e6b34d", "#9babc0"];
const destinationIdeas = {
  Jaipur: ["Palaces & bazaars", "₹2,500 / day"], Goa: ["Beaches & cafés", "₹3,000 / day"],
  Delhi: ["Food & heritage", "₹2,200 / day"], Manali: ["Mountain escapes", "₹3,200 / day"],
  Udaipur: ["Lakeside weekends", "₹2,800 / day"], Mumbai: ["City & coast", "₹3,500 / day"],
};
const riskLabels = { low: "On track", medium: "Tight connection", high: "Connection at risk", critical: "Disruption active" };
const tripLink = (city) => `/build?destination=${encodeURIComponent(city)}`;

function Ring({ segments, center, caption, score = false }) {
  const total = segments.reduce((sum, item) => sum + item.value, 0);
  let offset = 0;
  const stops = segments.map((item) => { const start = offset; offset += total ? item.value / total * 100 : 0; return `${item.color} ${start}% ${offset}%`; });
  return <div className={`dash-ring ${score ? "readiness-ring" : ""}`} style={{ background: total ? `conic-gradient(${stops.join(",")})` : "#edf1f7" }} role="img" aria-label={`${caption}: ${center}`}><div><strong>{center}</strong><small>{caption}</small></div></div>;
}
function Head({ title, subtitle, href, link = "View all" }) {
  return <header className="dash-card-head"><div><h2>{title}</h2><p>{subtitle}</p></div>{href && <a href={href}>{link} <ArrowRight size={12} /></a>}</header>;
}

export function Overview({ user }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const savedKey = `waypoint-saved-destinations:${user.id || user.name}`;
  const [saved, setSaved] = useState(() => { try { const value = JSON.parse(localStorage.getItem(savedKey) || "[]"); return Array.isArray(value) ? value.filter((name) => destinations.some((d) => d.name === name)) : []; } catch { return []; } });
  const [saveError, setSaveError] = useState("");
  const load = () => { setError(""); api("overview").then(setData).catch((e) => setError(e.message)); };
  useEffect(() => { load(); }, []);
  const toggleSaved = (name) => {
    const next = saved.includes(name) ? saved.filter((x) => x !== name) : [...saved, name];
    try { localStorage.setItem(savedKey, JSON.stringify(next)); setSaved(next); setSaveError(""); } catch { setSaveError("Your browser could not save this place. Please allow local storage and try again."); }
  };
  if (!data) return <div className="loading"><Compass size={35} /><h2>Gathering your travel picture…</h2>{error ? <><p className="error" role="alert">{error}</p><button className="button" onClick={load}>Try again</button></> : <LoaderCircle className="spin" />}</div>;
  const departures = data.departures || [];
  const upcoming = departures.find((trip) => trip.daysUntil >= 0) || departures[0];
  const readinessChecks = [[Plane,"Flight confirmed",Boolean(upcoming?.hasFlight)],[Hotel,"Hotel confirmed",Boolean(upcoming?.hasHotel)],[CarFront,"Transport arranged",Boolean(upcoming?.hasTransport)],[Camera,"Activities planned",Boolean(upcoming?.plannedActivities)],[Check,"Travel documents",Boolean(upcoming?.documentsReady)],[ShieldCheck,"No active disruptions",data.disruptions===0]];
  const destination = destinations.find((place) => upcoming?.destination?.includes(place.name));
  const risks = data.riskCounts || {};
  const atRisk = (risks.critical || 0) + (risks.high || 0);
  const readiness = data.active ? Math.round((risks.low || 0) / data.active * 100) : 0;
  const segments = Object.entries(data.byType || {}).sort((a, b) => b[1] - a[1]).map(([label, value], i) => ({ label, value, color: colors[i % colors.length], share: data.value ? Math.round(value / data.value * 100) : 0 }));
  const tripEnd = upcoming?.start ? new Date(new Date(`${upcoming.start}T12:00:00`).getTime() + Math.max(1, upcoming.hotelNights || 2) * 86400000).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }) : "";
  const nights = upcoming ? Math.max(1, upcoming.hotelNights || 2) : 0;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const metrics = [
    [Luggage, "Active trips", data.active, `${data.upcoming || 0} upcoming journeys`, "blue"],
    [Wallet, "Total booked value", money(data.value), `${data.bookings || 0} bookings across your trips`, "purple"],
    [TriangleAlert, "At-risk trips", atRisk, atRisk ? "Review your recovery options" : "All clear", "yellow"],
    [GitBranch, "Connection warnings", data.warnings, data.warnings ? "Needs attention" : "Connections look good", "green"],
  ];
  const updates = data.risks?.length ? data.risks.slice(0, 3).map((risk) => ({ icon: TriangleAlert, tone: "amber", title: risk.title, note: risk.message, href: `/trip/${risk.tripId}/recovery` })) : [
    { icon: Plane, tone: "blue", title: "Flight prices to your next destination look steady", note: "We’ll flag drops as soon as they appear." },
    { icon: Building2, tone: "purple", title: "New stays near your destination", note: "Fresh options are added as searches run." },
    { icon: ShieldCheck, tone: "green", title: "No connection alerts right now", note: "Your connections have comfortable buffers." },
  ];
  return <div className="dash">
    <div className="dash-crumb">Home <span>›</span> Dashboard</div>

    <section className="dash-hero">
      <blockquote className="dash-hero-quote">“Travel isn’t always perfect,<br /><strong>but every journey has a way forward.”</strong><small>— Waypoint</small></blockquote>
      <div className="dash-hero-copy">
        <h1>{greeting}, {user.name.split(" ")[0]}! <span>👋</span></h1>
        <p>Where do you want to go next?</p>
        <div className="dash-hero-cards">
          <a className="dash-hero-card" href="/build" aria-label="Build My Trip"><span className="dash-hero-icon"><Plane size={22} /></span><div><b>Build My Trip</b><span>Plan a new trip with the best flights, hotels, activities and more.</span></div><span className="dash-hero-arrow">→</span></a>
          <a className="dash-hero-card ai" href="/build?mode=auto" aria-label="AI Recovery"><span className="dash-hero-icon"><Bot size={22} /></span><div><b>AI Recovery</b><span>Tell us what happened and let AI rebuild your trip for you.</span></div><span className="dash-hero-arrow">→</span></a>
        </div>
      </div>
    </section>

    <section className="dash-metrics" aria-label="Travel summary">{metrics.map(([Icon, label, value, note, color]) => <div className="dash-metric" key={label}><span className={`dash-metric-icon ${color}`}><Icon size={20} /></span><div><small>{label}</small><strong>{value}</strong><span className={label === "Connection warnings" && data.warnings ? "attention" : ""}>{note}</span></div></div>)}</section>

    <div className="dash-grid-3">
      <section className="dash-card">
        <Head title="Your Upcoming Trip" subtitle="Your next journey and its current status" href="/trips" link="View All →" />
        {upcoming ? <><a className="dash-trip-cover" href={`/trip/${upcoming.id}/overview`}><TripPhoto src={destination?.image || "/images/dashboard/landscape.jpg"} alt={upcoming.destination} /><span className={`dash-trip-status ${upcoming.riskLevel}`}><ShieldCheck size={12} />{riskLabels[upcoming.riskLevel] || "Review trip"}</span><div><h3>{upcoming.name}</h3><p><CalendarDays size={12}/>{upcoming.start} <span>–</span> {new Date(new Date(`${upcoming.start}T12:00:00`).getTime()+Math.max(1,upcoming.hotelNights||2)*86400000).toLocaleDateString("en-GB",{day:"numeric",month:"short",timeZone:"UTC"})}<span>·</span><Luggage size={12}/>{upcoming.travelers} {upcoming.travelers===1?"Traveler":"Travelers"}</p></div><span className="dash-trip-open"><ArrowUpRight size={17}/></span></a><div className="dash-trip-meta"><span><Plane size={16}/><span><small>Flight</small><b>{upcoming.hasFlight?(upcoming.departureTime||"Confirmed"):"Not selected"}</b></span></span><span><Hotel size={16}/><span><small>Hotel</small><b>{upcoming.hasHotel?`${upcoming.hotelNights} nights`:"Not selected"}</b></span></span><span><CarFront size={16}/><span><small>Transport</small><b>{upcoming.hasTransport?"Arranged":"Not selected"}</b></span></span><span><Camera size={16}/><span><small>Activities</small><b>{upcoming.plannedActivities?`${upcoming.plannedActivities} planned`:"Explore options"}</b></span></span></div></> : <div className="dash-empty-trip"><Plane size={26} /><h3>Your next chapter is unwritten.</h3><p>No trips to chart yet. Let’s plan something worth looking forward to.</p><a href="/build">Build your first trip <ArrowRight size={14} /></a></div>}
      </section>

      <section className="dash-card">
        <Head title="Where the money is" subtitle="Booked value across your active trips" />
        <div className="dash-money"><Ring segments={segments} center={money(data.value)} caption="Total booked" /><div className="dash-legend">{segments.length ? segments.map((s) => <div key={s.label}><span style={{ background: s.color }} /><label>{s.label}</label><b>{money(s.value)}</b><small>{s.share}%</small></div>) : <p>Add bookings to see your spending breakdown.</p>}</div></div>
        <div className="dash-refund-summary"><span><ShieldCheck size={14} /> Refundable bookings</span><strong>{money(data.refundable)}</strong><div className="dash-refund-bar"><span style={{ width: `${data.value ? Math.min(100, Math.round(data.refundable / data.value * 100)) : 0}%` }} /></div></div>
      </section>

      <section className="dash-card">
        <Head title="Trip readiness" subtitle="Active trips with no flagged risks" />
        <div className="dash-readiness"><Ring score segments={[{ value: readiness, color: "#25b77f" }, { value: 100 - readiness, color: "#ecf0f3" }]} center={`${readiness}%`} caption={data.active ? "ON TRACK" : "NO TRIPS YET"} /><div className="dash-checks">{readinessChecks.map(([Icon, label, ready]) => <div key={label} className={ready ? "healthy" : "pending"}><Icon size={14} /><span>{label}</span><span className={`dash-readiness-check ${ready ? "" : "pending"}`}>{ready ? <CircleCheck size={13} /> : <CircleMinus size={13} />}</span></div>)}</div></div>
        <div className="dash-readiness-note"><ShieldCheck size={13} /> Based on your saved trips and connection checks.</div>
      </section>
    </div>

    {upcoming && <section className="dash-journey-card"><div className="dash-journey-heading"><span><MapPin size={15}/></span><div><b>Your journey at a glance</b><small>{upcoming.destination} · {upcoming.daysUntil >= 0 ? `Trip starts in ${upcoming.daysUntil} days` : "Trip in progress"}</small></div><a href={`/trip/${upcoming.id}/overview`}>Open itinerary <ArrowRight size={12}/></a></div><div className="dash-journey-steps"><div className="complete"><span><Plane size={15}/></span><b>Travel out</b><small>{upcoming.hasFlight ? `Departure ${upcoming.departureTime || "confirmed"}` : "Add your flight details"}</small></div><i/><div className={upcoming.hasHotel ? "complete" : "suggested"}><span><Hotel size={15}/></span><b>Check in</b><small>{upcoming.hasHotel ? `${nights} night stay` : "Choose a place to stay"}</small></div><i/><div className={upcoming.plannedActivities ? "complete" : "suggested"}><span><Camera size={15}/></span><b>Explore</b><small>{upcoming.plannedActivities ? `${upcoming.plannedActivities} activities planned` : "Add a local experience"}</small></div><i/><div className={upcoming.hasTransport ? "complete" : "suggested"}><span><CarFront size={15}/></span><b>Head home</b><small>{upcoming.hasTransport ? "Transport arranged" : `Return · ${tripEnd}`}</small></div></div></section>}

    <div className="dash-grid-3">
      <section className="dash-card">
        <Head title="Live Travel Updates" subtitle="Things that may affect your plans" href="/notifications" link="See all →" />
        {updates.map((item, i) => { const Icon = item.icon; const inner = <><span className={`dash-feed-icon ${item.tone}`}><Icon size={16} /></span><div><b>{item.title}</b><span>{item.note}</span></div></>; return item.href ? <a className="dash-feed-row" key={i} href={item.href}>{inner}</a> : <div className="dash-feed-row" key={i}>{inner}</div>; })}
      </section>

      <section className="dash-card" id="explore">
        <Head title="Popular Destinations" subtitle="Explore places for your next trip" href="/build" link="Explore all →" />
        <div className="dash-dest-grid">{destinations.slice(0, 5).map((place) => <div className="dash-dest" key={place.name}><a href={tripLink(place.name)}><TripPhoto src={place.image} alt={place.name} /><small>Explore</small><b>{place.name}</b></a><button type="button" aria-label={`${saved.includes(place.name) ? "Unsave" : "Save"} ${place.name}`} aria-pressed={saved.includes(place.name)} onClick={() => toggleSaved(place.name)}><Heart size={13} fill={saved.includes(place.name) ? "currentColor" : "none"} /></button></div>)}</div>
        <p className="dash-explore-note"><Compass size={13} /> A change of scenery is always a good idea.</p>
      </section>

      <section className="dash-card" id="saved">
        <Head title="Saved for Later" subtitle="Your saved destinations" />
        {saveError && <p role="alert" className="dash-storage-error">{saveError}</p>}
        {saved.length ? saved.map((name) => { const place = destinations.find((d) => d.name === name); return <div className="dash-saved-row" key={name}><a href={tripLink(name)}><TripPhoto src={place.image} alt="" /><div><b>{name}</b><small>Plan your getaway</small></div></a><button type="button" aria-label={`Remove ${name} from saved`} onClick={() => toggleSaved(name)}><Heart size={15} fill="currentColor" /></button></div>; }) : <div className="dash-saved-empty"><Bookmark size={22} /><strong>Ideas for your next getaway</strong><p>Rough daily spend estimates, excluding travel.</p>{destinations.slice(0, 3).map((place, i) => <a className={`dash-idea-row idea-${i}`} key={place.name} href={tripLink(place.name)}><TripPhoto src={place.image} alt=""/><span><b>{place.name}</b><small>{destinationIdeas[place.name]?.[0] || "Local favourites"}</small></span><strong>{destinationIdeas[place.name]?.[1] || "Explore"}</strong><ArrowRight size={13}/></a>)}</div>}
      </section>
    </div>

  </div>;
}
export default Overview;
