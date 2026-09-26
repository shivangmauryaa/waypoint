// Trip Builder — two experiences over one shared engine.
//
//   Manual    : pick a route, explore the search results, select items and
//               review the generated itinerary and cost before confirming.
//   Automated : describe what went wrong, answer only the missing questions,
//               and let the assistant assemble and revise a plan you confirm.
//
// The screens are ported from the "Trip Options Found" and "Review & Edit"
// designs. Every option shown is simulated provider data and is labelled.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plane,
  BedDouble,
  Car,
  UtensilsCrossed,
  Ticket,
  RefreshCw,
  Search,
  Check,
  X,
  TriangleAlert,
  Info,
  CalendarDays,
  ArrowRight,
  MapPin,
  Star,
  Layers,
  CircleCheck,
  Scale,
  Wallet,
  Receipt,
  Sparkles,
  Users,
} from "lucide-react";
import { api, go } from "./api";
import { BuildWelcome } from "./BuildWelcome";
import { ManualTrip } from "./ManualTrip";
import { categoryPhotos, destinationPhoto, TripPhoto } from "./BuilderVisuals";
import { RouteForm, AutoChat, BuildLanding } from "./BuilderPanels";
import { RecoveryFlow } from "./RecoveryFlow";

export const BUILDER_CITIES = ["Mumbai", "Jaipur", "Delhi", "Udaipur", "Goa", "Bengaluru", "Agra", "Varanasi"];

export const BUILDER_CATEGORIES = [
  { key: "flights", label: "Flights & rail", icon: Plane },
  { key: "hotels", label: "Hotels", icon: BedDouble },
  { key: "transfers", label: "Airport & local transport", icon: Car },
  { key: "restaurants", label: "Restaurants", icon: UtensilsCrossed },
  { key: "activities", label: "Activities & attractions", icon: Ticket },
];

export const money = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

const IST = 19800000;
const hhmm = (iso) => (iso ? new Date(Date.parse(iso) + IST).toISOString().slice(11, 16) : "--:--");
const dayLabel = (iso) =>
  iso
    ? new Date(Date.parse(iso) + IST).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })
    : "";

const GLYPH = {
  "Water Park": "🌊", "Snow Park": "❄️", "National Park": "🐯", Theme: "🎡", Museum: "🏛️", Fort: "🏰",
  Palace: "👑", Shopping: "🛍️", "Walking Tour": "🚶", Beach: "🏖️", Garden: "🌳", Temple: "🛕",
  Nightlife: "🌃", Adventure: "🧗",
};

export const itemTitle = (item) => {
  if (item.category === "flights") return `${item.origin} → ${item.destination}${item.returnLeg ? " (return)" : ""}`;
  if (item.category === "hotels") return item.name;
  if (item.category === "transfers") return `${item.source} · ${item.vehicle}`;
  return item.name;
};
const itemPrice = (item) => (item.price ?? 0) * 1;

