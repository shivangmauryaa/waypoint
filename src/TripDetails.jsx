import React from "react";
import {
  ArrowRight,
  BarChart3,
  BedDouble,
  CalendarDays,
  Camera,
  CarFront,
  CheckCircle2,
  Clock3,
  Download,
  History,
  MapPin,
  Plane,
  ReceiptText,
  RotateCcw,
  Route,
  ShieldCheck,
  TriangleAlert,
  Utensils,
  Wallet,
  X,
} from "lucide-react";
import { destinationPhoto } from "./BuilderVisuals";

const money = (amount = 0) => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 0,
}).format(Number(amount) || 0);
const icons = { flight: Plane, train: Route, transfer: CarFront, hotel: BedDouble, activity: Camera, event: Utensils };
const date = (value) => new Date(value).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" });
const time = (value) => new Date(value).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit" });
const longDate = (value) => new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export function TripInsights({ tripId, data, info }) {
  const trip = data.trip;
  const warnings = data.warnings || [];
  const bookings = trip.bookings || [];
  const score = Math.max(0, 100 - Number(data.risks?.overall || 0));
  const length = Math.max(1, Math.ceil((Date.parse(trip.end) - Date.parse(trip.start)) / 86400000));
  const totalByType = Object.entries(info.byType || {}).sort((a, b) => b[1] - a[1]);
  const next = info.next;
  const NextIcon = next ? icons[next.type] || Route : Clock3;
  return (
    <div className="trip-insights">
      <section className="ti-hero">
        <div className="ti-hero-photo" style={{ backgroundImage: `linear-gradient(90deg,#102644e8 0%,#102644a8 56%,#10264424),url('${destinationPhoto((trip.destination || "Jaipur").split(",")[0].trim())}')` }} />
        <div className="ti-hero-content">
          <span className="ti-eyebrow"><BarChart3 size={13}/> TRIP SNAPSHOT</span>
          <h2>{trip.name}</h2>
          <p><MapPin size={14}/>{trip.destination}<i /><CalendarDays size={14}/>{longDate(trip.start)} – {longDate(trip.end)}</p>
        </div>
        <a href={`/trip/${tripId}/overview`}>View itinerary <ArrowRight size={15}/></a>
      </section>
      <section className="ti-metrics" aria-label="Trip highlights">
        <article className="ti-metric"><span className="ti-icon blue"><Wallet/></span><div><small>Trip value</small><b>{money(info.value)}</b><em>{money(info.perTraveler)} per traveler</em></div></article>
        <article className="ti-metric"><span className="ti-icon green"><ShieldCheck/></span><div><small>Refundable now</small><b>{money(info.refundable)}</b><em>{money(info.refundExposure)} beyond deadlines</em></div></article>
        <article className="ti-metric"><span className="ti-icon violet"><ReceiptText/></span><div><small>Bookings ahead</small><b>{info.upcoming}</b><em>of {info.bookings} saved bookings</em></div></article>
        <article className="ti-metric"><span className={`ti-icon ${warnings.length ? "amber" : "green"}`}><TriangleAlert/></span><div><small>Connection checks</small><b>{warnings.length ? `${warnings.length} to review` : "All clear"}</b><em>{info.travelers} traveler{info.travelers === 1 ? "" : "s"} on this trip</em></div></article>
      </section>
      <div className="ti-grid">
        <section className="ti-card ti-spend">
          <header><div><span className="ti-eyebrow">COST BREAKDOWN</span><h3>Where your trip budget goes</h3><p>Booking totals for the whole travel party.</p></div><span className="ti-card-icon"><Wallet size={17}/></span></header>
          {totalByType.map(([type, amount]) => { const Icon = icons[type] || Route; const share = Math.round((amount / (info.value || 1)) * 100); return <div className="ti-spend-row" key={type}><span className={`ti-type-icon ti-${type}`}><Icon size={16}/></span><div className="ti-spend-detail"><span><b>{type[0].toUpperCase()+type.slice(1)}</b><small>{share}% of total</small></span><div className="ti-bar"><i style={{width:`${share}%`}}/></div></div><strong>{money(amount)}</strong></div>; })}
          {!totalByType.length && <div className="ti-empty"><Route size={22}/><b>No bookings to break down yet</b><a href={`/trip/${tripId}/overview`}>Add trip bookings <ArrowRight size={13}/></a></div>}
          <footer><span>Estimated trip total</span><b>{money(info.value)}</b></footer>
        </section>
        <section className="ti-card ti-readiness">
          <header><div><span className="ti-eyebrow">TRAVEL READINESS</span><h3>{warnings.length ? "A few connections need a look" : "Your plan is looking good"}</h3><p>{warnings.length ? "Review these timing notes before you travel." : "No tight connections detected in the saved itinerary."}</p></div><div className={`ti-score ${score < 80 ? "watch" : "ready"}`}><b>{score}</b><small>score</small></div></header>
          <div className="ti-readiness-track"><i style={{width:`${score}%`}}/></div>
          <div className="ti-check-list"><div><CheckCircle2/><span><b>{info.bookings} bookings saved</b><small>Your itinerary items are in one place.</small></span></div><div><Clock3/><span><b>{info.upcoming} upcoming</b><small>{info.daysUntil > 0 ? `Departure in ${info.daysUntil} days` : "Trip dates are underway"}.</small></span></div>{warnings.length ? <div className="attention"><TriangleAlert/><span><b>{warnings.length} timing note{warnings.length === 1 ? "" : "s"}</b><small>{warnings[0].title}</small></span></div> : <div><ShieldCheck/><span><b>Connections checked</b><small>Buffers look comfortable.</small></span></div>}</div>
          {warnings.length > 0 && <a className="ti-card-link" href={`/trip/${tripId}/recovery`}>Review recovery options <ArrowRight size={14}/></a>}
        </section>
        <section className="ti-card ti-next">
          <header><div><span className="ti-eyebrow">UP NEXT</span><h3>Your next itinerary item</h3></div><Clock3 size={18}/></header>
          {next ? <div className="ti-next-item"><span className="ti-next-icon"><NextIcon size={19}/></span><div><b>{next.title}</b><small>{next.provider}</small><small>{date(next.start)} · {time(next.start)} IST</small></div><em>{next.minutesUntil <= 60 ? `${next.minutesUntil} min` : `${Math.round(next.minutesUntil / 60)} hr`}</em></div> : <p className="ti-muted">No upcoming itinerary items. Add a booking to see what comes next.</p>}
          <a className="ti-card-link" href={`/trip/${tripId}/overview`}>Open full itinerary <ArrowRight size={14}/></a>
        </section>
        <section className="ti-card ti-trip-facts">
          <header><div><span className="ti-eyebrow">AT A GLANCE</span><h3>Trip details</h3></div><Route size={18}/></header>
          <div className="ti-fact"><span>Destination</span><b>{trip.destination}</b></div><div className="ti-fact"><span>Travel party</span><b>{info.travelers} traveler{info.travelers === 1 ? "" : "s"}</b></div><div className="ti-fact"><span>Trip length</span><b>{length} days</b></div><div className="ti-fact"><span>Avg. per booking</span><b>{money(info.bookings ? info.value / info.bookings : 0)}</b></div>
        </section>
      </div>
    </div>
  );
}

