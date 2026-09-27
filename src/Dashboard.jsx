import { TravelerSidebar } from "./TravelerSidebar";
import React, { useState, useEffect, useRef } from "react";
import { api, go } from "./api";
import { navigate } from "./navigation";
import { BookingEditor, Inventory, TripSettings, Assistant } from "./Workspace";
import { TripWeather } from "./TripWeather";
import Ingest from "./Ingest";
import DependencyGraph from "./DependencyGraph";
import { RecoveryCenter } from "./RecoveryCenter";
import {
  Compass,
  LayoutDashboard,
  Route,
  ShieldCheck,
  SlidersHorizontal,
  ArrowUpRight,
  ArrowRight,
  Plane,
  TrainFront,
  Car,
  Building2,
  Camera,
  Utensils,
  ChevronRight,
  MapPin,
  CalendarDays,
  Users,
  Bell,
  Plus,
  Check,
  Clock,
  X,
  TriangleAlert,
  Download,
  RotateCcw,
  GitBranch,
  Leaf,
  CheckCircle2,
  Wallet,
  History,
  LoaderCircle,
  BarChart3,
  Copy,
  Menu,
  ExternalLink,
  Receipt,
  Gauge,
  ArrowUpDown,
  Sparkles,
  CloudRain,
} from "lucide-react";
import { destinationPhoto, TripPhoto } from "./BuilderVisuals";
import "./styles.css";
import "./trip-overview.css";
import "./trip-details.css";
import { TripActivity, TripInsights } from "./TripDetails";
const icons = {
  flight: Plane,
  train: TrainFront,
  transfer: Car,
  hotel: Building2,
  activity: Camera,
  event: Utensils,
};
const money = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
const time = (d) =>
  new Date(d).toLocaleTimeString("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
  });
const date = (d) =>
  new Date(d).toLocaleDateString("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
  });
