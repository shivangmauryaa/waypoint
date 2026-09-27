import { TravelerSidebar, travelerSections } from "./TravelerSidebar";
import React, { useEffect, useRef, useState } from "react";
import {
  Compass,
  Plus,
  ArrowRight,
  MapPin,
  CalendarDays,
  Route,
  ShieldCheck,
  Bell,
  Users,
  LogOut,
  Settings,
  MessageCircle,
  Download,
  Check,
  Trash2,
  Send,
  Wallet,
  TriangleAlert,
  Clock,
  ChevronDown,
  LayoutDashboard,
  Sparkles,
  Plane, Bot, Heart, Briefcase, RotateCcw,
  CloudRain, Sun, CloudSun, Wind, Droplets, Eye, Leaf, Umbrella, BusFront, Newspaper, Activity, CircleAlert,
} from "lucide-react";
import { CheckCircle2, Hotel, CarFront, Camera, MoreHorizontal, ArrowUpRight, Building2, Utensils } from "lucide-react";
import { destinations, destinationPhoto, TripPhoto } from "./BuilderVisuals";
import { api, go, fields, localDate, iso } from "./api";
import { Brand } from "./Public";
import {
  adminSections,
  adminDescriptions,
  AdminOverview,
  AdminOperations,
} from "./AdminOperations";
import { AdminSidebar } from "./AdminSidebar";
import {
  Menu,
  X,
  Search,
  RefreshCw,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
const money = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n || 0);
const risk = {
  critical: { label: "Disruption active", tone: "amber" },
  high: { label: "Connection at risk", tone: "amber" },
  medium: { label: "Tight connection", tone: "amber" },
  low: { label: "On track", tone: "green" },
  archived: { label: "Archived", tone: "" },
};
const attentionRank = { critical: 0, high: 1, medium: 2, low: 3, archived: 4 };
const departure = (t) => {
  if (t.archived) return "Archived";
  if (t.daysUntil > 1) return `Departs in ${t.daysUntil} days`;
  if (t.daysUntil === 1) return "Departs tomorrow";
  if (t.daysUntil === 0) return "Departs today";
  return "Trip underway";
};
export function Form({ children, onSubmit, className = "" }) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [success, setSuccess] = useState(false);
  return (
    <form
      className={className}
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        setError("");
        setBusy(true);
        setSuccess(false);
        try {
          await onSubmit(fields(form), form);
          setSuccess(true);
        } catch (err) {
          setError(err.message);
        } finally {
          setBusy(false);
        }
      }}
    >
      {children}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="saved-message" role="status">
          <Check size={13} />
          Saved successfully
        </p>
      )}
      <button className="button primary" disabled={busy}>
        {busy ? "Saving…" : "Save & continue"}
        <ArrowRight size={14} />
      </button>
    </form>
  );
}
export function Shell({ user, logout, children, page }) {
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    const load = () =>
      api("notifications")
        .then((n) => setUnread(n.filter((x) => !x.read).length))
        .catch(() => {});
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="workspace">
      <header className="workspace-nav">
        <Brand />
        <nav>
          <a className={page === "build" ? "current" : ""} href="/build">
            <Sparkles size={16} />
            Build a trip
          </a>
          <a className={page === "trips" ? "current" : ""} href="/trips">
            <Route size={16} />
            My trips
          </a>
          <a href="/notifications">
            <Bell size={16} />
            Inbox {unread > 0 && <span className="count">{unread}</span>}
          </a>
          <a href="/support">
            <MessageCircle size={16} />
            Support
          </a>
          {user.role === "admin" && (
            <a href="/admin">
              <ShieldCheck size={16} />
              Admin
            </a>
          )}
          <a href="/account" aria-label="Account settings">
            <Settings size={17} />
          </a>
          <button onClick={logout} aria-label="Log out">
            <LogOut size={17} />
          </button>
        </nav>
      </header>
      <div className="workspace-content">
        {!user.verified && (
          <div className="notice">
            Your account is ready. Email verification is pending—your
            verification link is in the local admin email outbox.
          </div>
        )}
        {children}
      </div>
      <footer className="workspace-footer">
        <Compass size={15} />
        Waypoint · Your journey, with room for the unexpected.
        <span>LOCAL EDITION · JSON STORAGE</span>
      </footer>
    </div>
  );
}
export { travelerSections } from "./TravelerSidebar";
// City-specific local photographs keep each card accurate; the additional
// Unsplash images rotate within the same destination and are served in HD.
const cityPhotoGallery = [
  { name: "Jaipur", photos: [destinations.find((p) => p.name === "Jaipur")?.image, "/images/build-welcome/jaipur-palace.jpg"].filter(Boolean) },
  { name: "Delhi", photos: [destinations.find((p) => p.name === "Delhi")?.image, "https://images.unsplash.com/photo-1743136648410-a73d5c9dbaab?auto=format&fit=crop&w=2200&q=85"].filter(Boolean) },
  { name: "Goa", photos: [destinations.find((p) => p.name === "Goa")?.image, "https://images.unsplash.com/photo-1582972236019-ea4af5ffe587?auto=format&fit=crop&w=2200&q=85", "https://images.unsplash.com/photo-1749753484185-30347b75988d?auto=format&fit=crop&w=2200&q=85"].filter(Boolean) },
  { name: "Udaipur", photos: [destinations.find((p) => p.name === "Udaipur")?.image, "/images/build-welcome/udaipur-lake.jpg"].filter(Boolean) },
  { name: "Mumbai", photos: [destinations.find((p) => p.name === "Mumbai")?.image, "https://images.unsplash.com/photo-1666843527155-14ec5f016802?auto=format&fit=crop&w=2200&q=85", "https://images.unsplash.com/photo-1668577593918-43e743cad2f8?auto=format&fit=crop&w=2200&q=85"].filter(Boolean) },
  { name: "Manali", photos: ["/images/build-welcome/manali.jpg"] },
  { name: "Bangalore", photos: ["/images/build-welcome/bangalore.jpg"] },
  { name: "Bengaluru", photos: ["/images/build-welcome/bangalore.jpg"] },
  { name: "Varanasi", photos: ["/images/build-welcome/varanasi-ghats.jpg", "/images/build-welcome/varanasi.jpg"] },
  { name: "Agra", photos: [destinations.find((p) => p.name === "Agra")?.image].filter(Boolean) },
];
function RotatingCityPhoto({ city, alt, className = "" }) {
  const place = cityPhotoGallery.find((entry) => city?.toLowerCase().includes(entry.name.toLowerCase())) || cityPhotoGallery[0];
  const [index, setIndex] = useState(0);
  useEffect(() => {
    setIndex(0);
    if (place.photos.length < 2) return undefined;
    const timer = setInterval(() => setIndex((value) => (value + 1) % place.photos.length), 3000);
    return () => clearInterval(timer);
  }, [place.name, place.photos.length]);
  return <TripPhoto key={`${place.name}-${index}`} className={`trip-city-rotating-photo ${className}`} src={place.photos[index % place.photos.length]} alt={alt || `${place.name} city`} onError={(event) => { if (index > 0) setIndex(0); else event.currentTarget.style.visibility = "hidden"; }} />;
}
const initials = (name) =>
  name
    ?.split(" ")
    .map((n) => n[0])
    .join("")                
    .slice(0, 2)
    .toUpperCase() || "WP";