export function TripActivity({ tripId, data, info, busy, setModal }) {
  const bookings = data.trip.bookings || [];
  const history = data.history || [];
  const net = history.filter((item) => !item.undone).reduce((sum, item) => sum + (item.net || 0), 0);
  return (
    <div className="trip-activity">
      <section className="ta-header"><div><span className="ti-eyebrow"><History size={13}/> TRIP TIMELINE</span><h2>Activity &amp; changes</h2><p>Follow recovery updates and keep track of your current itinerary.</p></div><div className="ta-actions">{history[0] && !history[0].undone && <button className="button" disabled={busy} onClick={() => setModal({type:"undo"})}><RotateCcw size={14}/>Undo latest</button>}<button className="button" onClick={() => setModal({type:"import"})}>Import trip</button><a className="button" href={`/api/trips/${tripId}/export`}><Download size={14}/>Export</a><a className="button" href={`/api/trips/${tripId}/export.csv`}><Download size={14}/>CSV</a></div></section>
      <section className="ta-summary"><div className="ta-summary-mark"><Route size={22}/></div><div className="ta-summary-title"><small>CURRENT ITINERARY</small><b>{data.trip.name}</b><span>{data.trip.destination} · {longDate(data.trip.start)} – {longDate(data.trip.end)}</span></div><div><small>Bookings</small><b>{bookings.length}</b></div><div><small>Trip value</small><b>{money(info.value)}</b></div><a href={`/trip/${tripId}/overview`} aria-label="Open itinerary"><ArrowRight size={17}/></a></section>
      {!history.length ? <section className="ta-empty-state"><div className="ta-empty-icon"><ShieldCheck size={24}/></div><div><span className="ti-eyebrow">NO RECOVERY CHANGES YET</span><h3>{data.cancelled ? "This trip is marked cancelled" : "Your original trip plan is active"}</h3><p>{data.cancelled ? "The itinerary is saved here for reference. Contact support if you need help with follow-up arrangements." : "Recovery actions will show here when you replace or cancel a booking. Your saved bookings and current plans are ready below."}</p></div>{!data.cancelled && <a className="button primary" href={`/trip/${tripId}/recovery`}>Review recovery options <ArrowRight size={14}/></a>}</section> : <section className="ta-timeline-card"><header><div><span className="ti-eyebrow">RECENT UPDATES</span><h3>{history.length} recovery change{history.length === 1 ? "" : "s"}</h3></div><span>{money(net)} net adjustment</span></header><div className="ta-timeline">{history.map((item) => <article className={`ta-event ${item.undone ? "reverted" : ""}`} key={item.id}><span className="ta-event-node">{item.undone ? <RotateCcw size={15}/> : <CheckCircle2 size={16}/>}</span><div className="ta-event-content"><div className="ta-event-title"><div><b>{item.label}</b>{item.undone && <span className="ta-reverted-pill">Reverted</span>}</div><time>{new Date(item.appliedAt).toLocaleString("en-IN", {dateStyle:"medium",timeStyle:"short"})}</time></div><p>{item.changes.length} booking{item.changes.length === 1 ? "" : "s"} updated · {item.net < 0 ? "Saved" : "Additional cost"} {money(Math.abs(item.net || 0))}</p><div className="ta-changes">{item.changes.map((change, index) => <div key={`${item.id}-${index}`}><span className="ta-change-mark">{change.kind === "cancelled" ? <X size={13}/> : <ArrowRight size={13}/>}</span><span><b>{change.title || "Booking"}</b><small>{change.kind === "cancelled" ? `${change.fromProvider || "Reservation"} cancelled` : `${change.fromProvider || "Original"} → ${change.provider || "Replacement"}`}</small></span><em>{change.refund ? `${money(change.refund)} refund estimate` : change.kind === "cancelled" ? "Removed" : "Updated"}</em></div>)}</div></div><div className="ta-event-tail"><b className={item.net < 0 ? "saving" : ""}>{item.net < 0 ? "−" : "+"}{money(Math.abs(item.net || 0))}</b><button className="text-button" disabled={busy} onClick={() => setModal({type:"restore", h:item})}><RotateCcw size={13}/>Restore</button></div></article>)}</div></section>}
      <section className="ta-current-plan"><header><div><span className="ti-eyebrow">SAVED BOOKINGS</span><h3>Current trip plan</h3><p>{bookings.length} itinerary item{bookings.length === 1 ? "" : "s"} saved to this trip</p></div><a href={`/trip/${tripId}/overview`}>Full itinerary <ArrowRight size={14}/></a></header>{bookings.length ? <div className="ta-bookings">{[...bookings].sort((a,b)=>Date.parse(a.start)-Date.parse(b.start)).slice(0,4).map((booking)=>{const Icon=icons[booking.type]||Route;return <article key={booking.id}><span className={`ti-type-icon ti-${booking.type}`}><Icon size={16}/></span><div><small>{date(booking.start)} · {time(booking.start)} IST</small><b>{booking.title}</b><span>{booking.provider}</span></div><em>{money(booking.price)}</em></article>})}</div> : <div className="ta-no-bookings">No bookings have been added to this trip yet.</div>}</section>
    </div>
  );
}