const longDate = (d) =>
  new Date(`${String(d).slice(0, 10)}T12:00:00`).toLocaleDateString("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
const cityCoords = {
  Jaipur: [26.9124, 75.7873],
  Delhi: [28.6139, 77.209],
  Mumbai: [19.076, 72.8777],
  Goa: [15.2993, 74.124],
  Udaipur: [24.5854, 73.7125],
  Bengaluru: [12.9716, 77.5946],
  Bangalore: [12.9716, 77.5946],
  Agra: [27.1767, 78.0081],
  Varanasi: [25.3176, 82.9739],
};
const destinationCity = (destination = "") => destination.split(",")[0].trim();
function mapLinks(destination) {
  const city = destinationCity(destination),
    [lat, lon] = cityCoords[city] || cityCoords.Jaipur,
    padLon = 0.045,
    padLat = 0.03,
    bbox = [lon - padLon, lat - padLat, lon + padLon, lat + padLat].join(","),
    marker = `${lat}%2C${lon}`;
  return {
    city,
    embed: `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${marker}`,
    full: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=13/${lat}/${lon}`,
  };
}
export const VIEWS = [
  { slug: "overview", label: "Overview", icon: LayoutDashboard, group: "TRIP" },
  { slug: "weather", label: "Weather", icon: CloudRain, group: "TRIP" },
  {
    slug: "recovery",
    label: "Recovery center",
    icon: ShieldCheck,
    group: "TRIP",
  },
  { slug: "insights", label: "Trip insights", icon: BarChart3, group: "TRIP" },
  { slug: "activity", label: "Activity", icon: History, group: "TRIP" },
  {
    slug: "preferences",
    label: "Preferences",
    icon: SlidersHorizontal,
    group: "PLAN",
  },
  { slug: "inventory", label: "Inventory", icon: Wallet, group: "PLAN" },
  { slug: "assistant", label: "Assistant", icon: Compass, group: "PLAN" },
  {
    slug: "policies",
    label: "Refund policies",
    icon: Receipt,
    group: "PLAN",
  },
  {
    slug: "settings",
    label: "Trip settings",
    icon: SlidersHorizontal,
    group: "PLAN",
  },
];
export default function Dashboard({
  tripId,
  user,
  logout,
  section = "overview",
}) {
  const [data, setData] = useState(null),
    [modal, setModal] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [day, setDay] = useState("all"),
    [navOpen, setNavOpen] = useState(false),
    [viewSlug, setViewSlug] = useState(section),
    [graph, setGraph] = useState(false),
    [recoveryPlansOpen, setRecoveryPlansOpen] = useState(false);
  const generatedRecoveryFor = useRef("");
  useEffect(() => {
    // The itinerary section was removed; send old links to the trip overview.
    if (section === "itinerary") {
      navigate(`trip/${tripId}/overview`, { replace: true });
      return;
    }
    setViewSlug(section);
  }, [section, tripId]);
  const active = VIEWS.find((v) => v.slug === viewSlug) || VIEWS[0],
    view = active.label;
  const openView = (slug) => {
    setViewSlug(slug);
    setNavOpen(false);
    go(`trip/${tripId}/${slug}`);
  };
  const setView = (label) => {
    const target = VIEWS.find((v) => v.label === label);
    if (target) openView(target.slug);
  };
  async function request(path = "", body, method = "POST") {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/trips/" + tripId + (path ? "/" + path : ""), {
        method: body === undefined ? "GET" : method,
        headers: {
          "Content-Type": "application/json",
          "X-Waypoint-Request": "1",
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
      const json = await r.json();
      if (!r.ok) {
        if (r.status === 401) go("login");
        throw Error(json.error || "Something went wrong");
      }
      setData(json);
      if (path === "disruptions") setRecoveryPlansOpen(method !== "DELETE" && !!json.disruptions?.length);
      else if (path === "apply" || path === "undo" || path.endsWith("/restore")) setRecoveryPlansOpen(!!json.disruptions?.length);
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (viewSlug !== "recovery" || !data || busy || !data.disruptions?.length || data.plans?.length) return;
    const key = `${tripId}:${data.disruptions.map((item) => item.id).join(",")}`;
    if (generatedRecoveryFor.current === key) return;
    generatedRecoveryFor.current = key;
    request("generate-inventory", {}).then((ok) => {
      if (ok) setRecoveryPlansOpen(true);
    });
  }, [viewSlug, tripId, data, busy]);
  useEffect(() => {
    request("state");
  }, [tripId]);
  useEffect(() => {
    const timer = setInterval(() => {
      api(`trips/${tripId}/state`)
        .then((latest) => setData((current) => current ? ({
          ...current,
          cancelled: latest.cancelled,
          cancelReason: latest.cancelReason,
          cancelledAt: latest.cancelledAt,
          archived: latest.archived,
        }) : current))
        .catch(() => {});
    }, 15000);
    return () => clearInterval(timer);
  }, [tripId]);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 4500);
      return () => clearTimeout(t);
    }
  }, [toast]);
  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement;
    const dialog = document.querySelector('[role="dialog"]');
    const focusable = () => [
      ...dialog.querySelectorAll(
        "button:not(:disabled), a[href], input, select, textarea",
      ),
    ];
    focusable()[0]?.focus();
    const handleKey = (event) => {
      if (event.key === "Escape" && !busy) setModal(null);
      if (event.key !== "Tab") return;
      const items = focusable();
      const first = items[0],
        last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      previous?.focus();
    };
  }, [modal, busy]);
  if (!data)
    return (
      <div className="loading">
        <Compass size={44} />
        <h2>Finding your bearings…</h2>
        {error ? (
          <>
            <p>{error}</p>
            <button onClick={() => request("state")}>Try again</button>
          </>
        ) : (
          <LoaderCircle className="spin" />
        )}
      </div>
    );
  const affected = data.impacts.filter((i) => i.affected),
    bookings = data.trip.bookings,
    hasDisruption = data.disruptions.length > 0,
    info = data.insights;
  const tripDays = [
    ...new Set(
      bookings.map((b) =>
        new Date(b.start).toLocaleDateString("en-CA", {
          timeZone: "Asia/Kolkata",
        }),
      ),
    ),
  ];
  const destination = destinationCity(data.trip.destination),
    map = mapLinks(data.trip.destination),
    tripTotalDays = Math.max(
      1,
      Math.round(
        (Date.parse(data.trip.end) - Date.parse(data.trip.start)) / 86400000,
      ) + 1,
    ),
    nextBooking = bookings.find(
      (booking) =>
        Date.parse(booking.start) >= Date.parse(data.clock || new Date()),
    );
  async function apply(plan) {
    if (await request("apply", { planId: plan.id, version: data.version })) {
      setModal(null);
      setToast("Recovery applied. Your local itinerary is up to date.");
    }
  }
  async function duplicate() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/trips/" + tripId + "/duplicate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Waypoint-Request": "1",
        },
        body: "{}",
      });
      const json = await r.json();
      if (!r.ok) throw Error(json.error || "Could not duplicate this trip");
      go("trip/" + json.id);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  function Booking({ b, index }) {
    const Icon = icons[b.type],
      impact = data.impacts.find((i) => i.id === b.id);
    return (
      <div className={`booking ${impact.affected ? "affected" : ""}`}>
        <div className="timeline-time">
          <strong>{time(b.start)}</strong>
          <span>{date(b.start)}</span>
        </div>
        <div className={`booking-icon ${b.type}`}>
          <Icon size={19} />
        </div>
        <div className="booking-content">
          <div className="booking-heading">
            <h3>{b.title}</h3>
            <span
              className={`tag ${impact.affected ? "amber" : b.status === "recovered" ? "green" : ""}`}
            >
              {impact.direct
                ? "Disrupted"
                : impact.affected
                  ? "At risk"
                  : b.status === "recovered"
                    ? "Recovered"
                    : "Confirmed"}
            </span>
          </div>
          <p>{b.provider}</p>
          <div className="booking-meta">
            <span>
              <Clock size={12} />
              {time(b.start)} – {time(b.end)}
            </span>
            <span>
              <MapPin size={12} />
              {b.from} → {b.to}
            </span>
          </div>
          {impact.affected && (
            <div className="impact-reason">
              <TriangleAlert size={12} />
              {impact.reason}
            </div>
          )}
        </div>
        <button
          className="icon-button booking-detail"
          aria-label={`View ${b.title}`}
          onClick={() => setModal({ type: "booking", b })}
        >
          <ChevronRight size={17} />
        </button>
      </div>
    );
  }
  return (
    <div
      className={
        "admin-fullscreen traveler-shell " + (view === "Weather" ? "weather-shell " : "") + (navOpen ? "nav-open" : "")
      }
    >
      {navOpen && (
        <button
          className="admin-nav-scrim"
          aria-label="Close navigation"
          onClick={() => setNavOpen(false)}
        />
      )}
      <TravelerSidebar
        user={user}
        page="trips"
        logout={logout}
        onError={setError}
        onClose={() => setNavOpen(false)}
      />
      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <button
              className="admin-mobile-menu icon-button"
              aria-label="Open navigation"
              onClick={() => setNavOpen(true)}
            >
              <Menu size={21} />
            </button>
            <span>{data.trip.name}</span>
            <ChevronRight size={13} />
            <b>{view}</b>
          </div>
          <div>
            <span className="admin-status">
              <span className="online-dot" />
              Saved locally
            </span>
            <button
              className="icon-button"
              aria-label="View trip warnings"
              onClick={() => setModal({ type: "alerts" })}
            >
              <Bell size={18} />
            </button>
            {user.role === "admin" && (
              <a href="/admin" className="text-button">
                Admin
              </a>
            )}
            <a className="trips-top-user" href="/account">
              <b>{user.name}</b>
              <small>{user.role === "admin" ? "Administrator" : "Traveler"}</small>
            </a>
            <a href="/account" className="admin-avatar" aria-label="Account settings">
              {user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
            </a>
          </div>
        </header>
        <div
          className={`admin-content trip-page-${active.slug}${view === "Overview" ? " trip-overview-page" : ""}${view === "Weather" ? " weather-trip-workspace" : ""}${view === "Recovery center" ? ` recovery-page ${recoveryPlansOpen ? "recovery-plans-page" : "recovery-overview-page"}` : ""}`}
        >
          <nav className="trip-section-tabs" aria-label="Trip navigation">
            {VIEWS.map((item, i) => {
              const Icon = item.icon;
              return (
                <React.Fragment key={item.slug}>
                  {(i === 0 || item.group !== VIEWS[i - 1].group) && (
                    <div className="admin-nav-group">{item.group}</div>
                  )}
                  <a
                    href={`/trip/${tripId}/${item.slug}`}
                    className={active.slug === item.slug ? "selected" : ""}
                    aria-current={
                      active.slug === item.slug ? "page" : undefined
                    }
                    onClick={(e) => {
                      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
                        return;
                      e.preventDefault();
                      openView(item.slug);
                    }}
                  >
                    <Icon size={17} />
                    <span>{item.label}</span>
                    {item.slug === "recovery" && hasDisruption && (
                      <b className="admin-nav-badge">
                        {data.disruptions.length}
                      </b>
                    )}
                  </a>
                </React.Fragment>
              );
            })}
          </nav>
          {data.cancelled && (
            <section className="trip-cancelled-notice" role="status" aria-live="polite">
              <div className="trip-cancelled-icon"><TriangleAlert size={19} /></div>
              <div>
                <b>This trip has been cancelled</b>
                <p>
                  {data.cancelReason || "An administrator cancelled this trip."}
                  {data.cancelledAt && <span> · {new Date(data.cancelledAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>}
                </p>
                <small>Your trip details remain available here. Contact support if you need help with next steps.</small>
              </div>
              <a href="/support">Contact support <ArrowRight size={14} /></a>
            </section>
          )}
          {user.role === "admin" && data.ownerId !== user.id && (
            <div className="notice">
              Administrator support mode. Changes to this traveler’s trip are
              recorded in the audit log.
            </div>
          )}
          <div className="trip-actionbar">
            <button
              className="button"
              onClick={() => setModal({ type: "ingest" })}
            >
              <Download size={14} />
              Import confirmation
            </button>
            <button
              className="button"
              onClick={() => setModal({ type: "editBooking" })}
            >
              <Plus size={14} />
              Add booking
            </button>
            <button
              className="button"
              onClick={() => setModal({ type: "import" })}
            >
              <Download size={14} />
              Import trip JSON
            </button>
            <a href={`/support`} className="text-button">
              Ask support →
            </a>
            {view === "Recovery center" && <button className="button recovery-simulate" onClick={() => setModal({ type: "disruption" })}><Sparkles size={14} /> Simulate disruption</button>}
            <span className={view === "Recovery center" ? "recovery-clock" : ""}>
              {bookings.length} bookings · Simulation: {date(data.clock)}{" "}
              {time(data.clock)} IST
            </span>
          </div>
          {view !== "Weather" && <section className={`page-heading${view === "Assistant" ? " assistant-page-heading" : ""}`}>
            <div>
              <div className="eyebrow">EVERY JOURNEY DESERVES A PLAN B</div>
              <h1>
                {view === "Overview"
                  ? "Good journeys. Fewer surprises."
                  : view === "Recovery center"
                      ? "Let’s get you back on track."
                      : view === "Trip insights"
                        ? "Your journey, by the numbers."
                        : view === "Preferences"
                          ? "Your journey. Your priorities."
                          : view === "Inventory"
                            ? "A few more ways forward."
                            : view === "Assistant"
                              ? "A little help along the way."
                              : view === "Refund policies"
                                ? "Know what comes back, and when."
                                : view === "Trip settings"
                                  ? "The details make the journey."
                                  : "Every change, in one place."}
              </h1>
              <p>
                {view === "Overview"
                  ? "Your plans in one place. A way forward, whatever comes your way."
                  : view === "Trip insights"
                    ? "Understand the trip cost, timing and connections at a glance."
                    : view === "Activity"
                      ? "A clear record of recovery changes and your current plan."
                      : view === "Preferences"
                        ? "Set the trade-offs Waypoint should use for recovery options."
                        : view === "Inventory"
                          ? "Manage replacement options for each saved booking."
                          : view === "Refund policies"
                            ? "See what may be refundable before you change a booking."
                            : view === "Trip settings"
                              ? "Update trip details, simulation time and exports."
                              : "Thoughtful decisions for the trip you want to take."}
              </p>
            </div>
            {(["Overview", "Recovery center"].includes(view)) && <button
              className="button primary"
              onClick={() => setModal({ type: "disruption" })}
            >
              <Plus size={16} /> Simulate disruption
            </button>}
          </section>}
          {error && (
            <div className="error" role="alert">
              {error}
              <button className="icon-button" onClick={() => setError("")}>
                <X size={16} />
              </button>
            </div>
          )}
          {view === "Inventory" && (
            <Inventory data={data} request={request} open={setModal} />
          )}
          {view === "Assistant" && <Assistant tripId={tripId} data={data} onState={setData} onAddBooking={() => setModal({ type: "editBooking" })} onOpenRecovery={() => openView("recovery")} onOpenItinerary={() => openView("overview")} />}
          {view === "Weather" && <TripWeather tripId={tripId} data={data} onNavigate={openView} />}
          {view === "Trip insights" && info && <TripInsights tripId={tripId} data={data} info={info} />}
          {view === "Trip settings" && (
            <TripSettings
              data={data}
              request={request}
              onDuplicate={duplicate}
            />
          )}
          {!bookings.length && view === "Overview" && (
            <div className="empty">
              <Route size={35} />
              <h2>Your journey starts with a booking.</h2>
              <p>
                Add your transport, hotel check-in and activities, then connect
                them with dependency links.
              </p>
              <button
                className="button primary"
                onClick={() => setModal({ type: "editBooking" })}
              >
                Add your first booking
              </button>
            </div>
          )}
          {view === "Overview" && (
            <>
              <section className="trip-hero">
                <TripPhoto
                  className="trip-hero-photo"
                  src={destinationPhoto(destination)}
                  alt={`${destination} travel view`}
                />
                <div className="trip-hero-shade" />
                <div className="hero-content">
                  <span className="hero-label">
                    <span className="online-dot" />
                    {hasDisruption ? "TRIP UPDATE" : "UPCOMING ESCAPE"}
                  </span>
                  <h2>{data.trip.name}</h2>
                  <p>{data.trip.subtitle}</p>
                  <div className="hero-meta">
                    <span>
                      <MapPin size={14} />
                      {data.trip.destination}
                    </span>
                    <span>
                      <CalendarDays size={14} />
                      {longDate(data.trip.start)} – {longDate(data.trip.end)}
                    </span>
                    <span>
                      <Users size={14} />
                      {data.trip.travelers} travelers
                    </span>
                  </div>
                  <span className="trip-duration-pill">
                    <Clock size={13} /> {tripTotalDays} days · {bookings.length}{" "}
                    planned stops
                  </span>
                </div>
                <button
                  className="hero-link"
                  onClick={() => setGraph(!graph)}
                >
                  {graph ? "Timeline view" : "Dependency map"} <ArrowUpRight size={17} />
                </button>
              </section>
              <section className="stats">
                <div>
                  <span className="stat-icon">
                    <Route size={20} />
                  </span>
                  <div>
                    <span>Connected bookings</span>
                    <strong>
                      {bookings.length}
                      <small>Across your whole trip</small>
                    </strong>
                  </div>
                </div>
                <div>
                  <span className="stat-icon orange">
                    <ShieldCheck size={20} />
                  </span>
                  <div>
                    <span>Trip health</span>
                    <strong>
                      {hasDisruption ? "Needs attention" : "Looking good"}
                      <small>
                        {hasDisruption
                          ? `${affected.length} bookings affected`
                          : "All bookings confirmed"}
                      </small>
                    </strong>
                  </div>
                </div>
                <div>
                  <span className="stat-icon purple">
                    <Wallet size={20} />
                  </span>
                  <div>
                    <span>Booked trip value</span>
                    <strong>
                      {money(bookings.reduce((s, b) => s + b.price, 0))}
                      <small>For your travel party</small>
                    </strong>
                  </div>
                </div>
                <div>
                  <span className="stat-icon blue">
                    <GitBranch size={20} />
                  </span>
                  <div>
                    <span>Connections monitored</span>
                    <strong>
                      {bookings.reduce((s, b) => s + b.dependencies.length, 0)}
                      <small>Keeping an eye on the details</small>
                    </strong>
                  </div>
                </div>
              </section>
              <div className="dashboard-grid">
                <section className="card itinerary">
                  <div className="section-title">
                    <div>
                      <h2>
                        Your itinerary{" "}
                        <span className="count">{bookings.length}</span>
                      </h2>
                      <p>Every stop, thoughtfully connected.</p>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => setGraph(!graph)}
                    >
                      <GitBranch size={15} />
                      {graph ? "Timeline view" : "Dependency map"}
                    </button>
                  </div>
                  <div className="tabs">
                    {[
                      ["all", "Full trip"],
                      ...tripDays.map((d) => [d, date(d)]),
                    ].map(([id, label]) => (
                      <button
                        key={id}
                        className={day === id ? "selected" : ""}
                        onClick={() => setDay(id)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {graph ? (
                    <DependencyGraph
                      bookings={bookings}
                      impacts={data.impacts}
                      onSelect={(b) => setModal({ type: "booking", b })}
                    />
                  ) : (
                    <div className="bookings">
                      {bookings
                        .filter(
                          (b) =>
                            day === "all" ||
                            new Date(b.start).toLocaleDateString("en-CA", {
                              timeZone: "Asia/Kolkata",
                            }) === day,
                        )
                        .map((b, i) => (
                          <Booking b={b} index={i} key={b.id} />
                        ))}
                    </div>
                  )}
                  <div className="card-footer">
                    <ShieldCheck size={14} />
                    All times are in India Standard Time (UTC+5:30)
                  </div>
                </section>
                <aside className="right-column">
                  <section className="card trip-map-card">
                    <div className="trip-map-heading">
                      <div>
                        <span className="trip-map-icon">
                          <MapPin size={16} />
                        </span>
                        <div>
                          <h2>Trip map</h2>
                          <p>{map.city} · city overview</p>
                        </div>
                      </div>
                      <a
                        href={map.full}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Open ${map.city} map in OpenStreetMap`}
                      >
                        <ExternalLink size={15} />
                      </a>
                    </div>
                    <iframe
                      title={`${map.city} city map from OpenStreetMap`}
                      src={map.embed}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                    <div className="trip-map-legend">
                      <span>
                        <i /> Destination pin · {bookings.length} itinerary
                        items
                      </span>
                      <a
                        href="https://www.openstreetmap.org/copyright"
                        target="_blank"
                        rel="noreferrer"
                      >
                        © OpenStreetMap
                      </a>
                    </div>
                  </section>
                  <section
                    className={`resilience-card ${hasDisruption ? "disrupted" : ""}`}
                  >
                    <div className="resilience-top">
                      <span>
                        <ShieldCheck size={19} />
                      </span>
                      <span className="tag green">
                        {hasDisruption
                          ? "ACTION NEEDED"
                          : "WATCHING OVER YOUR TRIP"}
                      </span>
                    </div>
                    <h2>
                      {hasDisruption
                        ? "A detour. Not the end."
                        : "A little peace of mind."}
                    </h2>
                    <p>
                      {hasDisruption
                        ? `${affected.length} bookings may be affected. Let’s find a way to keep your journey moving.`
                        : "Your bookings are connected. If something changes, we’ll help you see the bigger picture."}
                    </p>
                    <div className="resilience-line" />
                    <div className="check-line">
                      <CheckCircle2 size={15} />
                      Dependency analysis ready
                    </div>
                    <div className="check-line">
                      <CheckCircle2 size={15} />
                      Recovery options on standby
                    </div>
                    <button
                      className="button"
                      onClick={() =>
                        hasDisruption
                          ? setView("Recovery center")
                          : setModal({ type: "disruption" })
                      }
                    >
                      {hasDisruption
                        ? "Explore recovery plans"
                        : "Try a what-if scenario"}
                      <ArrowRight size={16} />
                    </button>
                  </section>
                  {nextBooking && (
                    <section className="card trip-next-card">
                      <div className="trip-next-top">
                        <span>
                          <Clock size={15} /> NEXT UP
                        </span>
                        <span>
                          {date(nextBooking.start)} · {time(nextBooking.start)}
                        </span>
                      </div>
                      <h3>{nextBooking.title}</h3>
                      <p>{nextBooking.provider}</p>
                      <button
                        className="text-button"
                        onClick={() =>
                          setModal({ type: "booking", b: nextBooking })
                        }
                      >
                        View booking <ArrowRight size={14} />
                      </button>
                    </section>
                  )}
                  <section className="card insight">
                    <div className="section-title">
                      <h2>
                        <Leaf size={17} /> Good to know
                      </h2>
                      <span className="tiny-dot" />
                    </div>
                    {data.warnings.slice(0, 2).map((w, i) => (
                      <div className="insight-item" key={i}>
                        <span className="insight-label">CONNECTION CHECK</span>
                        <h3>{w.title}</h3>
                        <p>{w.message}</p>
                      </div>
                    ))}
                    {!data.warnings.length && (
                      <p>Your connections have comfortable buffers.</p>
                    )}
                    <button
                      className="text-button"
                      onClick={() => setModal({ type: "alerts" })}
                    >
                      View all insights <ArrowUpRight size={14} />
                    </button>
                  </section>
                  <div className="demo-note">
                    <Compass size={20} />
                    <p>
                      <strong>Built for the unexpected.</strong>
                      <br />
                      Demo availability. Real recovery logic.
                    </p>
                  </div>
                </aside>
              </div>
            </>
          )}
          {view === "Recovery center" && (
            <>
              <RecoveryCenter
                data={data}
                bookings={bookings}
                affected={affected}
                hasDisruption={hasDisruption}
                showPlans={recoveryPlansOpen}
                onShowPlans={setRecoveryPlansOpen}
                busy={busy}
                onTrigger={async (event) => {
                  const ok = await request("disruptions", event);
                  if (ok) {
                    await request("bookings/" + event.bookingId + "/generate-alternatives", {});
                    setRecoveryPlansOpen(true);
                  }
                  return ok;
                }}
                onClear={() => request("disruptions", {}, "DELETE")}
                onPreferences={() => setView("Preferences")}
                tripId={tripId}
                onGenerateOptions={(bookingId) => request("bookings/" + bookingId + "/generate-alternatives", {})}
                onReplace={(bookingId, offerId, version) => request("bookings/" + bookingId + "/replace", { offerId, version })}
                onCancelBooking={(bookingId, version) => request("bookings/" + bookingId + "/cancel", { version })}
                onUndo={() => setModal({ type: "undo" })}
              />
              {hasDisruption && recoveryPlansOpen && <>
              <div className="plans">
                {data.plans.map((plan) => (
                  <article
                    className={`card plan ${plan.recommended ? "recommended" : ""}`}
                    key={plan.id}
                  >
                    {plan.recommended && (
                      <div className="recommended-label">
                        RECOMMENDED FOR YOU
                      </div>
                    )}
                    <div className="plan-icon">
                      {plan.id === "budget" ? (
                        <Wallet />
                      ) : plan.id === "fastest" ? (
                        <Clock />
                      ) : (
                        <ShieldCheck />
                      )}
                    </div>
                    <h2>{plan.label}</h2>
                    <p>
                      {plan.changes.length} booking changes to restore a
                      feasible trip.
                    </p>
                    <div className="plan-price">
                      {money(plan.net)}
                      <span>estimated additional cost</span>
                    </div>
                    <dl>
                      <div>
                        <dt>New bookings</dt>
                        <dd>{money(plan.gross)}</dd>
                      </div>
                      <div>
                        <dt>Estimated refunds</dt>
                        <dd className="green-text">−{money(plan.refund)}</dd>
                      </div>
                      <div>
                        <dt>Original bookings kept unchanged</dt>
                        <dd>{plan.preservation}%</dd>
                      </div>
                      <div>
                        <dt>Total schedule shift¹</dt>
                        <dd>{plan.delay} min</dd>
                      </div>
                    </dl>
                    <button
                      className={`button ${plan.recommended ? "primary" : ""}`}
                      onClick={() => setModal({ type: "plan", plan })}
                    >
                      Review this plan <ArrowRight size={16} />
                    </button>
                  </article>
                ))}
              </div>
              <PlanComparison
                plans={data.plans}
                onReview={(plan) => setModal({ type: "plan", plan })}
              />
              {hasDisruption && !data.plans.length && (
                <div className="empty">
                  <TriangleAlert size={36} />
                  <h2>No feasible plan in the demo inventory.</h2>
                  <p>
                    Try increasing your budget, changing accessibility
                    requirements, or reducing the disruption. The engine never
                    recommends an impossible connection.
                  </p>
                  <button
                    className="button"
                    onClick={() => setView("Preferences")}
                  >
                    Adjust preferences
                  </button>
                </div>
              )}
              <p className="footnote">
                ¹ Sum of arrival shifts across bookings, not end-to-end trip
                delay. Refunds use illustrative booking policies. No live
                reservation or refund is made.
              </p>
              </>}
            </>
          )}
          {view === "Refund policies" && <PolicyExplainer data={data} />}
          {view === "Preferences" && (
            <Preferences
              data={data}
              busy={busy}
              save={async (values) => {
                if (await request("preferences", values, "PUT"))
                  setToast("Your travel preferences are saved.");
              }}
            />
          )}
          {view === "Activity" && <TripActivity tripId={tripId} data={data} info={info} busy={busy} setModal={setModal} />}
          <footer>
            <span>
              <Compass size={14} /> A way forward, wherever you are.
            </span>
            <button onClick={() => setModal({ type: "reset" })}>
              <RotateCcw size={13} />
              Reset demo
            </button>
            <span>WAYPOINT / INTELLIGENT TRAVEL RESILIENCE</span>
          </footer>
        </div>
      </main>
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          {toast}
        </div>
      )}
      {modal && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) setModal(null);
          }}
        >
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label={
              modal.type === "disruption"
                ? "Simulate a disruption"
                : "Trip details"
            }
          >
            <button
              className="close icon-button"
              aria-label="Close dialog"
              disabled={busy}
              onClick={() => setModal(null)}
            >
              <X size={20} />
            </button>
            {(modal.type === "editBooking" || modal.type === "offer") && (
              <BookingEditor
                data={data}
                booking={modal.b}
                offer={modal.type === "offer"}
                onSave={async (value) => {
                  const path =
                    modal.type === "offer"
                      ? "offers"
                      : modal.b?.id
                        ? "bookings/" + modal.b.id
                        : "bookings";
                  if (
                    await request(
                      path,
                      value,
                      modal.b?.id && modal.type !== "offer" ? "PUT" : "POST",
                    )
                  ) {
                    setModal(null);
                    setToast("Booking data saved.");
                  } else
                    throw Error("Could not save. Check the error details.");
                }}
              />
            )}
            {modal.type === "ingest" && (
              <Ingest
                tripId={tripId}
                edit={(b) => setModal({ type: "editBooking", b })}
              />
            )}
            {modal.type === "generate" && (
              <>
                <h2>Create sample alternatives?</h2>
                <p>
                  This replaces this trip’s offer inventory with five later
                  sample slots per booking. No real availability is fetched.
                </p>
                <button
                  className="button primary"
                  disabled={busy}
                  onClick={async () => {
                    if (await request("generate-inventory", {})) setModal(null);
                  }}
                >
                  Generate demo offers
                </button>
              </>
            )}
            {modal.type === "removeOffer" && (
              <>
                <h2>Remove this alternative?</h2>
                <p>
                  {modal.o.provider} will no longer be considered by the
                  recovery engine.
                </p>
                <button
                  className="button primary"
                  disabled={busy}
                  onClick={async () => {
                    if (await request("offers/" + modal.o.id, {}, "DELETE"))
                      setModal(null);
                  }}
                >
                  Remove offer
                </button>
              </>
            )}
            {modal.type === "deleteBooking" && (
              <>
                <h2>Remove this booking?</h2>
                <p>
                  This removes {modal.b.title} and its alternatives from the
                  local itinerary. Bookings with downstream dependency links
                  must be unlinked first.
                </p>
                <button
                  className="button primary"
                  disabled={busy}
                  onClick={async () => {
                    if (await request("bookings/" + modal.b.id, {}, "DELETE"))
                      setModal(null);
                  }}
                >
                  Remove booking
                </button>
              </>
            )}
            {modal.type === "undo" && (
              <>
                <h2>Revert the latest recovery?</h2>
                <p>
                  This restores the booking and inventory snapshot from before
                  the recovery. Any later manual edits will be replaced.
                </p>
                <button
                  className="button primary"
                  disabled={busy}
                  onClick={async () => {
                    if (await request("undo", {})) setModal(null);
                  }}
                >
                  Restore previous itinerary
                </button>
              </>
            )}
            {modal.type === "restore" && (
              <>
                <h2>Restore this itinerary point?</h2>
                <p>
                  This reverts to the bookings captured before “{modal.h.label}”
                  was applied. Any later recoveries and manual edits are
                  replaced. Inventory and disruptions are restored too.
                </p>
                <button
                  className="button primary"
                  disabled={busy}
                  onClick={async () => {
                    if (
                      await request("history/" + modal.h.id + "/restore", {})
                    ) {
                      setModal(null);
                      setToast("Itinerary restored to the selected point.");
                    }
                  }}
                >
                  Restore itinerary
                </button>
              </>
            )}
            {modal.type === "disruption" && (
              <Disruption
                clock={data.clock}
                bookings={bookings}
                busy={busy}
                submit={async (value) => {
                  if (await request("disruptions", value)) {
                    setModal(null);
                    setView("Recovery center");
                  }
                }}
              />
            )}
            {modal.type === "import" && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setError("");
                  const f = e.currentTarget.elements.tripFile.files[0];
                  if (!f) return;
                  try {
                    const json = JSON.parse(await f.text());
                    if (await request("import", json)) {
                      setModal(null);
                      setView("Overview");
                      setDay("all");
                      setToast("Your trip has been imported.");
                    }
                  } catch {
                    setError(
                      "This file is not valid JSON. Export the demo trip for a working example.",
                    );
                  }
                }}
              >
                <span className="eyebrow">BRING YOUR OWN JOURNEY</span>
                <h2>Import a trip.</h2>
                <p>
                  Upload a Waypoint JSON file with your trip, replacement
                  inventory and preferences. Export the demo as a starting
                  template.
                </p>
                <label>
                  Trip JSON
                  <input
                    type="file"
                    name="tripFile"
                    accept=".json,application/json"
                    required
                  />
                </label>
                <p className="footnote">
                  Import replaces the current local trip and clears its
                  disruption and recovery history. Export your current trip
                  first if you want to keep a copy.
                </p>
                <a className="text-button" href={`/api/trips/${tripId}/export`}>
                  <Download size={14} />
                  Export current trip JSON
                </a>
                <button
                  className="button primary wide"
                  style={{ marginTop: 24 }}
                  disabled={busy}
                >
                  Import and replace trip <ArrowRight size={16} />
                </button>
              </form>
            )}
            {modal.type === "plan" && (
              <>
                <div className="eyebrow">YOUR RECOVERY PLAN</div>
                <h2>{modal.plan.label}</h2>
                <p>Here’s what changes. All other bookings stay in place.</p>
                <div className="plan-changes">
                  {modal.plan.changes.map((c) => (
                    <div key={c.bookingId}>
                      <h3>{c.title}</h3>
                      <p>
                        {date(c.before)} {time(c.before)}{" "}
                        <ArrowRight size={13} /> {date(c.after)} {time(c.after)}
                      </p>
                      <small>{c.provider}</small>
                      <p>{c.reason}</p>
                      <strong>
                        {money(c.cost)} new · {money(c.refund)} estimated refund
                      </strong>
                    </div>
                  ))}
                </div>
                <div className="total">
                  <span>Estimated net additional cost</span>
                  <strong>{money(modal.plan.net)}</strong>
                </div>
                <p className="footnote">
                  Applies to this local demo itinerary only. Supplier
                  confirmations, actual refunds, and live booking are not
                  connected.
                </p>
                <button
                  disabled={busy}
                  className="button primary wide"
                  onClick={() => apply(modal.plan)}
                >
                  {busy ? "Updating itinerary…" : "Apply to my itinerary"}
                  <Check size={16} />
                </button>
              </>
            )}
            {modal.type === "booking" && (
              <>
                <div className="button-row">
                  <button
                    className="button"
                    onClick={() =>
                      setModal({ type: "editBooking", b: modal.b })
                    }
                  >
                    Edit booking
                  </button>
                  <button
                    className="button"
                    onClick={() =>
                      setModal({ type: "deleteBooking", b: modal.b })
                    }
                  >
                    Remove booking
                  </button>
                  <button
                    className="button"
                    disabled={busy}
                    onClick={async () => {
                      if (
                        await request(
                          "bookings/" + modal.b.id + "/duplicate",
                          {},
                        )
                      ) {
                        setModal(null);
                        setToast("Booking duplicated.");
                      }
                    }}
                  >
                    <Copy size={14} />
                    Duplicate booking
                  </button>
                </div>
                <span className="eyebrow">BOOKING DETAILS</span>
                <h2>{modal.b.title}</h2>
                <p>{modal.b.provider}</p>
                <dl className="details">
                  <div>
                    <dt>Reference</dt>
                    <dd>{modal.b.reference}</dd>
                  </div>
                  <div>
                    <dt>Schedule</dt>
                    <dd>
                      {date(modal.b.start)} · {time(modal.b.start)}–
                      {time(modal.b.end)} IST
                    </dd>
                  </div>
                  <div>
                    <dt>Party total</dt>
                    <dd>{money(modal.b.price)}</dd>
                  </div>
                  <div>
                    <dt>Demo cancellation policy</dt>
                    <dd>
                      {modal.b.refund * 100}% before{" "}
                      {date(modal.b.refundDeadline)}
                    </dd>
                  </div>
                </dl>
                <p className="footnote">
                  Later cancellation: no refund. Supplier cancellation: full
                  refund in this demo. These are sample policies, not legal
                  entitlements.
                </p>
                <button
                  className="button primary"
                  onClick={() => setModal({ type: "disruption" })}
                >
                  Simulate a change
                </button>
              </>
            )}
            {modal.type === "alerts" && (
              <>
                <span className="eyebrow">PROACTIVE INSIGHTS</span>
                <h2>Ahead of the unexpected.</h2>
                {data.warnings.map((w, i) => (
                  <div className="insight-item" key={i}>
                    <h3>{w.title}</h3>
                    <p>{w.message}</p>
                  </div>
                ))}
                {!data.warnings.length && <p>No tight connections detected.</p>}
              </>
            )}
            {modal.type === "reset" && (
              <>
                <h2>Start a fresh demo?</h2>
                <p>
                  This resets your local itinerary, preferences, disruptions and
                  recovery history to the sample Jaipur trip.
                </p>
                <button
                  disabled={busy}
                  className="button primary"
                  onClick={async () => {
                    if (await request("reset", {})) {
                      setModal(null);
                      setView("Overview");
                      setToast("Demo restored. Ready for your next scenario.");
                    }
                  }}
                >
                  Reset demo
                </button>
              </>
            )}
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
function Disruption({ bookings, busy, submit, clock }) {
  const [type, setType] = useState("delay");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        submit({
          bookingId: f.get("bookingId"),
          type,
          delayMinutes: Number(f.get("delayMinutes") || 0),
          note: f.get("note"),
        });
      }}
    >
      <span className="eyebrow">THE WHAT-IF LAB</span>
      <h2>A change of plans?</h2>
      <p>Try a scenario. We’ll trace its ripple effect across your trip.</p>
      <label>
        Affected booking
        <select name="bookingId">
          {bookings.map((b) => (
            <option value={b.id} key={b.id}>
              {b.title}
            </option>
          ))}
        </select>
      </label>
      <label>
        What happened?
        <select value={type} onChange={(e) => setType(e.target.value)}>
          {[
            ["delay", "Transport / booking delay"],
            ["cancellation", "Booking cancelled"],
            ["weather", "Weather disruption"],
            ["missed_connection", "Missed connection"],
            ["transfer_failure", "Transfer failure"],
            ["traveler_change", "I want to travel later"],
          ].map(([v, l]) => (
            <option value={v} key={v}>
              {l}
            </option>
          ))}
        </select>
      </label>
      {["delay", "weather", "traveler_change"].includes(type) && (
        <label>
          {type === "weather" ? "Weather closure (minutes)" : "Delay (minutes)"}
          <input
            name="delayMinutes"
            type="number"
            min="1"
            max="1440"
            defaultValue="120"
            required
          />
        </label>
      )}
      <label>
        Additional context <span>(optional)</span>
        <textarea
          name="note"
          placeholder="A little context about the change…"
          maxLength="500"
        />
      </label>
      <div className="simulation-note">
        <Compass size={16} />
        Simulation clock: {date(clock)} {time(clock)} IST. Change it in Trip
        settings.
      </div>
      <button className="button primary wide" disabled={busy}>
        {busy ? "Tracing the impact…" : "Find my recovery options"}
        <ArrowRight size={16} />
      </button>
    </form>
  );
}
function Preferences({ data, busy, save }) {
  return (
    <form
      className="card preferences"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        save({
          budget: Number(f.get("budget")),
          priority: f.get("priority"),
          accessible: f.get("accessible") === "on",
        });
      }}
    >
      <h2>Make the right trade-offs for you.</h2>
      <p>These preferences filter and rank your recovery options.</p>
      <label>
        Maximum additional spend (INR)
        <input
          type="number"
          name="budget"
          min="0"
          max="1000000"
          defaultValue={data.preferences.budget}
          required
        />
      </label>
      <label>
        What matters most?
        <select name="priority" defaultValue={data.preferences.priority}>
          <option value="balanced">
            A balance of time, cost and convenience
          </option>
          <option value="budget">Keep additional costs low</option>
          <option value="fastest">Get back on schedule sooner</option>
          <option value="preserve">Change as few bookings as possible</option>
        </select>
      </label>
      <label className="checkbox">
        <input
          name="accessible"
          type="checkbox"
          defaultChecked={data.preferences.accessible}
        />
        Only show accessible replacement options
      </label>
      <button className="button primary" disabled={busy}>
        Save preferences <Check size={16} />
      </button>
      <p className="footnote">
        Stored in your local JSON file. Prices and budget are totals for the
        traveling party.
      </p>
    </form>
  );
}
const riskTone = (band) =>
  band === "critical" || band === "high"
    ? "amber"
    : band === "low"
      ? "green"
      : "";