export function TravelerShell({ user, logout, page, children }) {
  const [open, setOpen] = useState(false), [error, setError] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [recoveryPage, setRecoveryPage] = useState(false);
  useEffect(() => { const update = (event) => setRecoveryPage(Boolean(event.detail)); window.addEventListener("waypoint:recovery-mode", update); return () => window.removeEventListener("waypoint:recovery-mode", update); }, []);
  useEffect(() => { setOpen(false); }, [page]);
  const current = travelerSections.find((s) => s.slug === page);
  const autoRecovery = page === "build" && (recoveryPage || new URLSearchParams(window.location.search).get("mode") === "auto");
  useEffect(() => { if (!autoRecovery) return; let active = true; const refresh = () => api("notifications").then((items) => { if (active && Array.isArray(items)) setNotificationCount(items.filter((item) => !item.read).length); }).catch(() => {}); refresh(); const timer = setInterval(refresh, 30000); return () => { active = false; clearInterval(timer); }; }, [autoRecovery]);
  return (
    <div className={"admin-fullscreen traveler-shell " + (open ? "nav-open" : "")}>
      {open && (
        <button
          className="admin-nav-scrim"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <TravelerSidebar user={user} page={page} logout={logout} onError={setError} onClose={() => setOpen(false)} />
      <main className="admin-main">
        <header className={`admin-topbar${autoRecovery ? " auto-recovery-topbar" : ""}`}>
          <div>
            <button
              className="admin-mobile-menu icon-button"
              aria-label="Open navigation"
              onClick={() => setOpen(true)}
            >
              <Menu size={21} />
            </button>
            {autoRecovery && <a className="recovery-top-brand" href="/dashboard"><span><Plane size={20} fill="currentColor" /></span><b>waypoint<small>TRAVEL CONSOLE</small></b></a>}
            <form className={`trips-global-search ${autoRecovery || searchOpen ? "search-open" : ""}`} action="/trips" onSubmit={(event) => { if (!autoRecovery && !searchOpen) { event.preventDefault(); setSearchOpen(true); } }}><button type="button" aria-label="Search" onClick={() => { if (!autoRecovery) setSearchOpen(!searchOpen); }}><Search size={17} /></button>{(autoRecovery || searchOpen) && <input name="search" aria-label="Search destinations, hotels, activities" placeholder="Search destinations, hotels, activities…" />}</form>
          </div>
          {autoRecovery && <div className="recovery-top-account"><a href="/notifications" className="recovery-top-notification" aria-label="Notifications"><Bell size={19}/>{notificationCount > 0 && <i>{notificationCount > 99 ? "99+" : notificationCount}</i>}</a><a href="/account" className="recovery-top-avatar">{initials(user.name)}</a><a href="/account" className="recovery-top-user"><b>{user.name}</b><small>Traveler</small></a><ChevronDown size={15}/></div>}
        </header>
        <div className="admin-content">
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {children}
          <div className="admin-bottomline">
            <span>Waypoint Travel</span>
            <span>Local edition · Supplier actions are simulated</span>
          </div>
        </div>
      </main>
    </div>
  );
}
export function TripList({ user }) {
  const [trips, setTrips] = useState([]),
    [error, setError] = useState(""),
    [show, setShow] = useState(false),
    [filter, setFilter] = useState("active"),
    [search, setSearch] = useState(() => new URLSearchParams(window.location.search).get("search") || ""),
    [featuredDetails, setFeaturedDetails] = useState(null);
  useEffect(() => {
    api("trips")
      .then(setTrips)
      .catch((e) => setError(e.message));
  }, []);
  const remove = async (t) => {
    if (
      !window.confirm(
        `Delete “${t.name}”? This removes the trip and its bookings for good.`,
      )
    )
      return;
    try {
      await api("trips/" + t.id, {}, "DELETE");
      setTrips((list) => list.filter((x) => x.id !== t.id));
    } catch (e) {
      setError(e.message);
    }
  };
  const visible = trips
    .filter(
      (t) =>
        (filter === "all" || (filter === "archived" ? t.archived : filter === "upcoming" ? !t.archived && t.daysUntil >= 0 : !t.archived)) &&
        (t.name + " " + t.destination)
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a, b) =>
      (attentionRank[a.riskLevel] ?? 3) - (attentionRank[b.riskLevel] ?? 3) ||
      Date.parse(a.start) - Date.parse(b.start),
    );
  const featured = visible[0];
  useEffect(() => {
    setFeaturedDetails(null);
    if (featured) api(`trips/${featured.id}/state`).then(setFeaturedDetails).catch(() => {});
  }, [featured?.id]);
  const featuredBookings = featuredDetails?.trip?.trip?.bookings || featuredDetails?.trip?.bookings || [];
  const bookingCount = (type) => featuredBookings.filter((booking) => booking.type === type).length;
  return (
    <>
      {error && <div className="error">{error}</div>}
      {show && (
        <div className="card editor-card">
          <h2>A new adventure.</h2>
          <TripForm
            onSave={async (v) => {
              const t = await api("trips", v);
              go("trip/" + t.id);
            }}
          />
        </div>
      )}
      <div className="trip-toolbar">
        <div className="tabs">
          {["active", "upcoming", "archived", "all"].map((x) => (
            <button
              className={filter === x ? "selected" : ""}
              onClick={() => setFilter(x)}
              key={x}
            >
              {x[0].toUpperCase() + x.slice(1)} ({x === "all" ? trips.length : x === "archived" ? trips.filter((trip) => trip.archived).length : x === "upcoming" ? trips.filter((trip) => !trip.archived && trip.daysUntil >= 0).length : trips.filter((trip) => !trip.archived).length})
            </button>
          ))}
        </div>
        <input
          aria-label="Search trips"
          placeholder="Search your trips…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="button primary trips-plan-button" onClick={() => setShow(!show)}>
          <Plus size={16} /> Plan a new trip
        </button>
      </div>
      <div className="trips-page-columns">
      <div className="trips-primary-column">
      {featured && <article className="trips-featured-card">
        <div className="trips-featured-photo"><RotatingCityPhoto city={featured.destination} alt={`${featured.destination} travel inspiration`} />
          <span className={`trips-featured-status ${featured.cancelled ? "cancel" : risk[featured.riskLevel]?.tone || ""}`}>{featured.cancelled || featured.disruptions ? <TriangleAlert size={14}/> : <Clock size={14}/>} {featured.cancelled ? "Trip cancelled" : featured.disruptions ? "Disruption active" : featured.warnings ? "Tight connection" : risk[featured.riskLevel]?.label || "Ready to explore"}{featured.disruptions > 1 ? ` · ${featured.disruptions}` : ""}</span>
          <button className="trips-featured-menu" aria-label={`Delete ${featured.name}`} title="Delete trip" onClick={() => remove(featured)}><MoreHorizontal size={20}/></button>
          <a className="trips-featured-title" href={`/trip/${featured.id}/overview`}><h2>{featured.name}</h2><span><CalendarDays size={14}/>{new Date(`${featured.start}T12:00:00`).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})} – {new Date(`${featured.end}T12:00:00`).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}</span><span><MapPin size={14}/>{featured.destination}</span></a>
          <span className="trips-featured-weather"><span>☀️</span><b>Trip forecast</b><small>Check closer to departure</small></span>
        </div>
        <div className="trips-featured-summary"><div><span><Route size={17}/></span><b>{featured.bookings}</b><small>Bookings</small></div><div><span><Users size={17}/></span><b>{featured.travelers}</b><small>Travelers</small></div><div><span><Wallet size={17}/></span><b>{money(featured.value)}</b><small>Total value</small></div><a href={`/trip/${featured.id}/recovery`}><span><TriangleAlert size={17}/></span><b>{featured.warnings + featured.disruptions || "All clear"}</b><small>{featured.warnings || featured.disruptions ? "Needs attention" : `${money(featured.refundable)} refundable`}</small><ArrowRight size={16}/></a></div>
        <div className="trips-featured-actions"><a href={`/trip/${featured.id}/overview`}><CalendarDays size={16}/> View trip</a><a href={`/trip/${featured.id}/overview`}><Plane size={16}/> Flight details</a><a href={`/trip/${featured.id}/overview`}><Hotel size={16}/> Hotel details</a><a href={`/trip/${featured.id}/overview`}><CarFront size={16}/> Transport</a><a href={`/trip/${featured.id}/overview`}><Camera size={16}/> Activities</a></div>
      </article>}
      <div className="trips-more-heading"><h2>More Trips</h2><span>{Math.max(0, visible.length - 1)} journeys</span></div>
      <div className="trip-grid">
        {visible.slice(1).map((t, i) => (
          <div className="trip-tile-wrap" key={t.id}>
          <a
            href={"/trip/" + t.id}
            className={"trip-tile card risk-" + (t.riskLevel || "low")}
          >
            <div className={"trip-tile-art art-" + (i % 3)}>
              <RotatingCityPhoto city={t.destination} alt={`${t.destination} travel`} />
              <span className={`tag ${t.cancelled ? "cancel" : risk[t.riskLevel]?.tone || ""}`}>
                {t.cancelled ? "Trip cancelled" : risk[t.riskLevel]?.label || "Ready to explore"}
              </span>
              <span>{t.destination || "Journey"}</span>
            </div>
            <div>
              <h2>{t.name}</h2>
              <p>
                <CalendarDays size={13} />
                {t.start} → {t.end}
              </p>
              <div className="trip-tile-stats">
                <span>
                  <Route size={13} />
                  {t.bookings} bookings
                </span>
                <span>
                  <Users size={13} />
                  {t.travelers}
                </span>
                <span>
                  <Wallet size={13} />
                  {money(t.value)}
                </span>
              </div>
              {!t.archived &&
                (t.disruptions ? (
                  <div className="trip-tile-risk">
                    <TriangleAlert size={13} />
                    {t.disruptions} active disruption
                    {t.disruptions === 1 ? "" : "s"} · {t.affected} booking
                    {t.affected === 1 ? "" : "s"} affected
                  </div>
                ) : t.warnings ? (
                  <div className="trip-tile-risk quiet">
                    <Clock size={13} />
                    {t.warnings} connection warning
                    {t.warnings === 1 ? "" : "s"} · {money(t.refundable)}{" "}
                    refundable
                  </div>
                ) : t.next ? (
                  <div className="trip-tile-risk quiet">
                    <Clock size={13} />
                    Next: {t.next.title} · in {t.next.minutesUntil} min
                  </div>
                ) : null)}
              <div className="trip-tile-foot">
                <span>{departure(t)}</span>
                <ArrowRight size={17} />
              </div>
            </div>
          </a>
          <button
            className="trip-delete"
            title="Delete trip"
            aria-label={`Delete ${t.name}`}
            onClick={() => remove(t)}
          >
            <Trash2 size={15} />
          </button>
          </div>
        ))}
        {!visible.length && (
          <div className="empty trip-empty">
            <Route size={32} />
            <h2>No trips to show.</h2>
            <p>
              Adjust the filter or search, or plan a brand new journey.
            </p>
          </div>
        )}
        {!search && filter !== "archived" && (
        <button
          className="sample-tile"
          onClick={async () => {
            try {
              const t = await api("trips/sample", {});
              go("trip/" + t.id);
            } catch (e) {
              setError(e.message);
            }
          }}
        >
          <Compass size={35} />
          <h3>Take Waypoint for a spin.</h3>
          <p>
            Add a complete Jaipur sample trip with connected bookings and
            recovery inventory.
          </p>
          <span>
            Explore a sample journey <ArrowRight size={14} />
          </span>
        </button>
        )}
      </div>
      </div>
      <aside className="trips-side-column">
        {featured && <>
          <section className="trips-glance-card"><header className="trips-health-heading"><h2>Trip Health &amp; Recovery</h2><span><i/> Monitoring</span></header><div className="trips-glance-body"><div className="trips-glance-score"><div className="trips-score-ring" style={{"--score":`${Math.min(100,Math.round((Math.min(bookingCount("flight"),2)+Math.min(bookingCount("hotel"),2)+Math.min(bookingCount("transfer"),1)+Math.min(bookingCount("activity"),2))/7*100))}%`}}><b>{Math.min(100,Math.round((Math.min(bookingCount("flight"),2)+Math.min(bookingCount("hotel"),2)+Math.min(bookingCount("transfer"),1)+Math.min(bookingCount("activity"),2))/7*100))}%</b></div><b>{featured.warnings || featured.disruptions ? "Needs a review" : "On track"}</b><small>{featured.bookings ? "Progress across your bookings" : "Add bookings to build readiness"}</small></div><div className="trips-glance-list">{[[Plane,"Flights",bookingCount("flight"),2,"blue"],[Hotel,"Hotels",bookingCount("hotel"),2,"purple"],[CarFront,"Transport",bookingCount("transfer"),1,"orange"],[Camera,"Activities",bookingCount("activity"),2,"gold"],[CheckCircle2,"Travel documents",0,0,"green"]].map(([Icon,label,count,target,tone])=><div className="trips-glance-item" key={label}><span className={tone}><Icon size={15}/></span><label>{label}</label><b>{target ? `${count}/${target}` : "Add"}</b>{count >= target && target > 0 ? <CheckCircle2 className="ok" size={14}/> : <span className="todo-dot"/>}</div>)}</div></div></section>
          {(featured.warnings > 0 || featured.disruptions > 0) && <a className={`trips-warning-card ${featured.disruptions ? "disrupted" : "warning"}`} href={`/trip/${featured.id}/recovery`}><span><TriangleAlert size={20}/></span><div><b>{featured.disruptions ? `${featured.disruptions} disruption${featured.disruptions===1?"":"s"} may affect your plans` : "Connection needs a little more room"}</b><p>{featured.disruptions ? `${featured.affected || featured.disruptions} booking${(featured.affected || featured.disruptions)===1?"":"s"} may need an update. Your other plans stay protected.` : featuredDetails?.warnings?.[0]?.message || "Review this connection before you travel."}</p><small>Open Recovery Center <ArrowRight size={12}/></small></div><ArrowRight size={16}/></a>}
          <div className="trips-health-metrics"><a href={`/trip/${featured.id}/recovery`}><span><Wallet size={18}/></span><div><small>Refund exposure</small><b>{money(Math.max(0,featured.value-featured.refundable))}</b><small>Based on saved policies</small></div><ArrowRight size={15}/></a><a href={`/trip/${featured.id}/recovery`}><span className="violet"><ShieldCheck size={18}/></span><div><small>Affected items</small><b>{featured.affected || 0} bookings</b><small>{featured.warnings || featured.disruptions ? "Review suggested" : "No active recovery"}</small></div><ArrowRight size={15}/></a></div>
          <section className="trips-itinerary-card"><header><h2>Upcoming Itinerary</h2><a href={`/trip/${featured.id}/overview`}>View all <ArrowRight size={13}/></a></header>{featuredBookings.length ? featuredBookings.slice().sort((a,b)=>Date.parse(a.start||0)-Date.parse(b.start||0)).slice(0,5).map((booking,i)=>{const Icon=booking.type==="flight"||booking.type==="train"?Plane:booking.type==="hotel"?Hotel:booking.type==="transfer"?CarFront:Camera;return <div className="trips-itinerary-item" key={booking.id||i}><span className="trips-itinerary-icon"><Icon size={15}/></span><div><small>{booking.start?new Date(booking.start).toLocaleString("en-IN",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}):`Trip item ${i+1}`}</small><b>{booking.title||booking.name||booking.type}</b><small>{booking.provider||booking.location||featured.destination}</small></div><span className="trips-confirmed">Saved</span></div>}) : <div className="trips-itinerary-empty"><CalendarDays size={21}/><b>Your itinerary is ready to grow</b><p>Add flights, stays, and activities to see them here.</p><a href={`/trip/${featured.id}/overview`}>Open trip <ArrowRight size={12}/></a></div>}</section>
        </>}
        <button className="trips-sample-prompt" onClick={async()=>{try{const t=await api("trips/sample",{});go("trip/"+t.id)}catch(e){setError(e.message)}}}><Sparkles size={18}/><span><b>Need inspiration?</b><small>Open a complete sample Jaipur journey.</small></span><ArrowUpRight size={16}/></button>
      </aside>
      </div>
    </>
  );
}
export function TripForm({ trip = {}, onSave }) {
  return (
    <Form onSubmit={(v) => onSave({ ...v, travelers: Number(v.travelers) })}>
      <div className="form-grid">
        <label>
          Trip name
          <input
            name="name"
            defaultValue={trip.name}
            required
            maxLength={200}
            placeholder="A week by the coast"
          />
        </label>
        <label>
          Destination
          <input
            name="destination"
            defaultValue={trip.destination}
            required
            placeholder="Goa, India"
          />
        </label>
        <label>
          Start date
          <input type="date" name="start" defaultValue={trip.start} required />
        </label>
        <label>
          End date
          <input type="date" name="end" defaultValue={trip.end} required />
        </label>
        <label>
          Travelers
          <input
            type="number"
            name="travelers"
            min={1}
            max={20}
            defaultValue={trip.travelers || 1}
            required
          />
        </label>
        <label>
          A little about this trip
          <input
            name="subtitle"
            defaultValue={trip.subtitle || ""}
            maxLength={300}
            placeholder="Slow mornings and sunset walks"
          />
        </label>
      </div>
    </Form>
  );
}
export function BookingEditor({ data, booking, offer = false, onSave }) {
  const [type, setType] = useState(booking?.type || "flight"),
    [deps, setDeps] = useState(booking?.dependencies || []);
  const b = booking || {};
  return (
    <div>
      <span className="eyebrow">
        {offer ? "REPLACEMENT INVENTORY" : "YOUR CONNECTED ITINERARY"}
      </span>
      <h2>
        {offer
          ? "Add an alternative"
          : booking
            ? "Edit booking"
            : "Add a booking"}
      </h2>
      <p>Times are entered in IST. Prices are totals for the travel party.</p>
      <Form
        onSubmit={(v) =>
          onSave({
            ...v,
            id: b.id || "new",
            type,
            start: iso(v.start),
            end: iso(v.end),
            refundDeadline: iso(v.refundDeadline),
            price: Number(v.price),
            refund: Number(v.refund) / 100,
            dependencies: deps,
            status: b.status || "confirmed",
            ...(offer
              ? {
                  bookingId: b.id,
                  seats: Number(v.seats),
                  accessible: v.accessible === "on",
                }
              : {}),
          })
        }
      >
        <div className="form-grid">
          <label>
            Booking type
            <select value={type} onChange={(e) => setType(e.target.value)}>
              {[
                "flight",
                "train",
                "transfer",
                "hotel",
                "activity",
                "event",
              ].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label>
            Booking title
            <input
              name="title"
              defaultValue={b.title}
              required
              maxLength={200}
            />
          </label>
          <label>
            Provider
            <input name="provider" defaultValue={b.provider || ""} required />
          </label>
          <label>
            Confirmation reference
            <input name="reference" defaultValue={b.reference || ""} required />
          </label>
          <label>
            Starts (IST)
            <input
              name="start"
              type="datetime-local"
              defaultValue={
                b.start ? localDate(b.start) : data.trip.start + "T09:00"
              }
              required
            />
          </label>
          <label>
            Ends (IST)
            <input
              name="end"
              type="datetime-local"
              defaultValue={
                b.end ? localDate(b.end) : data.trip.start + "T10:00"
              }
              required
            />
          </label>
          <label>
            From location code
            <input
              name="from"
              defaultValue={b.from || ""}
              required
              placeholder="DEL or Jaipur"
            />
          </label>
          <label>
            To location code
            <input
              name="to"
              defaultValue={b.to || ""}
              required
              placeholder="JAI or Jaipur"
            />
          </label>
          <label>
            Party price (INR)
            <input
              name="price"
              type="number"
              defaultValue={b.price || 0}
              min={0}
              max={10000000}
              required
            />
          </label>
          <label>
            Refund before deadline (%)
            <input
              name="refund"
              type="number"
              defaultValue={(b.refund || 0) * 100}
              min={0}
              max={100}
              required
            />
          </label>
          <label>
            Refund deadline (IST)
            <input
              name="refundDeadline"
              type="datetime-local"
              defaultValue={
                b.refundDeadline
                  ? localDate(b.refundDeadline)
                  : data.trip.start + "T00:00"
              }
              required
            />
          </label>
          {offer && (
            <>
              <label>
                Available seats
                <input
                  name="seats"
                  type="number"
                  min={0}
                  max={100}
                  defaultValue={data.trip.travelers + 2}
                  required
                />
              </label>
              <label className="checkbox">
                <input type="checkbox" name="accessible" defaultChecked />
                Accessible option
              </label>
            </>
          )}
        </div>
        {!offer && (
          <fieldset className="dependencies">
            <legend>Depends on these bookings</legend>
            <p>
              Link earlier bookings and specify the minimum time required after
              each one. Matching location codes are required.
            </p>
            {data.trip.bookings
              .filter((x) => x.id !== b.id)
              .map((x) => (
                <div key={x.id}>
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={deps.some((d) => d.id === x.id)}
                      onChange={(e) =>
                        setDeps(
                          e.target.checked
                            ? [...deps, { id: x.id, buffer: 30 }]
                            : deps.filter((d) => d.id !== x.id),
                        )
                      }
                    />
                    {x.title}
                  </label>
                  {deps.some((d) => d.id === x.id) && (
                    <label className="buffer-field">
                      Buffer (min)
                      <input
                        type="number"
                        min={0}
                        max={10080}
                        value={deps.find((d) => d.id === x.id).buffer}
                        onChange={(e) =>
                          setDeps(
                            deps.map((d) =>
                              d.id === x.id
                                ? { ...d, buffer: Number(e.target.value) }
                                : d,
                            ),
                          )
                        }
                      />
                    </label>
                  )}
                </div>
              ))}
          </fieldset>
        )}
        {type === "hotel" && (
          <p className="notice">
            A hotel booking models the check-in appointment window. Enter its
            completion time, rather than the final checkout date, so later
            activities can follow it.
          </p>
        )}
      </Form>
    </div>
  );
}
export function Inventory({ data, request, open }) {
  return (
    <section className="card editor-card">
      <div className="section-title">
        <div>
          <h2>Replacement inventory</h2>
          <p>Manage the alternatives the engine can actually choose.</p>
        </div>
        <button className="button" onClick={() => open({ type: "generate" })}>
          Generate demo inventory
        </button>
      </div>
      <p className="notice">
        All offers are local estimates. Generating demo inventory replaces this
        trip’s current offers with five later options per booking.
      </p>
      {data.trip.bookings.map((b) => (
        <div className="inventory-group" key={b.id}>
          <div className="row-between">
            <h3>{b.title}</h3>
            <button
              className="button"
              onClick={() => open({ type: "offer", b })}
            >
              <Plus size={14} />
              Add alternative
            </button>
          </div>
          {data.offers
            .filter((o) => o.bookingId === b.id)
            .map((o) => (
              <div className="inventory-row" key={o.id}>
                <div>
                  <b>{o.provider}</b>
                  <p>
                    {new Date(o.start).toLocaleString("en-IN", {
                      timeZone: "Asia/Kolkata",
                    })}{" "}
                    IST · {o.seats} seats ·{" "}
                    {o.accessible ? "Accessible" : "Standard"}
                  </p>
                </div>
                <strong>₹{o.price.toLocaleString("en-IN")}</strong>
                <button
                  className="icon-button"
                  aria-label={"Remove " + o.provider}
                  onClick={() => open({ type: "removeOffer", o })}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
        </div>
      ))}
      {!data.trip.bookings.length && (
        <p className="empty">Add bookings before creating alternatives.</p>
      )}
    </section>
  );
}
export function TripSettings({ data, request, onSaved, onDuplicate }) {
  return (
    <div className="settings-grid">
      <section className="card editor-card">
        <h2>Trip details</h2>
        <TripForm
          trip={data.trip}
          onSave={async (v) => {
            if (!(await request("", v, "PUT")))
              throw Error("Unable to save trip. Check the values.");
          }}
        />
        <button
          className="button"
          onClick={() =>
            request("", { ...data.trip, archived: !data.archived }, "PUT")
          }
        >
          {data.archived ? "Restore trip from archive" : "Archive this trip"}
        </button>
        {onDuplicate && (
          <button className="button" onClick={() => onDuplicate()}>
            Duplicate this trip as a template
          </button>
        )}
      </section>
      <section className="card editor-card">
        <h2>Simulation clock</h2>
        <p>
          Policy eligibility and alternative departure checks use this time.
        </p>
        <Form
          onSubmit={async (v) => {
            if (!(await request("clock", { clock: iso(v.clock) }, "PUT")))
              throw Error("Unable to update clock");
          }}
        >
          <label>
            Current trip time (IST)
            <input
              name="clock"
              type="datetime-local"
              defaultValue={localDate(data.clock)}
              required
            />
          </label>
        </Form>
        <hr />
        <h2>Take your plans with you</h2>
        <div className="button-row">
          <a className="button" href={`/api/trips/${data.trip.id}/export`}>
            <Download size={14} />
            JSON
          </a>
          <a className="button" href={`/api/trips/${data.trip.id}/calendar`}>
            <CalendarDays size={14} />
            Calendar .ics
          </a>
          <button className="button" onClick={() => window.print()}>
            Print itinerary
          </button>
        </div>
      </section>
    </div>
  );
}
const weatherLabel = (code = 0) => code === 0 ? "Clear sky" : code <= 3 ? "Partly cloudy" : code <= 48 ? "Foggy" : code <= 67 ? "Rain" : code <= 77 ? "Snow" : code <= 82 ? "Showers" : code <= 86 ? "Snow showers" : "Thunderstorms";
const weatherIcon = (code = 0) => code === 0 ? Sun : code <= 3 ? CloudSun : CloudRain;
const weatherTime = (value, opts = { hour: "numeric", hour12: true }) => new Date(value).toLocaleString("en-IN", { ...opts, timeZone: "Asia/Kolkata" });

export function TripWeather({ tripId, data, onNavigate }) {
  const [weather, setWeather] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState(""), [overlay, setOverlay] = useState("rain"), [prompt, setPrompt] = useState(""), [chat, setChat] = useState([]), [sending, setSending] = useState(false);
  const trip = data?.trip || {}, city = (trip.destination || "Jaipur").split(",")[0].trim(), bookings = trip.bookings || [];
  const loadWeather = async () => { setLoading(true); setError(""); try { setWeather(await api(`trips/${tripId}/weather`)); } catch (e) { setError(e.message); } finally { setLoading(false); } };
  useEffect(() => { loadWeather(); const timer = setInterval(loadWeather, 300000); return () => clearInterval(timer); }, [tripId]);
  const current = weather?.current, units = current?.units || {}, description = weatherLabel(current?.weather_code), WeatherIcon = weatherIcon(current?.weather_code);
  const now = Date.now(), forecastHours = (weather?.hourly || []).filter((h) => Date.parse(h.time) >= now), hours = forecastHours.slice(0, 7), upcoming = bookings.filter((b) => Date.parse(b.end) >= now).sort((a, b) => Date.parse(a.start) - Date.parse(b.start)).slice(0, 3);
  const rainRisk = forecastHours.slice(0, 24).some((h) => Number(h.precipitation_probability) >= 60), outdoors = bookings.filter((b) => /activity|event/i.test(b.type)), transport = bookings.filter((b) => /flight|train|transfer/i.test(b.type));
  const affectedOutdoor = outdoors.some((booking) => { const start = Date.parse(booking.start); const nearest = forecastHours.find((h) => Math.abs(Date.parse(h.time) - start) < 60 * 60 * 1000); return nearest && Number(nearest.precipitation_probability) >= 60; });
  const windyOverlay = overlay === "radar" ? "rain" : overlay;
  const mapSrc = weather?.coordinates ? `https://embed.windy.com/embed2.html?lat=${weather.coordinates.latitude}&lon=${weather.coordinates.longitude}&detailLat=${weather.coordinates.latitude}&detailLon=${weather.coordinates.longitude}&width=100%25&height=100%25&zoom=8&level=surface&overlay=${windyOverlay}&product=ecmwf&menu=&message=true&marker=true&calendar=now&pressure=true&type=map&location=coordinates&detail=true&metricRain=mm&metricTemp=%C2%B0C` : "";
  const tabs = [["weather", "Weather"], ["insights", "Travel impact"], ["recovery", "Recovery options"], ["overview", "Itinerary"], ["overview", "Bookings"], ["assistant", "Assistant"]];
  const ask = async (text = prompt) => { const message = String(text).trim(); if (!message || sending) return; setPrompt(""); setChat((items) => [...items, { by: "you", text: message }]); setSending(true); try { const answer = await api(`trips/${tripId}/assistant`, { message }); setChat((items) => [...items, { by: "assistant", text: answer.answer }]); } catch (e) { setChat((items) => [...items, { by: "assistant", text: e.message }]); } finally { setSending(false); } };
  return <main className="trip-weather-page">
    <nav className="weather-trip-tabs" aria-label="Trip workspace"><span>{trip.name || `${city} trip`}</span>{tabs.map(([slug, label], i) => <button key={`${slug}-${label}`} className={i === 0 ? "active" : ""} onClick={() => onNavigate?.(slug)}>{i === 0 ? <CloudRain/> : null}{label}</button>)}</nav>
    <div className="weather-columns"><div className="weather-main-column">
      <section className="weather-now-card" style={{ backgroundImage: `linear-gradient(90deg,#102947d9 0%,#1029479c 48%,#1029473d),url('${destinationPhoto(city)}')` }}>
        <div className="weather-live-line"><b>{weather?.city || city}{weather?.region ? `, ${weather.region}` : ""}</b><span>● Live</span><small>{current ? `Updated ${Math.max(0, Math.floor((Date.now() - Date.parse(weather.fetchedAt)) / 60000))} min ago` : loading ? "Getting current conditions…" : "Forecast status"}</small></div>
        <button className="weather-alert-link" onClick={() => ask(`How will the forecast affect my outdoor activities and transport in ${city}?`)}><Droplets/> {rainRisk ? "Rain expected in the forecast" : "Check forecast against my trip"}<ArrowRight/></button>
        <div className="weather-condition"><WeatherIcon size={62}/><div><strong>{current ? `${Math.round(current.temperature_2m)}°C` : loading ? "—" : "Unavailable"}</strong><b>{description}</b><small>Feels like {current?.apparent_temperature ?? "—"}°C <i/> H: {weather?.daily?.[0]?.temperature_2m_max ?? "—"}° L: {weather?.daily?.[0]?.temperature_2m_min ?? "—"}°</small></div></div>
        <div className="weather-stats"><span><Droplets/><b>{current?.relative_humidity_2m ?? "—"}%</b><small>Humidity</small></span><span><Wind/><b>{current?.wind_speed_10m ?? "—"} km/h</b><small>Wind</small></span><span><Leaf/><b>{current?.uv_index ?? "—"} UV</b><small>UV index</small></span><span><Sun/><b>{weather?.daily?.[0]?.uv_index_max ?? "—"} max</b><small>Today</small></span><span><Eye/><b>{current?.visibility != null ? `${(current.visibility / 1000).toFixed(0)} km` : "—"}</b><small>Visibility</small></span></div>
      </section>
      {error && <div className="weather-error" role="status">{error}. Showing trip details while live data reconnects. <button onClick={loadWeather}>Retry</button></div>}
      {weather?.warnings?.map((warning) => <div className="weather-error" key={warning}>{warning}</div>)}
      <div className="weather-forecast-map"><section className="weather-hourly-card"><div className="weather-section-title"><div><h2>Next hours</h2><p>Hourly forecast for {weather?.city || city}</p></div><button onClick={loadWeather} title="Refresh forecast"><RefreshCw size={16}/></button></div><div className="weather-hourly-list">{hours.length ? hours.map((hour, i) => { const Icon = weatherIcon(hour.weather_code); return <article key={hour.time}><small>{i === 0 ? "Now" : weatherTime(hour.time)}</small><Icon/><b>{Math.round(hour.temperature_2m)}°</b><span><Droplets size={12}/> {hour.precipitation_probability ?? 0}%</span></article>; }) : <p className="weather-empty">{loading ? "Loading the live hourly forecast…" : "Hourly forecast is not available for this date."}</p>}</div><div className="weather-trip-impact"><h3>Weather impact on your trip</h3><div><article><Plane/><b>Flights & transfers</b><span className={rainRisk ? "warn" : "good"}>{rainRisk ? "Check local conditions" : "No major weather signal"}</span><small>{transport.length} scheduled transport item(s)</small></article><article><Building2/><b>Hotel stays</b><span className="good">No direct impact</span><small>Keep your existing check-in plan</small></article><article><Camera/><b>Outdoor activities</b><span className={affectedOutdoor ? "warn" : "good"}>{affectedOutdoor ? "Rain near activity time" : "No rain signal at forecast times"}</span><small>{outdoors.length} itinerary activity/event(s), forecast up to 7 days</small></article></div></div></section>
        <section className="weather-map-card"><div className="weather-section-title"><div><h2>Live weather map</h2><p>{weather?.city || city} and nearby</p></div><a href={weather?.coordinates ? `https://www.google.com/maps/@${weather.coordinates.latitude},${weather.coordinates.longitude},10z` : `https://www.google.com/maps/search/${encodeURIComponent(city)}`} target="_blank" rel="noreferrer">Open map <ExternalLink size={13}/></a></div><div className="weather-map-frame">{mapSrc ? <iframe title={`${city} live weather map`} src={mapSrc} loading="lazy" allowFullScreen/> : <div className="weather-map-fallback"><MapPin/><b>{city}</b><small>{loading ? "Loading map location…" : "Map location unavailable"}</small></div>}<div className="weather-map-controls">{["rain", "wind", "clouds"].map((layer) => <button key={layer} className={overlay === layer ? "active" : ""} onClick={() => setOverlay(layer)}>{layer[0].toUpperCase() + layer.slice(1)}</button>)}</div></div><small className="weather-attribution">Map and forecast layer by Windy · Forecast data: Open-Meteo</small></section></div>
      <section className="weather-news-card"><div className="weather-section-title"><div><h2><Newspaper/> Recent area news</h2><p>Recent coverage for {weather?.city || city}{weather?.region ? ` and ${weather.region}` : ""}. Check the source before acting on developing reports.</p></div><span>{weather?.news?.length ? "Live headlines" : loading ? "Loading" : "No headlines"}</span></div>{weather?.news?.length ? <div className="weather-news-list">{weather.news.map((item, i) => <a href={item.url} key={item.url || i} target="_blank" rel="noreferrer"><span>{i + 1}</span><div><b>{item.title}</b><small>{item.source} · {item.publishedAt ? new Date(item.publishedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "Recent"}</small></div><ExternalLink size={14}/></a>)}</div> : <p className="weather-empty">Area headlines will appear when the live news feed responds.</p>}</section>
      <section className="weather-ask-card"><div className="weather-section-title"><div><h2><Sparkles/> Ask Waypoint <span>● Trip-aware</span></h2><p>Ask how conditions affect your flights, transfers, hotel or activities.</p></div></div><div className="weather-suggestions">{[`Will rain affect my plans in ${city}?`, "Should I move an outdoor activity indoors?", "What should I pack for this forecast?", "Any weather news nearby?"] .map((s) => <button key={s} onClick={() => ask(s)}>{s}</button>)}</div>{chat.length > 0 && <div className="weather-chat" aria-live="polite">{chat.slice(-6).map((m, i) => <p className={m.by} key={i}><b>{m.by === "you" ? "You" : "Waypoint AI"}</b>{m.text}</p>)}</div>}<form onSubmit={(e) => { e.preventDefault(); ask(); }}><input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Ask about weather, travel impact, or your trip…" aria-label="Ask about weather or trip"/><button aria-label="Send question" disabled={sending || !prompt.trim()}><Send size={17}/></button></form></section>
    </div><aside className="weather-side-column"><section className="weather-side-card current-trip-weather"><div className="weather-section-title"><h2>Current trip</h2><button onClick={() => onNavigate?.("overview")}>Edit trip</button></div><div><img src={destinationPhoto(city)} alt=""/><span><b>{trip.name || `${city} trip`}</b><small>{trip.start} – {trip.end}</small><small>{trip.travelers || 1} traveler · {bookings.length} bookings · {money(data?.insights?.value || 0)}</small></span></div></section><section className="weather-side-card"><div className="weather-section-title"><h2><CircleAlert/> Trip weather alerts</h2><button onClick={() => onNavigate?.("recovery")}>Recovery options <ArrowRight size={13}/></button></div><div className={`weather-impact-alert ${affectedOutdoor ? "alert" : "calm"}`}><WeatherIcon/><span><b>{affectedOutdoor ? "Rain may affect an outdoor plan" : weather?.current ? "No rain signal at activity time" : "Waiting for live conditions"}</b><small>{affectedOutdoor ? "Review the activity with a matching forecast and consider an indoor alternative." : "Check again closer to each activity and departure."}</small></span></div></section><section className="weather-side-card"><div className="weather-section-title"><h2>Next 3 itinerary items</h2><button onClick={() => onNavigate?.("overview")}>Full itinerary <ArrowRight size={13}/></button></div>{upcoming.length ? upcoming.map((b) => <article className="weather-next-item" key={b.id}><span>{b.type === "flight" ? <Plane/> : /hotel/i.test(b.type) ? <Building2/> : /transfer|train/i.test(b.type) ? <BusFront/> : <Camera/>}</span><div><small>{weatherTime(b.start, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true })}</small><b>{b.title}</b><small>{b.provider}</small></div><em>{rainRisk && /transfer|activity|event/i.test(b.type) ? "Watch" : "Planned"}</em></article>) : <p className="weather-empty">No upcoming trip items.</p>}</section><section className="weather-side-card weather-advice"><h2><Sparkles/> AI suggestions</h2><p>Based on current conditions and the trip details you've saved.</p><button onClick={() => ask("Should I visit my outdoor activities in " + city + " given the latest weather and nearby news?")}><Umbrella/> Check outdoor plans <ArrowRight/></button><button onClick={() => ask("What weather buffer should I allow for my upcoming transport?")}><BusFront/> Keep a travel buffer <ArrowRight/></button></section><section className="weather-side-card weather-news-source"><b>Data sources</b><p>Forecast from Open-Meteo. Area headlines from GDELT. Map layers from Windy. Forecasts and headlines can change.</p></section></aside></div>
  </main>;
}

export function Assistant({ tripId, data, onState, onAddBooking, onOpenRecovery, onOpenItinerary }) {
  const [messages, setMessages] = useState([]), [busy, setBusy] = useState(false), [draft, setDraft] = useState(""), [error, setError] = useState("");
  const threadRef = useRef(null);
  const bookings = data?.trip?.bookings || [], trip = data?.trip || {}, info = data?.insights || {};
  const destination = (trip.destination || "Jaipur").split(",")[0];
  const activeDisruption = data?.disruptions?.[0];
  const quickPrompts = ["Change my flight", "Change my hotel", "Find a transfer", "Replace a restaurant", "Rebuild my trip", "Check refunds", "Add something new", "View my itinerary"];
  useEffect(() => { const thread = threadRef.current; if (thread) thread.scrollTop = thread.scrollHeight; }, [messages, busy]);
  const send = async (text = draft, action, confirm = false) => {
    const message = String(text || "").trim(); if (!message || busy) return;
    setDraft(""); setError(""); setMessages((items) => [...items, { by: "you", text: message }]); setBusy(true);
    try {
      const result = await api(`trips/${tripId}/assistant`, { message, ...(action ? { action, confirm } : {}) });
      if (result.state) onState?.(result.state);
      setMessages((items) => [...items, { by: "assistant", text: result.answer, proposal: result.proposal || null, plans: result.plans || [], message }]);
    } catch (e) { setError(e.message); setMessages((items) => [...items, { by: "assistant", text: e.message }]); }
    finally { setBusy(false); }
  };
  const runPrompt = (text) => {
    if (/add something new/i.test(text)) { onAddBooking?.(); return; }
    if (/view my itinerary/i.test(text)) { onOpenItinerary?.(); return; }
    if (/rebuild my trip/i.test(text)) { onOpenRecovery?.(); return; }
    if (/check refunds/i.test(text)) { send("How much is refundable and what does each booking policy say?"); return; }
    const category = /flight/i.test(text) ? "flight" : /hotel/i.test(text) ? "hotel" : /transfer/i.test(text) ? "transfer" : /restaurant/i.test(text) ? "restaurant" : "booking";
    send(category === "restaurant" ? "I need to replace my restaurant booking" : `I want to replace my ${category} booking`);
  };
  return <section className="trip-assistant-page">
    <header className="assistant-trip-hero" style={{ backgroundImage: `linear-gradient(90deg,#071c3adf 0%,#0b2a4c9c 47%,#06172c1e),url('${destinationPhoto(destination)}')` }}>
      <div className="assistant-crumb"><a href={`/trip/${tripId}/overview`}>Trips</a><ChevronRight size={13}/><span>{trip.name || `${trip.destination} trip`}</span><ChevronRight size={13}/><b>Assistant</b></div>
      <div className="assistant-hero-title"><h1>{trip.name || `${trip.destination} journey`} <button type="button" aria-label="Edit trip details" onClick={onOpenItinerary}><Compass size={17}/></button></h1><p><CalendarDays size={16}/> {trip.start} – {trip.end}<span/><MapPin size={16}/> {trip.destination}</p></div>
      <div className="assistant-trip-stats"><span><Briefcase/> <b>{bookings.length}</b><small>Bookings</small></span><span><Users size={19}/> <b>{trip.travelers || 1}</b><small>Traveler{trip.travelers === 1 ? "" : "s"}</small></span><span><Wallet size={19}/> <b>{money(info.value || 0)}</b><small>Total value</small></span><span className={data?.disruptions?.length ? "risk" : "okay"}><TriangleAlert size={18}/> <b>{data?.disruptions?.length || data?.warnings?.length || 0}</b><small>Needs attention</small></span></div>
      <span className="assistant-weather">☀️ <small>Trip forecast<br/>Check closer to departure</small></span>
    </header>
    <div className="assistant-workspace">
      <section className="assistant-chat-card">
        <div className="assistant-heading"><Sparkles size={25}/><div><h2>Your AI travel assistant</h2><p>I can help you plan, change, recover and manage your entire trip.</p></div><span className="assistant-online">● Ready to help</span></div>
        <div className="assistant-thread" ref={threadRef} aria-live="polite">
          {!messages.length && <div className="assistant-welcome-row"><span className="assistant-avatar"><Plane size={19}/></span><div className="assistant-bubble"><b>Hi {data?.owner?.name?.split(" ")[0] || "there"}! 👋</b><p>I have loaded your trip to {destination}. I can help with:</p><ul><li>Find alternatives for flights, hotels, transport and activities</li><li>Change trip details and recovery preferences</li><li>Check bookings, refunds, itinerary and connection risks</li><li>Rebuild your itinerary and apply recovery plans</li><li>Add or update bookings</li></ul><p>What would you like to do?</p></div></div>}
          {messages.map((m, i) => <React.Fragment key={i}><div className={`assistant-message-row ${m.by}`}>
            {m.by === "assistant" && <span className="assistant-avatar"><Sparkles size={19}/></span>}
            <div className={`assistant-bubble ${m.by}`}><p>{m.text}</p>{m.proposal && <div className="assistant-proposal"><b>Review this change</b><span>{m.proposal.label}</span><small>{m.proposal.detail}</small><div><button className="assistant-confirm" disabled={busy} onClick={() => send(m.message, m.proposal, true)}>{busy ? "Saving…" : "Confirm change"}<ArrowRight size={15}/></button><button className="assistant-cancel" onClick={() => setMessages((items) => items.map((x, n) => n === i ? { ...x, proposal: null, text: `${x.text} Change cancelled.` } : x))}>Cancel</button></div></div>}</div>
            {m.by === "you" && <span className="assistant-user-avatar">{data?.owner?.name?.split(" ").map((x) => x[0]).join("").slice(0, 2) || "TC"}</span>}
          </div>{m.plans?.length > 0 && <div className="assistant-plan-list">{m.plans.slice(0, 3).map((plan) => <article key={plan.id}><span><b>{plan.label}</b><small>{plan.changes.length} booking updates · net INR {plan.net}</small></span><button onClick={() => send(`Apply ${plan.label}`, { type: "applyRecovery", planId: plan.id, version: data?.version }, false)}>Review</button><button onClick={() => onOpenRecovery?.()}>Compare</button></article>)}</div>}</React.Fragment>)}
          {busy && <div className="assistant-thinking"><span/><span/><span/> Checking the trip and preparing options…</div>}
        </div>
        {!messages.length && <div className="assistant-quick-prompts">{quickPrompts.map((x) => <button key={x} onClick={() => runPrompt(x)}>{x}</button>)}</div>}
        {error && <div className="assistant-inline-error" role="alert">{error}</div>}
        <form className="assistant-compose" onSubmit={(e) => { e.preventDefault(); send(); }}><button type="button" title="Add or update booking" onClick={onAddBooking}><Plus size={18}/></button><input aria-label="Ask about your trip" placeholder="Ask anything about your trip…" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={2000}/><button className="assistant-send" aria-label="Send" disabled={busy || !draft.trim()}><Send size={17}/></button></form>
        <p className="assistant-footnote"><ShieldCheck size={14}/> Changes are shown for your review before they’re saved. <a href="/support">Talk to support</a></p>
      </section>
      <aside className="assistant-action-center"><section className="assistant-side-card"><div className="assistant-side-heading"><h3>AI Action Center</h3><span>● Ready to help</span></div><div className="assistant-current-trip"><div><b>Current trip</b><button onClick={onOpenItinerary}>Edit trip</button></div><img src={destinationPhoto(destination)} alt=""/><span><strong>{trip.name || `${trip.destination} trip`}</strong><small>{trip.start} – {trip.end}</small><em>{trip.travelers || 1} travelers · {bookings.length} bookings · {money(info.value || 0)}</em></span></div></section>
        {activeDisruption && <section className="assistant-side-card assistant-impact"><div className="assistant-side-heading"><h3><TriangleAlert size={17}/> Active Impact</h3><span>{data.disruptions.length} issue{data.disruptions.length===1?"":"s"}</span></div><b>{activeDisruption.type.replaceAll("_", " ")}</b><small>{bookings.find((b) => b.id === activeDisruption.bookingId)?.title || "Trip booking"} · {data.impacts?.filter((x) => x.affected).length || 0} affected booking(s)</small><button onClick={onOpenRecovery}>Open Recovery Options <ArrowRight size={15}/></button></section>}
        <section className="assistant-side-card assistant-up-next"><div className="assistant-side-heading"><h3>Up Next</h3><button onClick={onOpenItinerary}>View full itinerary <ArrowRight size={14}/></button></div>{[...bookings].sort((a,b)=>Date.parse(a.start)-Date.parse(b.start)).slice(0,4).map((b) => { const Icon = b.type === "flight" ? Plane : b.type === "hotel" ? Building2 : b.type === "transfer" ? CarFront : b.type === "activity" ? Camera : Utensils; const when = new Date(b.start).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); return <div className="assistant-next-item" key={b.id}><span><Icon/></span><div><small>{when} IST</small><b>{b.title}</b><small>{b.provider}</small></div><em>{b.status || "Confirmed"}</em></div>; })}</section>
        <section className="assistant-side-card assistant-quick-actions"><h3>Quick Actions</h3><div><button onClick={onOpenItinerary}><Briefcase/>View bookings</button><button onClick={() => runPrompt("Change my flight")}><Plane/>Change flight</button><button onClick={() => runPrompt("Change my hotel")}><Building2/>Change hotel</button><button onClick={() => runPrompt("Find a transfer")}><CarFront/>Find transport</button><button onClick={() => runPrompt("Check refunds")}><ShieldCheck/>Check refunds</button><button onClick={onOpenRecovery}><RotateCcw/>Rebuild trip</button><button onClick={onAddBooking}><Plus/>Add booking</button></div></section>
      </aside>
    </div>
  </section>;
}


const ACCOUNT_ACTIVITY_LABELS = {
  "account.login": "Signed in",
  "account.created": "Account created",
  "account.password-changed": "Password changed",
  "account.password-reset": "Password reset",
  "profile.updated": "Profile updated",
  "trip.created": "Trip created",
  "trip.sample-created": "Trip created",
  "trip.updated": "Trip updated",
  "trip.deleted": "Trip deleted",
  "trip.duplicated": "Trip duplicated",
  "booking.created": "Booking added",
  "booking.updated": "Booking updated",
  "booking.removed": "Booking removed",
  "disruption.reported": "Disruption reported",
  "recovery.applied": "Recovery applied",
  "build.created": "Trip planned",
  "build.saved-as-trip": "Plan saved as a trip",
  "build.booked": "Plan booked",
  "support.opened": "Support request opened",
  "support.replied": "Support reply sent",
};
const accountActionLabel = (action) =>
  ACCOUNT_ACTIVITY_LABELS[action] ||
  String(action || "").replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const fmtWhen = (at) => {
  const diff = Date.now() - Date.parse(at || 0);
  if (!at || Number.isNaN(diff)) return "";
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} day${d === 1 ? "" : "s"} ago`;
  return new Date(at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};
export function Account({ user, refresh }) {
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone || "");
  const [loyalty, setLoyalty] = useState(user.loyalty || "");
  const [seat, setSeat] = useState(user.seat || "aisle");
  const [cabin, setCabin] = useState(user.cabin || "economy");
  const [notifications, setNotifications] = useState(!!user.notifications);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [busy, setBusy] = useState("");
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [stats, setStats] = useState({ trips: 0, bookings: 0, favorites: 0, plans: 0 });
  const [activity, setActivity] = useState([]);
  useEffect(() => {
    setName(user.name);
    setPhone(user.phone || "");
    setLoyalty(user.loyalty || "");
    setSeat(user.seat || "aisle");
    setCabin(user.cabin || "economy");
    setNotifications(!!user.notifications);
  }, [user]);
  useEffect(() => {
    let favorites = 0;
    try {
      const value = JSON.parse(localStorage.getItem(`waypoint-saved-destinations:${user.id || user.name}`) || "[]");
      favorites = Array.isArray(value) ? value.length : 0;
    } catch {}
    Promise.all([api("trips").catch(() => []), api("build").catch(() => [])]).then(([trips, builds]) => {
      const list = Array.isArray(trips) ? trips : [];
      setStats({
        trips: list.length,
        bookings: list.reduce((n, t) => n + (t.bookings || 0), 0),
        favorites,
        plans: Array.isArray(builds) ? builds.length : 0,
      });
    });
    api("activity").then((list) => setActivity(Array.isArray(list) ? list : [])).catch(() => {});
  }, [user.id, user.name]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(timer);
  }, [toast]);
  const strength = (() => {
    const v = newPassword;
    let score = 0;
    if (v.length >= 8) score++;
    if (/[A-Z]/.test(v) && /[a-z]/.test(v)) score++;
    if (/\d/.test(v)) score++;
    if (/[^A-Za-z0-9]/.test(v)) score++;
    return score;
  })();
  const strengthMeta = [
    ["", "Use 8+ characters for a stronger password."],
    ["Weak", "Add more characters and a number."],
    ["Fair", "Add a number and special character."],
    ["Good", "Almost there — add one more improvement."],
    ["Strong", "Great password."],
  ][strength];
  const lastLogin = activity.find((a) => a.action === "account.login");
  const saveProfile = async (e) => {
    e.preventDefault();
    setError("");
    setBusy("profile");
    try {
      await api("profile", { name, phone, loyalty, seat, cabin, notifications }, "PUT");
      await refresh();
      setToast("Profile saved.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  };
  const savePassword = async (e) => {
    e.preventDefault();
    setError("");
    setBusy("password");
    try {
      await api("password", { current: currentPassword, password: newPassword }, "PUT");
      setCurrentPassword("");
      setNewPassword("");
      setToast("Password updated.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  };
  const initials = (user.name || "WP").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="profile-page">
      <div className="pf-crumb">MAKE YOURSELF AT HOME</div>
      <div className="pf-head">
        <div>
          <h1>Your <span>traveler</span> profile.</h1>
          <div className="pf-subtitle">Your preferences and account, in one place.</div>
        </div>
        <div className="pf-quick-info"><span className="pf-dot" /> Last updated just now</div>
      </div>

      <section className="pf-hero">
        <div className="pf-hero-copy">
          <div className="pf-hero-kicker">TRAVEL BETTER, YOUR WAY</div>
          <div className="pf-hero-title">Your profile. <span>Your journey.</span></div>
          <div className="pf-hero-sub">Keep your preferences, security and traveler details ready for every trip.</div>
        </div>
      </section>

      {error && <p className="error" role="alert">{error}</p>}

      <div className="pf-grid">
        <form className="pf-card" onSubmit={saveProfile}>
          <div className="pf-card-head">
            <div className="pf-icon-tile"><Users size={20} /></div>
            <div><div className="pf-card-title">The essentials</div><div className="pf-card-sub">Manage your personal information and travel preferences.</div></div>
          </div>
          <div className="pf-card-body">
            <div className="pf-form-row">
              <div className="pf-field full">
                <label htmlFor="pf-name">Full name</label>
                <input id="pf-name" className="pf-input" value={name} minLength={2} maxLength={80} required onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="pf-field full">
                <label htmlFor="pf-email">Email</label>
                <div className="pf-input-wrap">
                  <input id="pf-email" className="pf-input" value={user.email} disabled />
                  <span className={"pf-email-state" + (user.verified ? "" : " pending")}>{user.verified ? "Verified ✓" : "Pending"}</span>
                </div>
              </div>
              <div className="pf-field">
                <label htmlFor="pf-phone">Phone</label>
                <input id="pf-phone" className="pf-input" value={phone} placeholder="Add phone number" onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="pf-field">
                <label htmlFor="pf-loyalty">Loyalty membership</label>
                <input id="pf-loyalty" className="pf-input" value={loyalty} placeholder="Add a membership" onChange={(e) => setLoyalty(e.target.value)} />
              </div>
              <div className="pf-field">
                <label htmlFor="pf-seat">Preferred seat</label>
                <select id="pf-seat" className="pf-select" value={seat} onChange={(e) => setSeat(e.target.value)}>
                  <option value="aisle">Aisle</option>
                  <option value="window">Window</option>
                  <option value="any">No preference</option>
                </select>
              </div>
              <div className="pf-field">
                <label htmlFor="pf-cabin">Cabin preference</label>
                <select id="pf-cabin" className="pf-select" value={cabin} onChange={(e) => setCabin(e.target.value)}>
                  <option value="economy">Economy</option>
                  <option value="premium">Premium Economy</option>
                  <option value="business">Business</option>
                </select>
              </div>
            </div>
            <label className="pf-checkbox">
              <input type="checkbox" checked={notifications} onChange={(e) => setNotifications(e.target.checked)} />
              <span>
                <span className="pf-checkbox-title">Create email previews for trip updates</span>
                <span className="pf-checkbox-hint">Get booking confirmations, gate changes and personalized offers.</span>
              </span>
            </label>
            <button className="pf-save" type="submit" disabled={busy === "profile"}>{busy === "profile" ? "Saving…" : "Save & continue"} <ArrowRight size={15} /></button>
            <div className="pf-note">Seat and cabin are profile notes. Recovery ranking uses each trip’s budget, time and accessibility preferences.</div>
          </div>
        </form>

        <form className="pf-card" onSubmit={savePassword}>
          <div className="pf-card-head">
            <div className="pf-icon-tile"><ShieldCheck size={20} /></div>
            <div><div className="pf-card-title">Update your password</div><div className="pf-card-sub">Keep your account secure.</div></div>
          </div>
          <div className="pf-card-body">
            <div className="pf-field">
              <label htmlFor="pf-current">Current password</label>
              <div className="pf-input-wrap">
                <input id="pf-current" className="pf-input" type={showCurrent ? "text" : "password"} autoComplete="current-password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                <button className="pf-eye" type="button" onClick={() => setShowCurrent(!showCurrent)}>{showCurrent ? "Hide" : "Show"}</button>
              </div>
            </div>
            <div className="pf-field">
              <label htmlFor="pf-new">New password</label>
              <div className="pf-input-wrap">
                <input id="pf-new" className="pf-input" type={showNew ? "text" : "password"} autoComplete="new-password" minLength={10} maxLength={128} required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                <button className="pf-eye" type="button" onClick={() => setShowNew(!showNew)}>{showNew ? "Hide" : "Show"}</button>
              </div>
            </div>
            <div className="pf-strength">
              <div className="pf-bars">{[0, 1, 2, 3].map((i) => <i key={i} className={i < strength ? "filled" : ""} />)}</div>
              <div className="pf-strength-meta"><span>{strengthMeta[1]}</span><strong>{strengthMeta[0]}</strong></div>
            </div>
            <div className="pf-req-box">
              <strong>Password requirements:</strong>
              <div><span className="pf-check">✓</span> At least 8 characters</div>
              <div><span className="pf-check">✓</span> Include a number and a special character</div>
              <div><span className="pf-check">✓</span> Use a mix of upper and lower case letters</div>
            </div>
            <button className="pf-save teal" type="submit" disabled={busy === "password"}>{busy === "password" ? "Saving…" : "Save & continue"} <ArrowRight size={15} /></button>
            <div className="pf-note">Updating your password signs out other sessions.</div>
            <div className="pf-account-box">
              <div className="pf-account-left">
                <div className="pf-small-icon"><Users size={16} /></div>
                <div><div className="pf-account-title">Account information</div><div className="pf-account-meta">Account type: {user.role}<br />Email: {user.verified ? "Verified" : "Verification pending"}</div></div>
              </div>
              <span className="pf-account-arrow">›</span>
            </div>
          </div>
        </form>

        <aside className="pf-right">
          <section className="pf-card pf-profile-card">
            <div className="pf-profile-top">
              <div className="pf-identity">
                <div className="pf-avatar">{initials}</div>
                <div><div className="pf-identity-name">{user.name}</div><div className="pf-identity-role">{user.role === "admin" ? "Administrator" : "Traveler"}</div></div>
              </div>
              <button className="pf-edit" type="button" onClick={() => document.getElementById("pf-name")?.focus()}>Edit</button>
            </div>
            <div className="pf-stats">
              <div className="pf-stat"><div className="pf-stat-n">{stats.trips}</div><div className="pf-stat-l">Trips</div></div>
              <div className="pf-stat"><div className="pf-stat-n">{stats.bookings}</div><div className="pf-stat-l">Bookings</div></div>
              <div className="pf-stat"><div className="pf-stat-n">{stats.favorites}</div><div className="pf-stat-l">Favorites</div></div>
              <div className="pf-stat"><div className="pf-stat-n">{stats.plans}</div><div className="pf-stat-l">Saved plans</div></div>
            </div>
          </section>

          <section className="pf-card pf-info-card">
            <div className="pf-info-row">
              <div className="pf-info-icon"><Sparkles size={18} /></div>
              <div><div className="pf-info-title">Membership &amp; benefits</div><div className="pf-info-value">{loyalty || "No membership yet"}</div><div className="pf-info-sub">View and manage your loyalty programs.</div></div>
              <span className="pf-row-arrow">›</span>
            </div>
          </section>

          <section className="pf-security">
            <div className="pf-sec-icon"><Check size={17} /></div>
            <div>
              <div className="pf-sec-title">Account security</div>
              <div className="pf-sec-good">● Your account is secure</div>
              <div className="pf-sec-time">{lastLogin ? `Last login: ${new Date(lastLogin.at).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}` : "New account"}</div>
            </div>
          </section>

          <section className="pf-card pf-activity">
            <div className="pf-activity-head"><div className="pf-activity-title">Recent account activity</div><a className="pf-activity-view" href="/notifications">View all →</a></div>
            {activity.slice(0, 4).map((a) => (
              <div className="pf-activity-item" key={a.id}>
                <div className="pf-activity-icon"><Clock size={15} /></div>
                <div><div className="pf-activity-name">{accountActionLabel(a.action)}</div><div className="pf-activity-time">{fmtWhen(a.at)}</div></div>
                <span className="pf-activity-arrow">›</span>
              </div>
            ))}
            {!activity.length && <div className="pf-activity-empty">Account activity will appear here.</div>}
          </section>
        </aside>
      </div>

      <div className="pf-footer-note"><span>Waypoint Travel</span><span>Local edition · Supplier actions are simulated</span></div>
      {toast && <div className="pf-toast" role="status">{toast}</div>}
    </div>
  );
}
const INBOX_TYPES = {
  critical: { label: "CRITICAL", icon: TriangleAlert },
  action: { label: "ACTION NEEDED", icon: Clock },
  update: { label: "TRIP UPDATE", icon: Plane },
  price: { label: "PRICE ALERT", icon: ArrowUpRight },
  good: { label: "GOOD NEWS", icon: Sparkles },
};
const INBOX_TABS = [
  ["all", "All"],
  ["critical", "Critical"],
  ["action", "Action Needed"],
  ["update", "Trip Updates"],
  ["price", "Price Alerts"],
  ["good", "Good News"],
];
const INBOX_ALERT = {
  critical: "This may result in a missed connection. We recommend exploring recovery options.",
  action: "This needs a quick review so your journey stays on track.",
  update: "No action needed — this is an update to your travel workspace.",
  price: "A price change was detected for one of your options.",
  good: "A better option is available for you to review.",
};
const INBOX_IMPACT = {
  critical: ["A downstream connection may be missed", "Hotel check-in could shift", "Scheduled activities may be delayed"],
  action: ["Your schedule may need a small adjustment", "Confirm the affected booking", "Recovery options are ready if needed"],
  update: ["Recorded in your travel workspace", "Connected bookings stay in sync", "Monitoring continues"],
  price: ["Fares can change again before booking", "Compare before you decide", "Check baggage and refund rules"],
  good: ["May improve your downstream timing", "Compare before changing", "A better option is available"],
};
function inboxType(n) {
  const t = `${n.title || ""} ${n.message || ""}`.toLowerCase();
  if (/not feasible|no longer|missed|cancel|disrupt|at risk|fail/.test(t)) return "critical";
  if (/partial|need attention|conflict|review|check-in|delay|buffer|spare time|breathing|tight|warning/.test(t)) return "action";
  if (/price|fare|refund|drop|saving|₹|inr|cost/.test(t)) return "price";
  if (/applied|saved|found|earlier|confirmed|complete|upgrade|success|ready/.test(t)) return "good";
  return "update";
}
function inboxWhen(at) {
  const diff = Date.now() - Date.parse(at || 0);
  if (!at || Number.isNaN(diff)) return "";
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}
export function Notifications() {
  const [items, setItems] = useState([]),
    [error, setError] = useState(""),
    [tab, setTab] = useState("all"),
    [search, setSearch] = useState(""),
    [sort, setSort] = useState("newest"),
    [selectedId, setSelectedId] = useState(null),
    [toast, setToast] = useState("");
  const load = () =>
    api("notifications")
      .then(setItems)
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 1900);
    return () => clearTimeout(t);
  }, [toast]);
  const typed = items.map((n) => ({ ...n, type: inboxType(n) }));
  const counts = typed.reduce(
    (acc, n) => ({ ...acc, [n.type]: (acc[n.type] || 0) + 1 }),
    {},
  );
  const term = search.trim().toLowerCase();
  const visible = typed
    .filter(
      (n) =>
        (tab === "all" || n.type === tab) &&
        (!term || `${n.title} ${n.message}`.toLowerCase().includes(term)),
    )
    .sort((a, b) =>
      sort === "oldest"
        ? Date.parse(a.at) - Date.parse(b.at)
        : Date.parse(b.at) - Date.parse(a.at),
    );
  const selected = typed.find((n) => n.id === selectedId) || visible[0] || null;
  const unread = items.filter((n) => !n.read).length;
  const markAllRead = async () => {
    try {
      await api("notifications/read", {});
      setItems((list) => list.map((n) => ({ ...n, read: true })));
      setToast("All notifications marked as read");
    } catch (e) {
      setError(e.message);
    }
  };
  const dismiss = (id) => {
    setItems((list) => list.filter((n) => n.id !== id));
    setSelectedId(null);
    setToast("Notification dismissed");
  };
  const DetailIcon = selected ? INBOX_TYPES[selected.type].icon : Bell;
  const recoveryHref = selected?.tripId
    ? `/trip/${selected.tripId}/recovery`
    : "/build?mode=auto";
  const tripHref = selected?.tripId ? `/trip/${selected.tripId}/overview` : "/trips";
  return (
    <div className="inbox-page">
      <div className="inbox-head">
        <div>
          <div className="inbox-kicker">A HEADS-UP, RIGHT WHEN YOU NEED IT</div>
          <h1>Your Travel Inbox.</h1>
          <p className="inbox-sub">
            Disruptions, recovery updates, and proactive connection checks.
          </p>
        </div>
        <button className="inbox-read-btn" onClick={markAllRead}>
          <Check size={13} /> Mark all as read{unread ? ` (${unread})` : ""}
        </button>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="inbox-controls">
        <div className="inbox-tabs" role="tablist" aria-label="Notification categories">
          {INBOX_TABS.map(([key, label]) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              className={"inbox-tab" + (tab === key ? " active" : "")}
              onClick={() => setTab(key)}
            >
              {label} <span className="count">({key === "all" ? typed.length : counts[key] || 0})</span>
            </button>
          ))}
        </div>
        <label className="inbox-search">
          <Search size={13} />
          <input
            aria-label="Search notifications"
            placeholder="Search notifications…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label className="inbox-sort">
          ⇅&nbsp;
          <select aria-label="Sort notifications" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </label>
      </div>
      <div className="inbox-content">
        <section className="inbox-list" aria-label="Notifications">
          {visible.map((n) => {
            const meta = INBOX_TYPES[n.type];
            const Icon = meta.icon;
            return (
              <article
                key={n.id}
                className={`inbox-notify ${n.type}${selected?.id === n.id ? " selected" : ""}${!n.read ? " unread" : ""}`}
                onClick={() => setSelectedId(n.id)}
              >
                <div className="inbox-notify-inner">
                  <div className="inbox-notify-icon"><Icon size={19} /></div>
                  <div>
                    <span className="inbox-badge-type">{meta.label}</span>
                    <div className="inbox-notify-title">
                      {n.title}
                      {!n.read && <span className="inbox-unread-dot" />}
                    </div>
                    <div className="inbox-notify-desc">{n.message}</div>
                    <div className="inbox-notify-meta">
                      <span><Bell size={11} /> {n.tripId ? "Trip alert" : "Workspace"}</span>
                      <span><Clock size={11} /> {new Date(n.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  </div>
                  <div className="inbox-notify-right">
                    <span className="inbox-when">{inboxWhen(n.at)}</span>
                    <div className="inbox-actions">
                      {n.tripId && <a className="inbox-action-btn" href={`/trip/${n.tripId}/overview`} onClick={(e) => e.stopPropagation()}>View Trip</a>}
                      {(n.type === "critical" || n.type === "action") && (
                        <a className="inbox-action-btn primary" href={n.tripId ? `/trip/${n.tripId}/recovery` : "/build?mode=auto"} onClick={(e) => e.stopPropagation()}>Find Recovery Options</a>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
          {!visible.length && (
            <div className="inbox-empty">
              <b>No notifications found</b>
              <span>Try another category or search term.</span>
            </div>
          )}
        </section>
        <aside className="inbox-detail" aria-label="Notification detail">
          {selected ? (
            <>
              <div className="inbox-detail-head">
                <span>Notification detail</span>
                <span className="inbox-detail-time">{inboxWhen(selected.at)}</span>
              </div>
              <div className="inbox-detail-body">
                <div className="inbox-severity-row">
                  <div className={"inbox-severity-icon " + selected.type}><DetailIcon size={19} /></div>
                  <span className={"inbox-type " + selected.type}>{INBOX_TYPES[selected.type].label}</span>
                </div>
                <h2>{selected.title}</h2>
                <p className="inbox-detail-lead">{selected.message.split("\n\n")[0]}</p>
                <div className={"inbox-alert-box " + selected.type}>{INBOX_ALERT[selected.type]}</div>
                {selected.tripId && (
                  <section className="inbox-section">
                    <h3>Trip Information</h3>
                    <div className="inbox-trip-info">
                      <div className="inbox-trip-icon"><Plane size={16} /></div>
                      <div><b>Linked trip</b><span>Open the console for full details</span></div>
                      <a href={`/trip/${selected.tripId}/overview`}>View Trip</a>
                    </div>
                  </section>
                )}
                <section className="inbox-section">
                  <h3>What happened?</h3>
                  <p className="inbox-copy">{selected.message}</p>
                </section>
                <section className="inbox-section">
                  <h3>Impact</h3>
                  <ul className="inbox-impact">
                    {(INBOX_IMPACT[selected.type] || []).map((x) => <li key={x}>{x}</li>)}
                  </ul>
                </section>
                <section className="inbox-reco">
                  <h3>Recommended Actions</h3>
                  <a className="inbox-reco-btn primary" href={recoveryHref}>Find Recovery Options <span>›</span></a>
                  <a className="inbox-reco-btn" href={tripHref}>View Trip Details <span>›</span></a>
                  <button className="inbox-reco-btn" onClick={() => dismiss(selected.id)}>Dismiss Notification <span>›</span></button>
                </section>
                <div className="inbox-detail-foot">
                  Waypoint keeps important travel events visible so you can act before a disruption becomes a missed connection.
                </div>
              </div>
            </>
          ) : (
            <div className="inbox-detail-body">
              <div className="inbox-empty">
                <b>Nothing selected</b>
                <span>Choose a notification to see the details.</span>
              </div>
            </div>
          )}
        </aside>
      </div>
      {toast && <div className="inbox-toast" role="status">{toast}</div>}
    </div>
  );
}
const SUPPORT_CATEGORIES = [
  ["Flight", Plane],
  ["Hotel", Hotel],
  ["Transport", CarFront],
  ["Activity", Camera],
  ["Payment", Wallet],
  ["Other", MoreHorizontal],
];
const SUPPORT_PRIORITIES = [
  ["low", "Low", "Not time-sensitive"],
  ["normal", "Normal", "General inquiry or non-urgent request"],
  ["high", "High", "Needs attention today"],
  ["urgent", "Urgent", "Active disruption — travelling now"],
];
function AdminSupportQueue({ tickets, reload }) {
  const [filter, setFilter] = useState("open");
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(timer);
  }, [toast]);
  const counts = {
    all: tickets.length,
    open: tickets.filter((t) => t.status !== "resolved").length,
    resolved: tickets.filter((t) => t.status === "resolved").length,
  };
  const list = tickets
    .filter((t) =>
      filter === "all"
        ? true
        : filter === "resolved"
          ? t.status === "resolved"
          : t.status !== "resolved",
    )
    .sort(
      (a, b) =>
        (a.status === "resolved" ? 1 : 0) - (b.status === "resolved" ? 1 : 0) ||
        Date.parse(b.createdAt) - Date.parse(a.createdAt),
    );
  const selected = tickets.find((t) => t.id === selectedId) || list[0] || null;
  const statusOf = (t) => {
    if (t.status === "resolved") return { label: "Resolved", tone: "resolved" };
    const last = t.messages?.[t.messages.length - 1];
    if (last && last.role === "admin") return { label: "Waiting for traveler", tone: "wait" };
    return { label: "Needs a reply", tone: "progress" };
  };
  const submit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const message = form.elements.message.value.trim();
    const status = form.elements.status.value;
    if (!message || !selected) return;
    setBusy(true);
    setError("");
    try {
      await api(`tickets/${selected.id}/reply`, { message, status });
      form.reset();
      await reload?.();
      setToast("Reply sent to the traveler.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="support-page">
      <div className="sup-eyebrow">A HUMAN HAND, WHEN YOU NEED ONE</div>
      <h1>Support queue.</h1>
      <div className="sup-subtitle">Reply to travelers and resolve their requests.</div>
      <div className="inbox-controls" role="tablist" aria-label="Support filters">
        {[["open", `Open (${counts.open})`], ["resolved", `Resolved (${counts.resolved})`], ["all", `All (${counts.all})`]].map(([key, label]) => (
          <button key={key} role="tab" aria-selected={filter === key} className={"inbox-tab" + (filter === key ? " active" : "")} onClick={() => setFilter(key)}>{label}</button>
        ))}
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="sup-grid">
        <section className="card sup-requests" aria-label="Requests">
          <div className="sup-section-head"><h3>Requests</h3><span className="sup-view">{list.length}</span></div>
          {list.map((t) => {
            const s = statusOf(t);
            return (
              <button type="button" className={"sup-request" + (selected?.id === t.id ? " selected" : "")} key={t.id} onClick={() => setSelectedId(t.id)}>
                <span className="sup-req-icon"><MessageCircle size={17} /></span>
                <span className="sup-req-copy">
                  <span className="sup-req-title">{t.subject}</span>
                  <span className="sup-req-meta">{t.category || "Other"}{t.priority && t.priority !== "normal" ? ` · ${t.priority}` : ""} · {t.messages?.[0]?.by || "Traveler"} · {new Date(t.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                </span>
                <span className={"sup-status " + s.tone}>{s.label}</span>
                <ChevronRight size={15} className="sup-req-chevron" />
              </button>
            );
          })}
          {!list.length && <div className="sup-empty">No {filter === "all" ? "" : filter} requests.</div>}
        </section>
        <aside className="sup-right-col">
          {selected ? (
            <section className="card sup-requests">
              <div className="sup-section-head"><h3>{selected.subject}</h3><span className={"sup-status " + statusOf(selected).tone}>{statusOf(selected).label}</span></div>
              <div className="sup-detail-meta">
                <span><MessageCircle size={12} /> {selected.messages?.[0]?.by || "Traveler"}</span>
                {selected.category && <span>{selected.category}</span>}
                {selected.priority && <span>{selected.priority}</span>}
                {selected.tripId && <a href={`/trip/${selected.tripId}/overview`}>Open trip</a>}
              </div>
              <div className="sup-conversation">
                {selected.messages.map((m, i) => (
                  <div className={"sup-msg " + (m.role === "admin" ? "admin" : "")} key={i}>
                    <b>{m.by} · {m.role}</b>
                    <p>{m.text}</p>
                    <small>{new Date(m.at).toLocaleString()}</small>
                  </div>
                ))}
              </div>
              <form className="sup-admin-reply" onSubmit={submit}>
                <textarea name="message" required maxLength={3000} placeholder="Write a reply…" />
                <div className="sup-admin-reply-row">
                  <select name="status" defaultValue={selected.status} aria-label="Status">
                    <option value="open">Keep open</option>
                    <option value="resolved">Mark resolved</option>
                  </select>
                  <button className="sup-btn" type="submit" disabled={busy}>{busy ? "Sending…" : "Send reply"} <Send size={13} /></button>
                </div>
              </form>
            </section>
          ) : (
            <section className="card sup-requests"><div className="sup-empty">Select a request to reply.</div></section>
          )}
        </aside>
      </div>
      {toast && <div className="sup-toast" role="status">{toast}</div>}
    </div>
  );
}
export function Support({ tickets: provided, admin = false, reload }) {
  const [items, setItems] = useState([]),
    [error, setError] = useState(""),
    [trips, setTrips] = useState([]),
    [category, setCategory] = useState("Flight"),
    [subject, setSubject] = useState(""),
    [message, setMessage] = useState(""),
    [tripId, setTripId] = useState(""),
    [priority, setPriority] = useState("normal"),
    [attachment, setAttachment] = useState(""),
    [busy, setBusy] = useState(false),
    [toast, setToast] = useState(""),
    [openId, setOpenId] = useState(null);
  const load = () =>
    api("tickets")
      .then(setItems)
      .catch((e) => setError(e.message));
  useEffect(() => {
    if (!provided) load();
  }, []);
  useEffect(() => {
    if (admin) return;
    api("trips")
      .then((list) => setTrips(Array.isArray(list) ? list : []))
      .catch(() => {});
  }, [admin]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(timer);
  }, [toast]);
  const tickets = provided || items;
  if (admin) return <AdminSupportQueue tickets={tickets} reload={reload} />;

  const statusOf = (t) => {
    if (t.status === "resolved") return { label: "Resolved", tone: "resolved" };
    const last = t.messages?.[t.messages.length - 1];
    if (last && last.role === "admin") return { label: "Waiting for you", tone: "wait" };
    return { label: "In progress", tone: "progress" };
  };
  const categoryIcon = (name) =>
    (SUPPORT_CATEGORIES.find(([label]) => label === name) || SUPPORT_CATEGORIES[5])[1];
  const selectedTrip = trips.find((t) => t.id === tripId);
  const sorted = [...tickets].sort(
    (a, b) =>
      (a.status === "resolved" ? 1 : 0) - (b.status === "resolved" ? 1 : 0) ||
      Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!subject.trim() || message.trim().length < 5) {
      setError("Add a subject and a message (at least 5 characters) before submitting.");
      return;
    }
    setBusy(true);
    try {
      await api("tickets", {
        subject: subject.trim(),
        message: attachment
          ? `${message.trim()}\n\n(Attachment selected: ${attachment} — file upload is not connected in this local demo.)`
          : message.trim(),
        tripId: tripId || undefined,
        category,
        priority,
      });
      setSubject("");
      setMessage("");
      setAttachment("");
      setTripId("");
      setPriority("normal");
      setCategory("Flight");
      await load();
      setToast("Support request submitted.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="support-page">
      <div className="sup-eyebrow">A HUMAN HAND, WHEN YOU NEED ONE</div>
      <h1>Let’s get you back on track.</h1>
      <div className="sup-subtitle">Travel support for disruptions, bookings, refunds and anything that needs a human.</div>

      <div className="sup-quick">
        <a className="sup-quick-card red" href="/build?mode=auto">
          <div className="sup-q-icon red"><TriangleAlert size={30} /></div>
          <div className="sup-q-text"><div className="sup-q-title">Resolve a disruption</div><div className="sup-q-desc">Flight delays, cancellations, missed connections and alternate options.</div></div>
          <div className="sup-q-arrow">→</div>
        </a>
        <button type="button" className="sup-quick-card blue" onClick={() => { setCategory("Hotel"); document.getElementById("support-subject")?.focus(); }}>
          <div className="sup-q-icon blue"><Wallet size={28} /></div>
          <div className="sup-q-text"><div className="sup-q-title">Booking help</div><div className="sup-q-desc">Changes, cancellations, refunds and special requests.</div></div>
          <div className="sup-q-arrow">→</div>
        </button>
        <button type="button" className="sup-quick-card purple" onClick={() => document.getElementById("support-message")?.focus()}>
          <div className="sup-q-icon purple"><MessageCircle size={28} /></div>
          <div className="sup-q-text"><div className="sup-q-title">Talk to support</div><div className="sup-q-desc">Write to our travel specialists for personalized help.</div></div>
          <div className="sup-q-arrow">→</div>
        </button>
      </div>

      {error && <p className="error" role="alert">{error}</p>}

      <div className="sup-grid">
        <form className="card sup-form-card" onSubmit={submit}>
          <div className="sup-form-head">
            <div className="sup-form-title-wrap">
              <div className="sup-form-bubble"><MessageCircle size={22} /></div>
              <div><div className="sup-form-title">Start a support request</div><div className="sup-form-sub">Tell us what’s happening and we’ll get back to you as soon as possible.</div></div>
            </div>
            <div className="sup-sla"><div className="sup-clock"><Clock size={18} /></div><div className="sup-sla-text">Expected response time<strong>Within 2–6 hours</strong></div></div>
          </div>

          <div className="sup-label">What is this about?</div>
          <div className="sup-cats" role="group" aria-label="Request category">
            {SUPPORT_CATEGORIES.map(([label, Icon]) => (
              <button type="button" key={label} className={"sup-cat" + (category === label ? " active" : "")} aria-pressed={category === label} onClick={() => setCategory(label)}><Icon size={17} /> {label}</button>
            ))}
          </div>

          <div className="sup-row2">
            <div className="sup-field">
              <div className="sup-label">Subject</div>
              <input id="support-subject" className="sup-input" value={subject} maxLength={200} onChange={(e) => setSubject(e.target.value)} placeholder="Briefly describe your issue…" />
            </div>
            <div className="sup-field">
              <div className="sup-label">Related Trip <span className="sup-optional">(Optional)</span></div>
              <div className="sup-trip-select">
                <TripPhoto className="sup-trip-thumb" src={selectedTrip && destinations.find((d) => selectedTrip.destination?.includes(d.name))?.image || destinations[0].image} alt="" />
                <select className="sup-trip-drop" aria-label="Related trip" value={tripId} onChange={(e) => setTripId(e.target.value)}>
                  <option value="">No trip selected</option>
                  {trips.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              {selectedTrip && <div className="sup-trip-date">{selectedTrip.destination} · {selectedTrip.start}</div>}
            </div>
          </div>

          <div className="sup-field">
            <div className="sup-label">Message</div>
            <textarea id="support-message" className="sup-textarea" maxLength={2000} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Please share more details about the issue, including booking details, dates, and what you need help with…" />
            <div className="sup-char">{message.length}/2000</div>
          </div>

          <div className="sup-upload-row">
            <div className="sup-field">
              <div className="sup-label">Add attachments <span className="sup-optional">(Optional)</span></div>
              <label className="sup-drop">
                <span className="sup-drop-icon"><Plus size={15} /></span>
                <span className="sup-upload-btn">Drag and drop files here, or click to upload<br /><small>JPG, PNG, PDF (Max 10MB each)</small></span>
                <input type="file" hidden accept=".jpg,.jpeg,.png,.pdf" onChange={(e) => setAttachment(e.target.files?.[0]?.name || "")} />
              </label>
              {attachment && <div className="sup-file-name">Attached: {attachment}</div>}
            </div>
            <div className="sup-field">
              <div className="sup-label">Priority</div>
              <div className="sup-priority">
                <TriangleAlert size={16} className="sup-priority-icon" />
                <div className="sup-priority-copy">
                  <select className="sup-priority-select" aria-label="Priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
                    {SUPPORT_PRIORITIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                  <span className="sup-priority-desc">{SUPPORT_PRIORITIES.find((p) => p[0] === priority)?.[2]}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="sup-submit-row">
            <button className="sup-submit" type="submit" disabled={busy}>{busy ? "Submitting…" : "Submit request"} <ArrowRight size={16} /></button>
          </div>
        </form>

        <aside className="sup-right-col">
          <section className="card sup-requests">
            <div className="sup-section-head"><h3>Your open requests</h3><span className="sup-view">{tickets.length} total</span></div>
            {sorted.map((t) => {
              const s = statusOf(t);
              const Icon = categoryIcon(t.category);
              return (
                <div className="sup-request-wrap" key={t.id}>
                  <button type="button" className="sup-request" aria-expanded={openId === t.id} onClick={() => setOpenId(openId === t.id ? null : t.id)}>
                    <span className="sup-req-icon"><Icon size={18} /></span>
                    <span className="sup-req-copy"><span className="sup-req-title">{t.subject}</span><span className="sup-req-meta">{[t.category, t.priority && t.priority !== "normal" ? t.priority : null].filter(Boolean).join(" · ") || "Support"} · {new Date(t.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span></span>
                    <span className={"sup-status " + s.tone}>{s.label}</span>
                    <ChevronRight size={16} className={"sup-req-chevron" + (openId === t.id ? " open" : "")} />
                  </button>
                  {openId === t.id && (
                    <div className="sup-request-body">
                      {t.messages.map((m, i) => (
                        <div className={"sup-msg " + m.role} key={i}><b>{m.by}</b><p>{m.text}</p><small>{new Date(m.at).toLocaleString()}</small></div>
                      ))}
                      <form className="sup-reply" onSubmit={async (e) => {
                        e.preventDefault();
                        const text = e.currentTarget.elements.reply.value.trim();
                        if (!text) return;
                        try { await api(`tickets/${t.id}/reply`, { message: text }); e.currentTarget.reset(); await load(); setToast("Reply sent."); }
                        catch (err) { setError(err.message); }
                      }}>
                        <textarea name="reply" required placeholder="Write a reply…" />
                        <button className="sup-btn" type="submit"><Send size={13} /> Send</button>
                      </form>
                    </div>
                  )}
                </div>
              );
            })}
            {!tickets.length && <div className="sup-empty">No requests yet. Start one and it will appear here.</div>}
          </section>

          <section className="card sup-urgent">
            <div className="sup-urgent-top">
              <div className="sup-urgent-icon"><TriangleAlert size={22} /></div>
              <div><div className="sup-urgent-title">Need immediate help? <span className="sup-247">24/7 Support</span></div><div className="sup-urgent-sub">For urgent travel disruptions, call or chat with our support team right away.</div></div>
            </div>
            <div className="sup-support-actions">
              <button type="button" className="sup-support-btn" onClick={() => setToast("Calling support is not connected in this local demo.")}>Call support</button>
              <button type="button" className="sup-support-btn blue" onClick={() => { document.getElementById("support-message")?.focus(); setToast("Live chat is not connected — use the form above."); }}>Live chat</button>
            </div>
          </section>

          <section className="card sup-safe">
            <div className="sup-safe-icon"><ShieldCheck size={19} /></div>
            <div><div className="sup-safe-title">Your trips are safe with us</div><div className="sup-safe-text">Share your booking reference and trip details so we can assist you faster and provide the best possible options.</div></div>
          </section>
        </aside>
      </div>

      <section className="sup-help">
        <div className="sup-help-head"><h3>Popular Help Topics <span>Quick answers to common travel issues.</span></h3><span className="sup-view">View all help articles →</span></div>
        <div className="sup-help-grid">
          {[[Plane, "Missed a flight", "What to do and recovery options", ""], [Wallet, "Need a refund", "Cancellation and refund process", "orange"], [CalendarDays, "Change a booking", "Modify dates, travelers or hotels", ""], [TriangleAlert, "Travel disruption", "Delays, cancellations and more", "red"]].map(([Icon, title, sub, tone]) => (
            <div className="sup-help-card" key={title}>
              <div className={"sup-help-icon " + tone}><Icon size={18} /></div>
              <div className="sup-help-copy"><div className="sup-help-title">{title}</div><div className="sup-help-sub">{sub}</div></div>
              <ChevronRight size={15} className="sup-help-arrow" />
            </div>
          ))}
        </div>
      </section>

      {toast && <div className="sup-toast" role="status">{toast}</div>}
    </div>
  );
}
export function Admin({ user, logout, section = "overview" }) {
  const [data, setData] = useState(null),
    [tab, setTab] = useState(
      adminSections.find((s) => s.slug === section)?.label || "Overview",
    ),
    [search, setSearch] = useState(""),
    [error, setError] = useState(""),
    [refreshing, setRefreshing] = useState(false),
    [updatedAt, setUpdatedAt] = useState(null),
    [open, setOpen] = useState(false),
    [busyTrip, setBusyTrip] = useState(""),
    [toast, setToast] = useState(""),
    [autoRefresh, setAutoRefresh] = useState(false);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2400);
    return () => clearTimeout(timer);
  }, [toast]);
  const manageTrip = async (id, path, body, message) => {
    if (path === "cancel" && !window.confirm("Cancel this trip? The traveler will be notified.")) return;
    setBusyTrip(id + ":" + path);
    setError("");
    try {
      await api(`admin/trips/${id}/${path}`, body ?? {}, "POST");
      await load();
      if (message) setToast(message);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyTrip("");
    }
  };
  const load = async () => {
    setRefreshing(true);
    try {
      setData(await api("admin/overview"));
      setUpdatedAt(new Date());
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setRefreshing(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    setTab(adminSections.find((s) => s.slug === section)?.label || "Not found");
  }, [section]);
  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, [autoRefresh]);
  function select(slug) {
    setTab(adminSections.find((s) => s.slug === slug)?.label || "Overview");
    setOpen(false);
    go(slug === "overview" ? "admin" : "admin/" + slug);
  }
  async function update(path, value) {
    try {
      await api(path, value, "PUT");
      await load();
    } catch (e) {
      setError(e.message);
    }
  }
  if (!data)
    return (
      <div className="loading">
        <ShieldCheck size={36} />
        <h2>Opening your operations workspace?</h2>
        {error && (
          <>
            <p className="error">{error}</p>
            <button className="button" onClick={load}>
              Try again
            </button>
          </>
        )}
      </div>
    );
  return (
    <div className={"admin-fullscreen traveler-shell " + (open ? "nav-open" : "")}>
      {open && (
        <button
          className="admin-nav-scrim"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <AdminSidebar
        user={user}
        section={section}
        onClose={() => setOpen(false)}
        onNavigate={select}
        logout={logout}
        onError={setError}
        badges={{ recovery: data.metrics.disruptions, support: data.metrics.openTickets }}
      />
      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <button
              className="admin-mobile-menu icon-button"
              aria-label="Open admin navigation"
              onClick={() => setOpen(true)}
            >
              <Menu size={21} />
            </button>
            <span>Operations</span>
            <ChevronRight size={13} />
            <b>{tab}</b>
          </div>
          <div>
            <span className="admin-status">
              <span className="online-dot" />
              JSON connected
            </span>
            <a
              href="/notifications"
              className="icon-button"
              aria-label="Notification inbox"
            >
              <Bell size={18} />
            </a>
            <a
              href="/account"
              className="admin-avatar"
              aria-label="Account settings"
            >
              {user.name?.slice(0, 2).toUpperCase() || "AD"}
            </a>
          </div>
        </header>
        <div className="admin-content">
          <div className="workspace-heading">
            <div>
              <span className="eyebrow">WAYPOINT / ADMINISTRATION</span>
              <h1>{tab === "Overview" ? "Operations overview" : tab}</h1>
              <p>
                {adminDescriptions[tab] || "Choose a page from the sidebar."}
              </p>
            </div>
            <div className="admin-heading-actions">
              <small>
                {updatedAt
                  ? "Updated " +
                    updatedAt.toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : ""}
              </small>
              <button className="button" disabled={refreshing} onClick={load}>
                <RefreshCw size={14} className={refreshing ? "spin" : ""} />
                {refreshing ? "Refreshing?" : "Refresh"}
              </button>
            </div>
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {tab === "Overview" && (
            <AdminOverview data={data} navigate={select} />
          )}
          <AdminOperations
            key={tab}
            tab={tab}
            data={data}
            update={update}
            reload={load}
            notify={setToast}
            autoRefresh={autoRefresh}
            setAutoRefresh={setAutoRefresh}
          />
          {tab === "Users" && (
            <section className="card editor-card glass">
              <h2>User management</h2>
              <input
                aria-label="Search users"
                placeholder="Search names or emails…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Traveler</th>
                      <th>Role</th>
                      <th>Email</th>
                      <th>Status</th>
                      <th>Manage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.users
                      .filter((u) =>
                        (u.name + u.email)
                          .toLowerCase()
                          .includes(search.toLowerCase()),
                      )
                      .map((u) => (
                        <tr key={u.id}>
                          <td>
                            <b>{u.name}</b>
                            <small>{u.email}</small>
                          </td>
                          <td>{u.role}</td>
                          <td>{u.verified ? "Verified" : "Pending"}</td>
                          <td>{u.active ? "Active" : "Disabled"}</td>
                          <td>
                            {u.id !== user.id && (
                              <div className="button-row">
                                <button
                                  className="button"
                                  onClick={() => {
                                    if (
                                      confirm(
                                        `${u.active ? "Disable" : "Enable"} ${u.name}?`,
                                      )
                                    )
                                      update("admin/users/" + u.id, {
                                        active: !u.active,
                                        role: u.role,
                                      });
                                  }}
                                >
                                  {u.active ? "Disable" : "Enable"}
                                </button>
                                <button
                                  className="button"
                                  onClick={() => {
                                    if (
                                      confirm(
                                        `Change ${u.name} to ${u.role === "admin" ? "traveler" : "administrator"}?`,
                                      )
                                    )
                                      update("admin/users/" + u.id, {
                                        active: u.active,
                                        role:
                                          u.role === "admin" ? "user" : "admin",
                                      });
                                  }}
                                >
                                  Change role
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          {tab === "Trips" && (
            <section className="card editor-card glass">
              <div className="admin-trips-head">
                <div>
                  <h2>All traveler itineraries</h2>
                  <p className="admin-trips-sub">Review, monitor and manage every trip in the workspace.</p>
                </div>
                <span className="admin-trips-count">{data.trips.length} trip{data.trips.length === 1 ? "" : "s"}</span>
              </div>
              <div className="admin-trip-list">
                {data.trips.map((t) => {
                  const tone = t.cancelled ? "cancel" : t.archived ? "archived" : t.disruptions ? "red" : t.warnings ? "amber" : "green";
                  const label = t.cancelled ? "Cancelled" : t.archived ? "Archived" : t.disruptions ? "Disrupted" : t.warnings ? "Needs a look" : "On track";
                  return (
                    <article className={"admin-trip " + tone} key={t.id}>
                      <div className="admin-trip-main">
                        <div className="admin-trip-title">
                          <b>{t.name}</b>
                          <span className={"admin-trip-status " + tone}>{label}</span>
                          {t.paused && !t.cancelled && <span className="admin-trip-flag">Monitoring paused</span>}
                        </div>
                        <div className="admin-trip-meta">
                          <span><Users size={12} /> {data.users.find((u) => u.id === t.ownerId)?.name || "Traveler"}</span>
                          <span><Route size={12} /> {t.bookings} bookings</span>
                          <span><TriangleAlert size={12} /> {t.disruptions} disruptions · {t.warnings} warnings</span>
                          <span><Wallet size={12} /> {money(t.value)}</span>
                          <span><CalendarDays size={12} /> {t.start}</span>
                          <small>{t.destination}</small>
                        </div>
                        {t.cancelled && t.cancelReason && <div className="admin-trip-reason">Cancelled: {t.cancelReason}</div>}
                      </div>
                      <div className="admin-trip-actions">
                        <a className="button" href={"/trip/" + t.id}>Open</a>
                        <button className="button" disabled={!!busyTrip} onClick={() => manageTrip(t.id, "check", {}, "Connection check complete.")}>
                          {busyTrip === t.id + ":check" ? "Checking…" : "Check now"}
                        </button>
                        <button className="button" disabled={!!busyTrip || t.cancelled} onClick={() => manageTrip(t.id, "monitoring", { paused: !t.paused }, t.paused ? "Monitoring resumed." : "Monitoring paused.")}>
                          {t.paused ? "Resume" : "Pause"}
                        </button>
                        {!t.cancelled ? (
                          <button className="button danger" disabled={!!busyTrip} onClick={() => manageTrip(t.id, "cancel", {}, "Trip cancelled.")}>Cancel</button>
                        ) : (
                          <button className="button" disabled={!!busyTrip} onClick={() => manageTrip(t.id, "archive", { archived: true }, "Trip archived.")}>Archive</button>
                        )}
                        {t.archived && (
                          <button className="button" disabled={!!busyTrip} onClick={() => manageTrip(t.id, "archive", { archived: false }, "Trip restored.")}>Restore</button>
                        )}
                      </div>
                    </article>
                  );
                })}
                {!data.trips.length && <p className="empty">No trips to manage yet.</p>}
              </div>
            </section>
          )}
          {tab === "Support" && (
            <Support tickets={data.tickets} admin reload={load} />
          )}
          {tab === "Policies" && (
            <section className="card editor-card glass">
              <h2>Provider refund policies</h2>
              <p>
                Saving applies the policy to all current bookings with this
                exact provider name. Future bookings retain their manually
                entered policy until this is applied again.
              </p>
              <Form
                onSubmit={async (v) => {
                  await api("admin/policies", {
                    provider: v.provider,
                    refund: Number(v.refund) / 100,
                    hours: Number(v.hours),
                  });
                  load();
                }}
              >
                <div className="form-grid">
                  <label>
                    Exact provider name
                    <input
                      name="provider"
                      required
                      placeholder="IndiGo · 6E 204"
                    />
                  </label>
                  <label>
                    Refund (%)
                    <input
                      name="refund"
                      type="number"
                      min={0}
                      max={100}
                      required
                    />
                  </label>
                  <label>
                    Deadline (hours before departure)
                    <input
                      name="hours"
                      type="number"
                      min={0}
                      max={8760}
                      required
                      defaultValue={24}
                    />
                  </label>
                </div>
              </Form>
              {data.policies.map((p) => (
                <div className="inventory-row" key={p.id}>
                  <b>{p.provider}</b>
                  <span>
                    {p.refund * 100}% until {p.hours}h before departure
                  </span>
                </div>
              ))}
            </section>
          )}
          {tab === "Audit log" && (
            <section className="card editor-card glass">
              <h2>Audit trail</h2>
              <p>
                Latest 500 persisted events. Entries cannot be edited through
                the app.
              </p>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Actor</th>
                      <th>Action</th>
                      <th>Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.audit.map((a) => (
                      <tr key={a.id}>
                        <td>{new Date(a.at).toLocaleString()}</td>
                        <td>
                          {data.users.find((u) => u.id === a.userId)?.name}
                        </td>
                        <td>{a.action}</td>
                        <td>{a.detail || a.objectId}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          {tab === "Email outbox" && (
            <section className="card editor-card glass">
              <h2>Email delivery log</h2>
              <p className="notice">
                Admin trip updates are sent using the configured email service.
                Account verification and password reset messages remain local previews.
              </p>
              {data.outbox.map((m) => (
                <article className="mail-item" key={m.id}>
                  <div className="row-between">
                    <b>{m.subject}</b>
                    <span className={`tag mail-status-${String(m.status || "local-only").replaceAll("_", "-")}`}>
                      {({ sent: "SENT", failed: "FAILED", not_configured: "NOT CONFIGURED", unavailable: "UNAVAILABLE", "local-only": "LOCAL PREVIEW" })[m.status] || String(m.status || "local-only").toUpperCase()}
                    </span>
                  </div>
                  <small>
                    To: {m.to} · {new Date(m.at).toLocaleString()}
                  </small>
                  <p>{m.body}</p>
                  {m.detail && <small className="mail-delivery-detail">{m.detail}</small>}
                  {m.body.match(
                    /http:\/\/127\.0\.0\.1:3001\/(?:#\/)?(?:reset|verify)\?token=[a-f0-9]+/,
                  ) && (
                    <a
                      className="text-button"
                      href={
                        "/" +
                        m.body
                          .match(
                            /http:\/\/127\.0\.0\.1:3001\/((?:#\/)?(?:reset|verify)\?token=[a-f0-9]+)/,
                          )[1]
                          .replace(/^#\//, "")
                      }
                    >
                      Open local account link →
                    </a>
                  )}
                </article>
              ))}
            </section>
          )}
          {tab === "Integrations" && (
            <section className="card editor-card glass">
              <h2>Services & connections</h2>
              <p>
                Service status is explicit. No unused API-key fields or
                simulated success messages.
              </p>
              {data.integrations.map((i) => (
                <div className="integration-row" key={i.name}>
                  <div>
                    <h3>{i.name}</h3>
                    <p>{i.detail}</p>
                  </div>
                  <span className="tag">{i.status}</span>
                </div>
              ))}
            </section>
          )}
          {toast && <div className="admin-toast" role="status">{toast}</div>}
          <div className="admin-bottomline">
            <span>Waypoint Operations</span>
            <span>Local edition · Supplier actions are simulated</span>
          </div>
        </div>
      </main>
    </div>
  );
}