const brandSlug = (value) =>
  String(value || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// Logos come from the backend (/api/logos/:brandId), which resolves the real
// provider mark and caches it locally. Unknown brands fall back to a monogram.
function BrandMark({ name, brandId }) {
  const [failed, setFailed] = useState(false);
  const initials = (name || "?").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const slug = brandId || brandSlug(name);
  return (
    <span className="brand-mark" aria-label={`${name} logo`}>
      {slug && !failed ? <img src={`/api/logos/${slug}`} alt={`${name} logo`} loading="lazy" onError={() => setFailed(true)} /> : <b aria-hidden="true">{initials}</b>}
    </span>
  );
}

export const itemSubtitle = (item) => {
  if (item.category === "flights")
    return `${item.source} · ${item.code} · ${hhmm(item.departAt)} → ${hhmm(item.arriveAt)} · ${Math.floor(item.durationMinutes / 60)}h ${item.durationMinutes % 60}m`;
  if (item.category === "hotels")
    return `${"★".repeat(item.stars)} · ${item.rating} rating · ${item.distanceFromAirportKm} km from the airport`;
  if (item.category === "transfers") return `${item.from} → ${item.to} · ${item.etaMinutes} min · ${item.distanceKm} km`;
  if (item.category === "restaurants") return `${item.cuisine || "Local dining"} · ${item.distanceKm} km away`;
  return `${GLYPH[item.activityKind] || "🎫"} ${item.activityKind || "Local attraction"} · ${item.distanceKm} km away`;
};

const dishIdeas = (cuisine = "") => {
  const value = cuisine.toLowerCase().replaceAll("_", " ");
  if (/south indian|idli|dosa|tiffin/.test(value)) return "Idli · dosa · uttapam";
  if (/chinese|noodle|pan.?asian|thai/.test(value)) return "Hakka noodles · dumplings";
  if (/rajasthani/.test(value)) return "Dal baati churma · pyaaz kachori";
  if (/street|chaat/.test(value)) return "Chaat · kachori · local snacks";
  if (/seafood|goan|coastal/.test(value)) return "Fish curry · coastal thali";
  if (/mughlai|north indian|punjabi/.test(value)) return "Thali · kebabs · paneer";
  if (/italian|pizza/.test(value)) return "Pizza · pasta";
  if (/cafe|coffee|bakery/.test(value)) return "Coffee · bakery specials";
  if (/continental/.test(value)) return "Grill · seasonal specials";
  return "Local thali · regional favourites";
};
const foodPhotoPosition = (cuisine = "") => {
  const value = cuisine.toLowerCase();
  if (/noodle|chinese|pan.?asian/.test(value)) return "left bottom";
  if (/rajasthani/.test(value)) return "right bottom";
  if (/dosa|south indian/.test(value)) return "right top";
  return "left top";
};

const itemMeta = (item) => {
  if (item.category === "flights")
    return [item.stops ? `${item.stops} stop` : "Nonstop", item.baggageKg ? `${item.baggageKg} kg baggage` : "Cabin bag only", item.refundable ? "Refundable" : "Non-refundable"];
  if (item.category === "hotels")
    return [`${money(item.pricePerNight)}/night · ${item.nights} night${item.nights === 1 ? "" : "s"}`, `Check-in ${item.checkInTime}`, ...item.amenities.slice(0, 2)];
  if (item.category === "transfers") return [`Up to ${item.capacity} seats`, "Estimate, not a live quote"];
  if (item.category === "restaurants")
    return [item.openingHours || "Hours not listed", item.rating ? `${item.rating} rating` : "No rating data"];
  return [item.openingHours || "Hours not listed", item.rating ? `${item.rating} rating` : item.address || "No rating data"];
};

export function Fidelity({ value }) {
  const tone = value === "Live" ? "live" : value === "Verified" ? "verified" : value === "Estimated" ? "estimated" : "simulated";
  return <span className={"fidelity " + tone} title="How this value was obtained">{value}</span>;
}

const JOB_TONE = { QUEUED: "queued", SEARCHING: "running", PARTIAL: "running", COMPLETED: "done", FAILED: "failed", TIMEOUT: "failed", CANCELLED: "cancelled" };

export function JobChip({ job }) {
  const label =
    job.state === "SEARCHING" ? "Searching…" : job.state === "PARTIAL" ? "More results arriving…" : job.state === "COMPLETED" ? `${job.total} found`
      : job.state === "FAILED" ? "Provider unavailable" : job.state === "CANCELLED" ? "Cancelled" : job.state === "TIMEOUT" ? "Timed out" : "Queued";
  return <span className={"job-chip " + (JOB_TONE[job.state] || "queued")}>{["SEARCHING", "PARTIAL", "QUEUED"].includes(job.state) && <RefreshCw size={11} className="spin" />}{job.state === "COMPLETED" && <Check size={11} />}{label}</span>;
}

function categoryPlaceItem(place, category, travelers) {
  return {
    id: place.id,
    category,
    kind: category === "restaurants" ? "restaurant" : "activity",
    source: "OpenStreetMap",
    fidelity: "Live",
    name: place.name,
    cuisine: place.cuisine || place.kind,
    activityKind: place.kind,
    price: 0,
    perPerson: 0,
    avgPerPerson: 0,
    priceBand: "Check with venue",
    travelers,
    priceUnknown: true,
    rating: null,
    distanceKm: place.distanceKm,
    openTime: place.openingHours || "Check with venue",
    closeTime: "",
    durationMinutes: 90,
    reservation: false,
    address: place.address,
    phone: place.phone,
    website: place.website,
    osmId: place.osmId,
    photoUrl: place.photoUrl,
    availability: "unknown",
  };
}

function categoryHeading(category, destination) {
  if (category.key === "flights") return "Flights";
  if (category.key === "hotels") return `Hotels near ${destination}`;
  if (category.key === "transfers") return "Airport transport";
  if (category.key === "restaurants") return `Restaurants near ${destination}`;
  return `Things to do in ${destination}`;
}

function ResultCard({ item, selected, onSelect, onRemove, busy, destination }) {
  const image = item.photoUrl || item.imageUrl || (item.category === "activities" ? destinationPhoto(destination) : categoryPhotos[item.category]);
  const showBrand = ["flights", "hotels", "transfers"].includes(item.category);
  const meta = itemMeta(item).slice(0, 3);
  const price = item.priceUnknown ? "Price varies" : money(itemPrice(item));
  return (
    <article className={`wp-opt wp-opt-${item.category}${selected ? " selected" : ""}`}>
      <div className="wp-opt-photo">
        {item.category === "restaurants" && !item.photoUrl && !item.imageUrl
          ? <div className="wp-food-sprite" role="img" aria-label={`${dishIdeas(item.cuisine)} cuisine inspiration`} style={{ backgroundPosition: foodPhotoPosition(item.cuisine) }} />
          : <TripPhoto src={image} alt="" />}
        {showBrand && <BrandMark name={item.source} brandId={item.providerId} />}
        {item.category === "restaurants" && <span className="wp-place-mark" aria-label={`${item.name} venue mark`}>{(item.name || "Local").split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span>}
        <span className="wp-opt-badge">{selected ? <><Check size={11} /> Selected</> : item.rating ? <><Star size={11} /> {item.rating}</> : "Option"}</span>
      </div>
      <div className="wp-opt-body">
        <div className="wp-opt-top"><span className="wp-opt-source">{item.source}</span><Fidelity value={item.fidelity} /></div>
        <h4>{itemTitle(item)}</h4>
        <p className="wp-opt-sub">{itemSubtitle(item)}</p>
        {item.category === "restaurants" && <p className="wp-dish-ideas"><b>Dish ideas</b> {dishIdeas(item.cuisine)}</p>}
        <div className="wp-opt-meta">{meta.map((m) => <span key={m} className={/non-refundable|limited|cabin bag only|no rating|not listed|varies/i.test(m) ? "alert" : ""}>{m}</span>)}</div>
        <div className="wp-opt-foot">
          <strong>{price}</strong>
          {selected ? (
            <button className="wp-btn ghost" onClick={() => onRemove(item)} disabled={busy}><X size={12} /> Remove</button>
          ) : item.mapUrl ? (
            <a className="wp-btn primary" href={item.mapUrl} target="_blank" rel="noreferrer"><MapPin size={12} /> View</a>
          ) : (
            <button className="wp-btn primary" onClick={() => onSelect(item)} disabled={busy}><Check size={12} /> Select</button>
          )}
        </div>
      </div>
    </article>
  );
}

function CategorySection({ category, build, selectedIds, onSelect, onRemove, busy, query, placeData, placesLoading, placesError, onPlaceSearch }) {
  const [open, setOpen] = useState(false);
  const Icon = category.icon;
  const job = build.jobs[category.key] || { state: "QUEUED", revealed: 0, total: 0 };
  const isLocal = category.key === "restaurants" || category.key === "activities";
  const demoResults = build.results[category.key] || [];
  const liveResults = isLocal && placeData?.[category.key]
    ? placeData[category.key].map((place) => categoryPlaceItem(place, category.key, build.request.travelers || 1))
    : [];
  const results = isLocal && liveResults.length ? liveResults : demoResults;
  const q = (query || "").trim().toLowerCase();
  const filtered = q
    ? results.filter((x) => [itemTitle(x), x.source, x.code, x.cuisine, x.activityKind].filter(Boolean).join(" ").toLowerCase().includes(q))
    : results;
  const max = category.key === "flights" || category.key === "hotels" ? 4 : category.key === "activities" ? 2 : 6;
  const visible = open ? filtered : filtered.slice(0, max);
  const active = isLocal ? placesLoading : ["SEARCHING", "PARTIAL", "QUEUED"].includes(job.state);
  const countLabel = isLocal
    ? placesLoading ? "Searching…" : liveResults.length ? `${liveResults.length} live places` : `${results.length} options`
    : results.length ? `${results.length} options` : active ? "Searching…" : "No options";
  return (
    <section className={`wp-cat wp-cat-${category.key}`} aria-label={category.label}>
      <header className="wp-cat-head">
        <span className={`wp-cat-icon tone-${category.key}`}><Icon size={16} /></span>
        <h3>{categoryHeading(category, build.request.destination)}</h3>
        <span className="wp-cat-count">{countLabel}</span>
        {isLocal ? <span className="job-chip done"><Check size={11} /> {placesLoading ? "OpenStreetMap…" : liveResults.length ? "Live places" : "Demo catalogue"}</span> : <JobChip job={job} />}
      </header>
      <div className="wp-cat-grid">
        {visible.map((item) => <ResultCard key={item.id} item={item} selected={selectedIds.has(item.id)} onSelect={onSelect} onRemove={onRemove} busy={busy} destination={build.request.destination} />)}
        {!filtered.length && <div className="wp-cat-empty"><Layers size={20} /><p>{active ? "Options are still arriving…" : q ? "No options match this search." : "Nothing listed here yet."}</p></div>}
      </div>
      {filtered.length > max && <button type="button" className="wp-see-all" onClick={() => setOpen(!open)}>{open ? "Show fewer" : `See all ${category.label.toLowerCase()}`} <ArrowRight size={13} /></button>}
      {isLocal && liveResults.length > 0 && <p className="wp-attribution">Nearby listings from OpenStreetMap contributors · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">Attribution</a>. Prices vary by venue; dish ideas reflect cuisine and are not verified menus.</p>}
      {isLocal && placesError && !liveResults.length && <p className="wp-attribution">Live places are unavailable right now — showing curated demo options. <button type="button" onClick={onPlaceSearch}>Try again</button></p>}
    </section>
  );
}

export function SearchPanel({ build, onSelect, onRemove, busy, query = "", placeData, placesLoading, placesError, onPlaceSearch }) {
  const selectedIds = useMemo(() => {
    const set = new Set();
    if (build.selection.flight) set.add(build.selection.flight.id);
    if (build.selection.returnFlight) set.add(build.selection.returnFlight.id);
    if (build.selection.hotel) set.add(build.selection.hotel.id);
    build.selection.transfers.forEach((item) => set.add(item.id));
    build.selection.restaurants.forEach((item) => set.add(item.id));
    build.selection.activities.forEach((item) => set.add(item.id));
    return set;
  }, [build.selection]);
  return (
    <div className="wp-search">
      <h2 className="wp-sr-only">Travel Search Results</h2>
      <div className="wp-cat-list">
        {BUILDER_CATEGORIES.map((category) => (
          <CategorySection key={category.key} category={category} build={build} selectedIds={selectedIds} onSelect={onSelect} onRemove={onRemove} busy={busy} query={query} placeData={placeData} placesLoading={placesLoading} placesError={placesError} onPlaceSearch={onPlaceSearch} />
        ))}
      </div>
    </div>
  );
}

function BuildStatus({ build }) {
  const stations = [
    { key: "flights", label: "Flights", icon: Plane },
    { key: "hotels", label: "Hotels", icon: BedDouble },
    { key: "transfers", label: "Transport", icon: Car },
    { key: "restaurants", label: "Restaurants", icon: UtensilsCrossed },
    { key: "activities", label: "Activities", icon: Ticket },
    { key: "itinerary", label: "Building Itinerary", icon: CalendarDays },
  ];
  const totalJobs = stations.length;
  const value = (key) => {
    if (key === "itinerary") return build.itinerary?.length ? { state: "COMPLETED", total: build.itinerary.length } : { state: "QUEUED", total: 0 };
    return build.jobs[key] || { state: "QUEUED", total: 0 };
  };
  const done = stations.filter((s) => value(s.key).state === "COMPLETED").length;
  const progress = Math.round((done / totalJobs) * 100);
  return (
    <div className="wp-status">
      <div className="wp-status-bar"><span style={{ width: `${progress}%` }} /></div>
      <div className="wp-status-items">
        {stations.map((s) => {
          const job = value(s.key);
          const Icon = s.icon;
          const complete = job.state === "COMPLETED";
          return (
            <div className={`wp-st${complete ? " done" : ""}`} key={s.key}>
              <span className="wp-st-icon"><Icon size={14} /></span>
              <div><b>{s.label}</b><small>{complete ? `${job.total} found` : job.state === "QUEUED" ? "Waiting…" : "Searching…"}</small></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SelectionPanel({ build, onRemove, onEdit, busy }) {
  const groups = [
    { key: "flights", label: "Flight", items: [build.selection.flight, build.selection.returnFlight].filter(Boolean) },
    { key: "hotels", label: "Hotel", items: build.selection.hotel ? [build.selection.hotel] : [] },
    { key: "transfers", label: "Airport Transfer", items: build.selection.transfers },
    { key: "restaurants", label: "Restaurant", items: build.selection.restaurants },
    { key: "activities", label: "Activity", items: build.selection.activities },
  ];
  const count = groups.reduce((n, g) => n + g.items.length, 0);
  return (
    <div className="wp-rail-card">
      <header className="wp-rail-head"><b>Your Trip</b><button type="button" onClick={onEdit}>Edit All</button></header>
      {groups.map((g) => (
        <div className="wp-sel-group" key={g.key}>
          {g.items.length ? g.items.map((item) => (
            <div className="wp-sel" key={item.id}>
              <span className="wp-sel-img"><TripPhoto src={item.category === "activities" ? destinationPhoto(build.request.destination) : categoryPhotos[item.category]} alt="" /></span>
              <div className="wp-sel-text"><b>{g.label}</b><span>{itemTitle(item)}<br />{itemSubtitle(item)}</span></div>
              <span className="wp-sel-price">{item.priceUnknown ? "Varies" : money(itemPrice(item))}</span>
              <button type="button" className="wp-sel-change" onClick={() => onRemove(item)} disabled={busy}>Change</button>
            </div>
          )) : <div className="wp-sel wp-sel-empty"><span>No {g.label.toLowerCase()} selected yet</span><a href={`#results-${g.key}`}>+ Add</a></div>}
        </div>
      ))}
      <div className="wp-rail-foot"><button type="button" className="wp-btn ghost wide" onClick={onEdit}>+ Add More Activities / Restaurants</button><small>{count} item{count === 1 ? "" : "s"} in your trip</small></div>
    </div>
  );
}

const COST_ICONS = { flights: Plane, hotels: BedDouble, transfers: Car, local: Car, restaurants: UtensilsCrossed, activities: Ticket, fees: Receipt };

function CostPanel({ build, onContinue, busy, continueLabel = "Continue → Review & Edit", hint }) {
  const { cost } = build;
  const remaining = (cost.budget || 0) - cost.total;
  return (
    <div className="wp-rail-card">
      <header className="wp-rail-head"><b>Cost Breakdown</b><span>INR₹</span></header>
      <div className="wp-cost">
        {cost.lines.map((l) => {
          const Icon = COST_ICONS[l.key] || Wallet;
          return (
            <div className="wp-cost-row" key={l.key + l.label}>
              <span className="wp-cost-label"><i className={`wp-cost-ico tone-${l.key}`}><Icon size={13} /></i><span>{l.label}</span></span>
              <b>{money(l.amount)}</b>
            </div>
          );
        })}
        {!cost.lines.length && <div className="wp-cost-row"><span>No items selected yet</span><b>{money(0)}</b></div>}
        <div className="wp-cost-total"><span>Total Estimated Cost</span><b>{money(cost.total)}</b></div>
        {cost.budget > 0 && (
          <>
            <div className="wp-budget-title"><span>Your Budget</span><span>{money(cost.budget)}</span></div>
            <div className="wp-budget-bar"><span style={{ width: `${Math.min(100, (cost.total / cost.budget) * 100)}%` }} className={cost.overBudget ? "over" : ""} /></div>
            <div className={"wp-budget-status" + (cost.overBudget ? " over" : "")}>{cost.overBudget ? `Over budget by ${money(cost.overBy)}` : `Remaining ${money(Math.max(remaining, 0))}`}</div>
          </>
        )}
        {onContinue && <button className="wp-btn primary wide" onClick={onContinue} disabled={busy || !build.ready}>{build.ready ? continueLabel : "Choose a flight and hotel to continue"}</button>}
        {hint && <p className="wp-cost-hint">{hint}</p>}
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  const tone = { draft: "draft", confirmed: "confirmed", booked: "booked", partial: "partial" }[status] || "draft";
  return <span className={"wp-status-pill " + tone}>{status}</span>;
}

function Stepper({ step = 2 }) {
  const items = ["Trip Details", "Search", "Review & Edit", "Confirm"];
  return (
    <ol className="wp-steps">
      {items.map((label, i) => {
        const n = i + 1;
        const state = n < step ? "done" : n === step ? "current" : "";
        return <li key={label} className={state}><span className="wp-step-n">{n < step ? <Check size={12} /> : n}</span>{label}{i < items.length - 1 && <i className="wp-step-line" />}</li>;
      })}
    </ol>
  );
}

const EVENT_KIND_PHOTO = { transport: "flights", arrive: "flights", transfer: "transfers", hotel: "hotels", rest: "hotels", meal: "restaurants" };
const EVENT_KIND_ICON = { transport: Plane, arrive: Check, transfer: Car, hotel: BedDouble, rest: BedDouble, meal: UtensilsCrossed };

function ReviewPanel({ build, busy, onBack, onBook, onSave, savedTripId, onRemove }) {
  const [tab, setTab] = useState("itinerary");
  const days = build.itinerary || [];
  const tabs = [
    { key: "itinerary", label: "Itinerary", icon: CalendarDays },
    { key: "flights", label: "Flights", icon: Plane },
    { key: "hotels", label: "Hotels", icon: BedDouble },
    { key: "transfers", label: "Transport", icon: Car },
    { key: "restaurants", label: "Restaurants", icon: UtensilsCrossed },
    { key: "activities", label: "Activities", icon: Ticket },
  ];
  const selectionFor = (key) => {
    if (key === "flights") return [build.selection.flight, build.selection.returnFlight].filter(Boolean);
    if (key === "hotels") return build.selection.hotel ? [build.selection.hotel] : [];
    return build.selection[key] || [];
  };
  const done = build.status === "booked" || build.status === "partial";
  return (
    <div className="wp-review">
      <div className="wp-review-tabs">
        {tabs.map((t) => { const Icon = t.icon; return <button key={t.key} type="button" className={tab === t.key ? "active" : ""} onClick={() => setTab(t.key)}><Icon size={13} /> {t.label}</button>; })}
      </div>
      <div className="wp-review-grid">
        <section className="wp-review-main">
          {tab === "itinerary" ? (
            <>
              <div className="wp-review-title"><h2>Your Itinerary <span>({days.length} Day{days.length === 1 ? "" : "s"})</span></h2><p>A complete day-by-day plan with timings, locations and selected options.</p></div>
              {!days.length && <div className="wp-cat-empty"><CalendarDays size={22} /><p>Choose a flight and hotel to generate your day-by-day plan.</p><button type="button" className="wp-btn ghost" onClick={onBack}>Back to options</button></div>}
              {days.map((day, di) => (
                <div className="wp-day" key={day.date}>
                  <div className="wp-day-head"><span className="wp-day-label"><b>Day {di + 1}</b><small>{dayLabel(day.date + "T00:00:00+05:30")}</small></span><span className="wp-day-caption">{di === 0 ? "Arrival & check-in" : "Sightseeing & activities"}</span><button type="button" className="wp-day-edit" onClick={onBack}>Edit day</button></div>
                  <div className="wp-timeline">
                    {day.events.map((event, ei) => {
                      const Icon = EVENT_KIND_ICON[event.kind] || Ticket;
                      return (
                        <div className={"wp-event kind-" + event.kind} key={event.title + ei}>
                          <span className="wp-event-time">{event.time}</span>
                          <span className="wp-event-dot"><Icon size={11} /></span>
                          <div className="wp-event-body"><b>{event.title}</b>{event.subtitle && <span>{event.subtitle}</span>}</div>
                          <TripPhoto className="wp-event-img" src={categoryPhotos[EVENT_KIND_PHOTO[event.kind] || "activities"]} alt="" />
                          <button type="button" className="wp-event-change" onClick={onBack}>Change</button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              <button type="button" className="wp-add-day" onClick={onBack}>＋ Add Another Day<small>Extend your trip with more activities</small></button>
            </>
          ) : (
            <div className="wp-review-list">
              <div className="wp-review-title"><h2>{tabs.find((t) => t.key === tab)?.label} <span>({selectionFor(tab).length})</span></h2><p>Everything you selected for this part of the trip.</p></div>
              {selectionFor(tab).length ? selectionFor(tab).map((item) => (
                <div className="wp-review-row" key={item.id}>
                  <span className="wp-sel-img"><TripPhoto src={item.category === "activities" ? destinationPhoto(build.request.destination) : categoryPhotos[item.category]} alt="" /></span>
                  <div><b>{itemTitle(item)}</b><span>{itemSubtitle(item)}</span></div>
                  <strong>{item.priceUnknown ? "Varies" : money(itemPrice(item))}</strong>
                  <button type="button" className="wp-event-change" onClick={() => onRemove?.(item)} disabled={busy}>Change</button>
                </div>
              )) : <div className="wp-cat-empty"><Info size={20} /><p>Nothing selected in this category yet.</p><button type="button" className="wp-btn ghost" onClick={onBack}>Back to options</button></div>}
            </div>
          )}
        </section>
        <aside className="wp-review-rail">
          <SelectionPanel build={build} onRemove={onRemove} onEdit={onBack} busy={busy} />
          <CostPanel build={build} onContinue={onBook} busy={busy} continueLabel="Confirm & Book →" hint="Prices are simulated demo values. No payment is taken." />
          {!!build.attempts.length && (
            <div className="wp-rail-card">
              <header className="wp-rail-head"><b>Booking Progress</b><span>{build.attempts.filter((a) => a.status === "BOOKED").length}/{build.attempts.length}</span></header>
              <div className="wp-cost">
                {build.attempts.map((a) => (
                  <div className={"wp-attempt " + a.status.toLowerCase()} key={a.id}>
                    {a.status === "FAILED" ? <TriangleAlert size={13} /> : <CircleCheck size={13} />}
                    <span>{a.title}</span>
                    <small>{a.reference}</small>
                  </div>
                ))}
              </div>
            </div>
          )}
          {done && (
            <div className="wp-rail-card">
              <div className="wp-cost">
                {savedTripId ? (
                  <>
                    <div className="wp-budget-status">✓ Booked — added to My Trips</div>
                    <a className="wp-btn primary wide" href={"/trip/" + savedTripId}>Open the trip</a>
                    <a className="wp-btn ghost wide" href="/trips">View all my trips</a>
                  </>
                ) : (
                  <>
                    <div className="wp-budget-status">Your simulated booking is complete.</div>
                    <button className="wp-btn primary wide" onClick={onSave} disabled={busy}>Save to My Trips</button>
                  </>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>
      <p className="wp-footnote"><Scale size={13} /> Simulated provider offers. References are demo values and no supplier is contacted.</p>
    </div>
  );
}

export function ConflictPanel({ conflicts }) {
  if (!conflicts?.length) return <div className="wp-conflicts ok"><Check size={14} /> No schedule conflicts — every selected item fits the plan.</div>;
  return <div className="wp-conflicts"><ul>{conflicts.map((c, i) => <li key={c.code + i} className={c.level}><TriangleAlert size={13} /> {c.message}</li>)}</ul></div>;
}

export function Builder({ id, user }) {
  const [catalogueQuery, setCatalogueQuery] = useState("");
  const [build, setBuild] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [screen, setScreen] = useState("options");
  const [savedTripId, setSavedTripId] = useState("");
  const [placeData, setPlaceData] = useState(null);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [placesError, setPlacesError] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const next = await api("build/" + id);
      setBuild(next);
      if (next.savedTripId) { setSavedTripId(next.savedTripId); setScreen("confirmed"); }
    } catch (e) { setError(e.message); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const loadPlaces = useCallback(async (destination) => {
    if (!destination || destination.toLowerCase() === "?") return;
    setPlacesLoading(true);
    setPlacesError("");
    try { setPlaceData(await api("places/" + encodeURIComponent(destination))); }
    catch (e) { setPlacesError(e.message); }
    finally { setPlacesLoading(false); }
  }, []);
  useEffect(() => {
    if (!build?.request.destination) return;
    setPlaceData(null);
    loadPlaces(build.request.destination);
  }, [build?.request.destination, loadPlaces]);

  const active = !!build && Object.values(build.jobs || {}).some((j) => ["SEARCHING", "PARTIAL", "QUEUED"].includes(j.state));
  useEffect(() => {
    if (!id || !active) return;
    const timer = setInterval(load, 1200);
    return () => clearInterval(timer);
  }, [id, active, load]);

  const run = async (path, body) => {
    setBusy(true);
    setError("");
    try {
      const next = await api("build/" + id + path, body ?? {});
      if (next && next.jobs && next.cost) setBuild(next);
      return next;
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const start = async (payload) => {
    setBusy(true);
    setError("");
    try {
      const created = await api("build", payload);
      go("build/" + created.id);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!id && !new URLSearchParams(window.location.search).has("mode") && !new URLSearchParams(window.location.search).has("destination")) return <BuildWelcome />;
  if (!id && new URLSearchParams(window.location.search).get("mode") !== "auto") return <ManualTrip user={user} onStart={start} busy={busy} error={error} />;
  if (!id)
    return (
      <div className="page trip-builder-page">
        <div className={`page-heading recovery-page-heading${new URLSearchParams(window.location.search).get("mode") === "auto" ? " is-auto" : ""}`}>
          <div><span className="eyebrow">{new URLSearchParams(window.location.search).get("mode") === "auto" ? "AI POWERED TRAVEL RECOVERY" : "YOUR NEXT CHAPTER STARTS HERE"}</span><h1>{new URLSearchParams(window.location.search).get("mode") === "auto" ? <Sparkles size={28} /> : <Plane size={30} />} {new URLSearchParams(window.location.search).get("mode") === "auto" ? "AI Recovery" : "Build my trip"}<span className="heading-spark">✦</span></h1><p>{new URLSearchParams(window.location.search).get("mode") === "auto" ? "A disruption doesn’t have to end your journey. Let’s find your next best option." : "Big adventures. Little details. Let’s bring your journey together."}</p></div>
          {new URLSearchParams(window.location.search).get("mode") === "auto" && <a className="recovery-view-trips" href="/trips"><CalendarDays size={16}/> View my trips <ArrowRight size={15}/></a>}
        </div>
        {error && <div className="error">{error}</div>}
        <BuildLanding onStart={start} busy={busy} />
      </div>
    );

  if (!build)
    return <div className="page">{error ? <div className="error">{error}</div> : <div className="builder-empty"><RefreshCw size={22} className="spin" /><p>Loading your build…</p></div>}</div>;

  const selecting = (item) => run("/select", { category: item.category, itemId: item.id });
  const removing = (item) => run("/remove", { category: item.category, itemId: item.id });
  const openReview = () => { setScreen("review"); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const book = async () => {
    const confirmed = await run("/confirm", {});
    if (!confirmed) return;
    const booked = await run("/book", {});
    if (!booked) return;
    // Booking a plan creates a real trip so it appears under My Trips right away.
    const saved = await run("/save", {});
    if (saved?.id) { setSavedTripId(saved.id); setScreen("confirmed"); }
  };
  const save = async () => { const r = await run("/save", {}); if (r?.id) setSavedTripId(r.id); };

  if (build.mode === "auto") return <RecoveryFlow key={id} build={build} user={user} busy={busy} error={error} onRun={run} />;

  return (
    <div className={`wp-build${build.mode === "auto" ? " wp-build-auto" : ""}`}>
      {screen === "confirmed" && savedTripId ? <RecoveryConfirmed build={build} tripId={savedTripId} /> : <>
      <div className="wp-build-crumb">Home <span>›</span> Trip Planner <span>›</span> {build.mode === "auto" ? "AI Recovery" : "Build My Trip"} <span>›</span> <b>{screen === "review" ? "Review & Edit" : "Search"}</b></div>

      <div className="wp-build-head">
        <div className="wp-build-title">
          <span className="wp-build-plane"><Plane size={30} fill="currentColor" /></span>
          <div>
            <h1>{build.mode === "auto" ? (build.phase === "searching" ? "Let’s get you back on track ✨" : screen === "review" ? "Your recovery plan is ready ✨" : "Your recovery options are ready ✨") : screen === "review" ? "Review & Edit Your Trip" : "Trip Options Found!"}</h1>
            <p>{build.mode === "auto" ? (build.phase === "searching" ? "I’m checking flights, hotels, transport, food and things to do for the best way forward." : "Choose the alternatives that work for you, then review and confirm your plan.") : screen === "review" ? "Your complete itinerary is ready. Review your plan, make changes if needed, and confirm to book." : "Here are the best options for your trip. Select and customize them to create your perfect itinerary."}</p>
          </div>
        </div>
        <Stepper step={screen === "review" ? 3 : 2} />
      </div>

      <div className="wp-build-tools">
        <label className="wp-build-search"><Search size={14} /><input aria-label="Search travel options" placeholder="Search flights, hotels, places and more…" value={catalogueQuery} onChange={(e) => setCatalogueQuery(e.target.value)} /></label>
        <div className="wp-build-actions">
          <StatusPill status={build.status} />
          {build.mode === "manual" && <button type="button" className="wp-btn ghost" onClick={() => setEditing(!editing)}><MapPin size={13} /> Edit route</button>}
          <button type="button" className="wp-btn ghost" onClick={() => run("/search", { categories: undefined, force: true })} disabled={busy}><RefreshCw size={13} /> Refresh all</button>
        </div>
      </div>

      {error && <div className="error" role="alert">{error}{<button className="icon-button" onClick={() => setError("")} aria-label="Dismiss"><X size={15} /></button>}</div>}

      {editing && (
        <div className="wp-edit-route">
          <h2>Change the plan</h2>
          <p>Changing your route, dates or party cancels the running searches and invalidates their results, then starts fresh ones.</p>
          <RouteForm initial={build.request} submitLabel="Re-plan" busy={busy} onSubmit={async (value) => { await run("/request", { ...value, mode: undefined }); setEditing(false); }} />
        </div>
      )}

      {screen === "review" ? (
        <ReviewPanel build={build} busy={busy} onBack={() => setScreen("options")} onBook={book} onSave={save} savedTripId={savedTripId} onRemove={removing} />
      ) : (
        <>
          <BuildStatus build={build} />
          <div className="wp-build-grid">
            <div className="wp-build-main">
              {build.mode === "auto" && <AutoChat build={build} busy={busy} onSend={(message) => run("/message", { message })} onSelect={(category, itemId) => run("/select", { category, itemId })} />}
              <SearchPanel build={build} onSelect={selecting} onRemove={removing} onSearch={(cats) => run("/search", { categories: cats })} onStop={(cats) => run("/stop", { categories: cats })} busy={busy} query={catalogueQuery} placeData={placeData} placesLoading={placesLoading} placesError={placesError} onPlaceSearch={() => loadPlaces(build.request.destination)} />
            </div>
            <aside className="wp-build-rail">
              {build.mode === "auto" ? <AutoRecoveryRail build={build} onEdit={() => setEditing(true)} /> : <SelectionPanel build={build} onRemove={removing} onEdit={() => setEditing(true)} busy={busy} />}
              <CostPanel build={build} onContinue={openReview} busy={busy} hint="Select options as they appear. Only a flight and hotel are required to continue." />
              <ConflictPanel conflicts={build.conflicts} />
            </aside>
          </div>
        </>
      )}
      </>}
    </div>
  );
}

function AutoRecoveryRail({ build, onEdit }) {
  const context = [
    ["Current location", build.request.origin || "Add current location"],
    ["Destination", build.request.destination || "Finding destination"],
    ["Travel date", build.request.date || "Flexible / today"],
    ["Budget", build.request.budget ? money(build.request.budget) : "Not set"],
    ["Travelers", `${build.request.travelers || 1} traveler${(build.request.travelers || 1) === 1 ? "" : "s"}`],
  ];
  return <>
    <div className="wp-rail-card recovery-context"><header className="wp-rail-head"><b>Recovery Control</b><button type="button" onClick={onEdit}>Edit</button></header>{context.map(([label, value], i) => <div className="recovery-context-row" key={label}><span>{i === 0 || i === 1 ? <MapPin size={16} /> : i === 2 ? <CalendarDays size={16} /> : i === 3 ? <Wallet size={16} /> : <Users size={16} />}</span><div><small>{label}</small><b>{value}</b></div></div>)}</div>
    <div className="wp-rail-card recovery-live"><header className="wp-rail-head"><b><RefreshCw size={14} className={build.phase === "searching" ? "spin" : ""} /> Live Search Status</b><span>{build.phase === "searching" ? "Searching" : "Options ready"}</span></header>{BUILDER_CATEGORIES.map(({ key, label, icon: Icon }) => { const job = build.jobs[key] || {}; return <div className="recovery-live-row" key={key}><Icon size={15} /><span>{label}</span><b>{job.state === "COMPLETED" ? `${job.total} found` : job.state === "FAILED" ? "Unavailable" : `${job.revealed || 0} found`}</b></div>; })}<div className="recovery-constraint-chips"><span><Check size={12} /> Budget aware</span><span><Check size={12} /> Confirm before booking</span></div></div>
  </>;
}

function RecoveryConfirmed({ build, tripId }) {
  const destination = build.request.destination;
  const bookings = build.bookingSummary?.items || [];
  return <section className="recovery-confirmed">
    <div className="recovery-confirmed-hero"><span className="recovery-confirmed-check"><CircleCheck size={31} /></span><span className="recovery-confirmed-kicker">AI RECOVERY · CONFIRMED</span><h1>Your recovery plan is confirmed! 🎉</h1><p>Your selected services were added to your trip. You can find and manage the plan in My Trips.</p>
      <div className="recovery-confirmed-pills"><span><Check size={15} /> {bookings.length} services added</span><span><Check size={15} /> Plan added to My Trips</span><span><Wallet size={15} /> {money(build.cost.total)} estimated total</span></div>
      <div className="recovery-confirmed-actions"><a className="wp-btn primary" href={`/trip/${tripId}`}>View updated trip <ArrowRight size={16} /></a><a className="wp-btn ghost" href="/trips">Go to My Trips</a></div>
    </div>
    <div className="recovery-confirmed-grid"><div className="wp-rail-card"><header className="wp-rail-head"><b>Confirmed plan for {destination}</b><span>{build.request.travelDate || "Your selected dates"}</span></header>{bookings.map((row, i) => <div className="recovery-confirmed-item" key={`${row.label}-${i}`}><span><CircleCheck size={17} /></span><div><b>{row.label}</b><small>{row.title}</small></div><strong>{money(row.amount)}</strong></div>)}<p className="recovery-demo-note">Demo booking: supplier reservations and prices are simulated. Your Waypoint trip has been saved.</p></div><div className="recovery-confirmed-photo"><TripPhoto src={destinationPhoto(destination)} alt={`${destination} travel`} /><div><small>YOUR NEXT CHAPTER</small><h2>{destination}</h2><span>{build.itinerary?.length || 1} day itinerary · {build.request.travelers || 1} traveler(s)</span></div></div></div>
  </section>;
}