export function RiskPanel({ risks }) {
  if (!risks?.items?.length) return null;
  return (
    <section className="card risk-panel">
      <div className="section-title">
        <div>
          <h2>
            <Gauge size={17} /> Connection risk
          </h2>
          <p>
            Rule-based score from buffer slack, active disruptions and departure
            windows. Not a trained model.
          </p>
        </div>
        <span className={"tag " + riskTone(risks.band)}>
          {risks.band.toUpperCase()} · {risks.overall}/100
        </span>
      </div>
      <div className="risk-list">
        {risks.items.slice(0, 6).map((r) => (
          <div className="risk-item" key={r.id}>
            <div className="risk-item-head">
              <b>{r.title}</b>
              <span>{r.score}/100</span>
            </div>
            <div className="risk-meter">
              <i style={{ width: r.score + "%" }} data-band={r.band} />
            </div>
            {r.factors.length ? (
              <ul>
                {r.factors.slice(0, 2).map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            ) : (
              <p className="footnote">No elevated risk factors.</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
const PLAN_METRICS = [
  { key: "net", label: "Net additional cost", value: (p) => p.net },
  { key: "refund", label: "Estimated refunds", value: (p) => p.refund },
  { key: "delay", label: "Schedule shift", value: (p) => p.delay },
  { key: "changes", label: "Bookings changed", value: (p) => p.changes.length },
  {
    key: "preservation",
    label: "Original bookings kept",
    value: (p) => p.preservation,
  },
];
const planCell = (key, p) =>
  key === "changes"
    ? p.changes.length
    : key === "delay"
      ? `${p.delay} min`
      : key === "preservation"
        ? `${p.preservation}%`
        : key === "refund"
          ? `−${money(p.refund)}`
          : money(p.net);
export function PlanComparison({ plans, onReview }) {
  const [sort, setSort] = useState("net");
  if (!plans || plans.length < 2) return null;
  const metric = PLAN_METRICS.find((m) => m.key === sort) || PLAN_METRICS[0],
    rows = [...plans].sort((a, b) => metric.value(a) - metric.value(b));
  return (
    <section className="card plan-compare">
      <div className="section-title">
        <div>
          <h2>
            <BarChart3 size={17} /> Compare plans
          </h2>
          <p>
            Sorted by {metric.label.toLowerCase()} — pick a metric to re-sort.
          </p>
        </div>
        <div className="compare-sort">
          {PLAN_METRICS.map((m) => (
            <button
              key={m.key}
              className={sort === m.key ? "selected" : ""}
              onClick={() => setSort(m.key)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Plan</th>
              {PLAN_METRICS.map((m) => (
                <th
                  key={m.key}
                  className={sort === m.key ? "sorted" : ""}
                  onClick={() => setSort(m.key)}
                >
                  <ArrowUpDown size={12} /> {m.label}
                </th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td>
                  <b>{p.label}</b>
                  <small>
                    {p.recommended
                      ? "Recommended"
                      : `${p.changes.length} changes`}
                  </small>
                </td>
                {PLAN_METRICS.map((m) => (
                  <td key={m.key}>{planCell(m.key, p)}</td>
                ))}
                <td>
                  <button className="button" onClick={() => onReview(p)}>
                    Review
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
export function PolicyExplainer({ data }) {
  const policies = data.policies || [],
    total = policies.reduce((n, p) => n + p.amount, 0),
    refundable = policies.filter((p) => p.eligible || p.cancelled).length,
    forfeited = policies
      .filter((p) => !p.eligible && !p.cancelled)
      .reduce((n, p) => n + p.price, 0);
  return (
    <>
      <section className="stats insights-stats">
        <div>
          <span className="stat-icon purple">
            <Receipt size={20} />
          </span>
          <div>
            <span>Refundable now</span>
            <strong>
              {money(total)}
              <small>
                {refundable} of {policies.length} bookings eligible
              </small>
            </strong>
          </div>
        </div>
        <div>
          <span className="stat-icon orange">
            <ShieldCheck size={20} />
          </span>
          <div>
            <span>Forfeited if cancelled</span>
            <strong>
              {money(forfeited)}
              <small>Outside refund deadlines</small>
            </strong>
          </div>
        </div>
        <div>
          <span className="stat-icon">
            <Clock size={20} />
          </span>
          <div>
            <span>Trip clock</span>
            <strong>
              {date(data.clock)}
              <small>{time(data.clock)} IST</small>
            </strong>
          </div>
        </div>
      </section>
      <section className="card policy-list">
        <div className="section-title">
          <div>
            <h2>
              <Receipt size={17} /> Why each booking refunds or not
            </h2>
            <p>
              Illustrative demo policies evaluated against the trip clock. Not
              legal entitlements.
            </p>
          </div>
        </div>
        {policies.map((p) => (
          <div className="policy-row" key={p.id}>
            <div className="policy-main">
              <b>{p.title}</b>
              <small>
                {p.provider} · {money(p.price)}
              </small>
              <p>{p.note}</p>
            </div>
            <span
              className={
                "tag " +
                (p.status === "full" || p.status === "partial"
                  ? "green"
                  : p.status === "none"
                    ? "amber"
                    : "")
              }
            >
              {p.status === "full"
                ? "Full refund"
                : p.status === "partial"
                  ? `${Math.round(p.refund * 100)}% refund`
                  : p.status === "none"
                    ? "Non-refundable"
                    : "Deadline passed"}
            </span>
            <strong className="policy-amount">{money(p.amount)}</strong>
          </div>
        ))}
        {!policies.length && (
          <p className="empty">Add bookings to see their refund policies.</p>
        )}
      </section>
      <p className="footnote">
        Refunds are illustrative inputs, not issued payments. Supplier
        cancellation returns the full amount in this demo; otherwise the
        booking's refund fraction applies only before its deadline.
      </p>
    </>
  );
}
