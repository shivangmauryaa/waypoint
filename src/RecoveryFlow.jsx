import React, { useEffect, useRef, useState } from "react";
import {
  Plane,
  BedDouble,
  Car,
  UtensilsCrossed,
  Star,
  Sparkles,
  ArrowRight,
  Check,
  ShieldCheck,
  RefreshCw,
  CalendarDays,
  MapPin,
  Wallet,
  Users,
  Send,
  SlidersHorizontal,
  Download,
  Ticket,
  X,
  ChevronDown,
  TriangleAlert,
} from "lucide-react";
import { categoryPhotos, destinationPhoto, TripPhoto } from "./BuilderVisuals";
import "./recovery-flow.css";

const CATEGORIES = [
  { key: "flights", label: "Flights", title: "Flight Options", icon: Plane },
  { key: "hotels", label: "Hotels", title: "Hotel Options", icon: BedDouble },
  {
    key: "transfers",
    label: "Airport Transport",
    title: "Airport Transfer",
    icon: Car,
  },
  {
    key: "restaurants",
    label: "Restaurants",
    title: "Restaurant Options",
    icon: UtensilsCrossed,
  },
  {
    key: "activities",
    label: "Activities",
    title: "Activities & Experiences",
    icon: Star,
  },
];
const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
const time = (value) =>
  value
    ? new Date(value).toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";
const date = (value) =>
  value
    ? new Date(
        value.length === 10 ? `${value}T12:00:00+05:30` : value,
      ).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      })
    : "Not set";
const selectedItems = (build) =>
  [
    build.selection.flight,
    build.selection.returnFlight,
    build.selection.hotel,
    ...(build.selection.transfers || []),
    ...(build.selection.restaurants || []),
    ...(build.selection.activities || []),
  ].filter(Boolean);
const title = (item) =>
  item.name || item.source || item.title || "Travel option";
const subtitle = (item) =>
  item.category === "flights"
    ? `${item.origin} → ${item.destination} · ${time(item.departAt)} – ${time(item.arriveAt)}`
    : item.category === "hotels"
      ? `${item.nights} nights · ${money(item.pricePerNight)}/night`
      : item.category === "transfers"
        ? `${item.vehicle || "Airport transfer"} · ${item.etaMinutes || "25–35"} min`
        : item.cuisine || item.activityKind || "Local experience";
const photo = (item, city) =>
  item.photoUrl ||
  item.imageUrl ||
  (item.category === "activities"
    ? destinationPhoto(city)
    : categoryPhotos[item.category]);
const isActive = (job) =>
  ["SEARCHING", "PARTIAL", "QUEUED"].includes(job?.state);
const quickRepliesFor = (question, destination = "") => {
  if (/where are you right now|where are you trying to get to/i.test(question))
    return ["Mumbai", "Delhi", "Bengaluru", "Goa", "Jaipur"].filter(
      (city) => city.toLowerCase() !== destination.toLowerCase(),
    );
  if (/how many people are travelling/i.test(question))
    return ["1 traveler", "2 travelers", "3 travelers"];
  if (/approximate budget/i.test(question))
    return ["₹10,000 INR", "₹20,000 INR", "₹50,000 INR"];
  if (/hotel/i.test(question))
    return ["Show hotel options", "Budget hotel", "Comfortable hotel"];
  return [];
};

function IconBadge({ category, children }) {
  const Icon =
    CATEGORIES.find((entry) => entry.key === category)?.icon || Sparkles;
  return (
    <span className={`rf-icon rf-${category || "flights"}`}>
      {children || <Icon size={22} />}
    </span>
  );
}

function OptionCard({ item, selected, onSelect, busy, city }) {
  const [badLogo, setBadLogo] = useState(false);
  const brand =
    item.providerId ||
    String(item.source || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-");
  return (
    <article className={`rf-option ${selected ? "selected" : ""}`}>
      <div className="rf-option-main">
        {item.category === "flights" ? (
          <span className="rf-brand">
            {!badLogo && brand ? (
              <img
                src={`/api/logos/${brand}`}
                alt={item.source}
                onError={() => setBadLogo(true)}
              />
            ) : (
              <Plane size={25} />
            )}
          </span>
        ) : (
          <TripPhoto
            className="rf-thumb"
            src={photo(item, city)}
            alt={title(item)}
          />
        )}
        <div>
          <strong>{title(item)}</strong>
          {item.rating && (
            <span className="rf-rating">
              <Star size={12} fill="currentColor" /> {item.rating}{" "}
              <small>rating</small>
            </span>
          )}
          <p>{subtitle(item)}</p>
        </div>
        <b className="rf-option-price">
          {item.priceUnknown ? "Check price" : money(item.price)}
          <small>
            {item.category === "hotels" ? "total stay" : "estimated total"}
          </small>
        </b>
      </div>
      <div className="rf-option-footer">
        <span>
          {item.category === "flights"
            ? item.stops
              ? `${item.stops} stop`
              : "Non-stop"
            : item.refundable
              ? "Free cancellation"
              : item.amenities?.slice(0, 2).join(" · ") ||
                item.fidelity ||
                "Estimated offer"}
        </span>
        <button
          className={selected ? "rf-primary" : "rf-button"}
          onClick={() => onSelect(item, selected)}
          disabled={busy}
        >
          {selected ? (
            <>
              <Check size={13} /> Selected
            </>
          ) : (
            "Select"
          )}
        </button>
      </div>
    </article>
  );
}

function Itinerary({ build, compact = false }) {
  return (
    <section className="rf-panel rf-itinerary">
      <header>
        <h2>Your {compact ? "updated" : "planned"} itinerary</h2>
        <span>{build.itinerary?.length || 0} days</span>
      </header>
      {(build.itinerary || []).map((day) => (
        <div key={day.date}>
          <h3>{date(day.date)}</h3>
          {day.events
            .filter((event) => !compact || event.itemId)
            .map((event, index) => (
              <div className="rf-timeline-row" key={`${event.title}-${index}`}>
                <IconBadge category={event.category} />
                <div>
                  <small>{event.time}</small>
                  <b>{event.title}</b>
                  <p>{event.subtitle}</p>
                </div>
              </div>
            ))}
        </div>
      ))}
      {!build.itinerary?.length && (
        <p>Your schedule will appear after you choose a flight and hotel.</p>
      )}
    </section>
  );
}

export function RecoveryFlow({ build, user, busy, error, onRun }) {
  const searching = Object.values(build.jobs || {}).some(isActive);
  const collecting = ["collect", "configured"].includes(build.phase);
  const [stage, setStage] = useState(
    build.status === "partial" || build.status === "booked"
      ? "review"
      : build.phase === "review"
        ? "options"
        : "chat",
  );
  const [tab, setTab] = useState("all");
  const [expanded, setExpanded] = useState({});
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [booking, setBooking] = useState(false);
  const [savedId, setSavedId] = useState(build.savedTripId || "");
  const [details, setDetails] = useState(null);
  const [progressOpen, setProgressOpen] = useState(true);
  const [now, setNow] = useState(Date.now());
  const logRef = useRef(null);
  const draftRef = useRef(null);
  const locked = busy || booking;
  const selectionsLocked = locked || Boolean(build.attempts?.length);
  const selected = selectedItems(build);
  const ids = new Set(selected.map((item) => item.id));
  const totalFound = CATEGORIES.reduce(
    (count, category) => count + (build.results[category.key]?.length || 0),
    0,
  );
  const latestQuestionMessage = [...build.conversation]
    .reverse()
    .find((message) => message.role === "assistant" && message.questions?.length);
  const completed =
    build.status === "booked" && Boolean(savedId || build.savedTripId);
  const tripId = savedId || build.savedTripId;
  const failures = (build.attempts || []).filter(
    (attempt) => attempt.status === "FAILED",
  );
  const remaining = (build.cost.budget || 0) - build.cost.total;
  const progress = Math.min(
    100,
    Math.round((build.cost.total / Math.max(1, build.cost.budget)) * 100),
  );

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("waypoint:recovery-mode", { detail: true }),
    );
    return () =>
      window.dispatchEvent(
        new CustomEvent("waypoint:recovery-mode", { detail: false }),
      );
  }, []);
  useEffect(() => {
    if (searching || collecting) setStage("chat");
    else if (build.phase === "review") setStage("options");
  }, [searching, collecting, build.phase]);
  useEffect(() => {
    if (!searching) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [searching]);
  useEffect(() => {
    logRef.current?.scrollTo({
      top: logRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [build.conversation.length]);

  const send = async (message) => {
    if (selectionsLocked || !message.trim()) return;
    const result = await onRun("/message", { message: message.trim() });
    if (result) {
      setDraft("");
      setStage("chat");
    }
  };
  const choose = (item, alreadySelected) =>
    !selectionsLocked &&
    onRun(alreadySelected ? "/remove" : "/select", {
      category: item.category,
      itemId: item.id,
    });
  const browse = (key = "all") => {
    if (build.attempts?.length) return;
    setTab(key);
    setStage("options");
  };
  const save = async () => {
    const saved = await onRun("/save", {});
    if (saved?.id) setSavedId(saved.id);
  };
  const book = async () => {
    if (locked) return;
    setBooking(true);
    try {
      if (build.status === "booked") {
        await save();
        return;
      }
      const confirmed = await onRun("/confirm", {});
      if (!confirmed) return;
      const result = await onRun("/book", {});
      if (result?.status === "booked") await save();
    } finally {
      setBooking(false);
    }
  };
  const recover = async (attempt) => {
    setBooking(true);
    try {
      const result = await onRun(`/attempts/${attempt.id}/recover`, {});
      if (result?.status === "booked") await save();
    } finally {
      setBooking(false);
    }
  };
  const quickDraft = (message) => {
    setDraft(message);
    draftRef.current?.focus();
  };
  const budgetPanel = (action = true) => (
    <div className="rf-budget">
      <div>
        <span>{completed ? "Total trip cost" : "Estimated total"}</span>
        <strong>{money(build.cost.total)}</strong>
        <small>for {build.request.travelers || 1} traveler(s)</small>
      </div>
      <details>
        <summary>View cost breakdown</summary>
        {build.cost.lines.map((line, index) => (
          <p key={index}>
            {line.label}
            <b>{money(line.amount)}</b>
          </p>
        ))}
      </details>
      {build.cost.budget > 0 && (
        <>
          <p>
            Your budget <b>{money(build.cost.budget)}</b>
          </p>
          <div className={`rf-budget-track ${remaining < 0 ? "over" : ""}`}>
            <span style={{ width: `${progress}%` }} />
          </div>
          <small className={remaining < 0 ? "rf-warning" : "rf-green"}>
            {money(Math.abs(remaining))}{" "}
            {remaining < 0 ? "over budget" : "remaining"}
          </small>
        </>
      )}
      {!completed && (
        <div className="rf-assurance">
          <ShieldCheck size={24} />
          <div>
            <b>Nothing is booked until you confirm.</b>
            <small>
              Review your choices first. Supplier reservations are simulated.
            </small>
          </div>
        </div>
      )}
      {action && !completed && (
        <button
          className="rf-primary rf-wide"
          disabled={locked || !build.ready || failures.length > 0}
          onClick={stage === "review" ? book : () => setStage("review")}
        >
          {booking ? (
            <>
              <RefreshCw className="spin" size={16} /> Completing your plan…
            </>
          ) : stage === "review" ? (
            build.status === "booked" ? (
              "Save confirmed plan to My Trips"
            ) : (
              "Confirm & book selected plan"
            )
          ) : (
            <>
              Review & Confirm Manually <ArrowRight size={16} />
            </>
          )}
        </button>
      )}
      {!build.ready && !completed && (
        <small>Select a flight and hotel to continue.</small>
      )}
    </div>
  );

  return (
    <div
      className={`recovery-flow rf-stage-${completed ? "confirmed" : stage}${!completed && stage === "chat" ? " rf-chat-fullscreen" : ""}`}
    >
      {error && (
        <div className="rf-error" role="alert">
          <TriangleAlert size={17} />
          {error}
        </div>
      )}
      {editing && (
        <div className="rf-modal-backdrop">
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Edit recovery details"
            className="rf-modal"
          >
            <header>
              <h2>Recovery Control</h2>
              <button
                className="rf-button"
                onClick={() => setEditing(false)}
                aria-label="Close"
              >
                <X size={17} />
              </button>
            </header>
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                const result = await onRun("/request", {
                  origin: form.get("origin"),
                  destination: form.get("destination"),
                  date: form.get("date"),
                  budget: Number(form.get("budget")),
                  travelers: Number(form.get("travelers")),
                });
                if (result) setEditing(false);
              }}
            >
              {[
                ["origin", "Current location"],
                ["destination", "Destination"],
                ["date", "Travel date"],
                ["budget", "Budget (INR)"],
                ["travelers", "Travelers"],
              ].map(([key, label]) => (
                <label key={key}>
                  {label}
                  <input
                    required
                    name={key}
                    defaultValue={build.request[key] || ""}
                    type={
                      key === "date"
                        ? "date"
                        : ["budget", "travelers"].includes(key)
                          ? "number"
                          : "text"
                    }
                    min={key === "travelers" ? 1 : 0}
                  />
                </label>
              ))}
              <button className="rf-primary" disabled={locked}>
                Update & search again
              </button>
            </form>
          </section>
        </div>
      )}
      {details && (
        <div className="rf-modal-backdrop">
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Booking details"
            className="rf-modal"
          >
            <header>
              <h2>{details.title}</h2>
              <button
                className="rf-button"
                onClick={() => setDetails(null)}
                aria-label="Close"
              >
                <X size={17} />
              </button>
            </header>
            <p>
              Reference: <b>{details.reference}</b>
            </p>
            <p>Status: {details.status}</p>
            <p>{money(details.amount)}</p>
            <p>Demo supplier confirmation. Your plan is saved in Waypoint.</p>
          </section>
        </div>
      )}
      <div className="rf-layout">
        <main className="rf-main">
          {!completed && (
            <header className="rf-heading">
              <div className="rf-kicker">
                <Sparkles size={21} /> AI Recovery <span>Travel assistant</span>
              </div>
              <div>
                <h1>
                  {stage === "chat"
                    ? "Let’s get you back on track ✨"
                    : stage === "review"
                      ? "Review your recovery plan"
                      : "Your recovery options are ready ✨"}
                </h1>
                {stage !== "chat" && (
                  <button
                    className="rf-button"
                    disabled={selectionsLocked}
                    onClick={() => setEditing(true)}
                  >
                    <SlidersHorizontal size={15} /> Modify search
                  </button>
                )}
              </div>
              <p>
                {stage === "chat"
                  ? "Tell me what happened and I’ll find the best way forward — flights, hotels, transport and more."
                  : "Choose the best alternatives for your situation, budget and preferences."}
              </p>
            </header>
          )}

          {completed ? (
            <>
              <section className="rf-success">
                <span className="rf-success-check">
                  <Check size={30} />
                </span>
                <h1>Your recovery plan is confirmed! 🎉</h1>
                <p>
                  Your selected demo bookings have been confirmed and added to
                  your trip.
                </p>
                <div className="rf-success-pills">
                  <span>
                    <Ticket size={18} />
                    {build.attempts.length} services confirmed
                  </span>
                  <span>
                    <Check size={18} />
                    Plan added to My Trips
                  </span>
                  {build.cost.budget > 0 && (
                    <span>
                      <Wallet size={18} />
                      {money(Math.max(0, remaining))} budget remaining
                    </span>
                  )}
                </div>
                <div className="rf-success-actions">
                  <a className="rf-primary" href={`/trip/${tripId}`}>
                    View Updated Trip <ArrowRight size={16} />
                  </a>
                  <a
                    className="rf-button"
                    href={`/api/trips/${tripId}/export.csv`}
                    download
                  >
                    <Download size={16} />
                    Download itinerary
                  </a>
                  <a className="rf-button" href={`/trip/${tripId}/overview`}>
                    View bookings
                  </a>
                  <a className="rf-button" href="/build?mode=auto">
                    <RefreshCw size={16} />
                    Make another change
                  </a>
                </div>
              </section>
              <section className="rf-panel">
                <header>
                  <div>
                    <h2>Confirmed Bookings</h2>
                    <p>All details have been added to your trip.</p>
                  </div>
                  <span className="rf-tag">Plan added to My Trips</span>
                </header>
                {build.attempts.map((attempt) => (
                  <div className="rf-booking" key={attempt.id}>
                    <IconBadge category={attempt.category} />
                    <TripPhoto
                      className="rf-booking-photo"
                      src={photo(
                        { category: attempt.category },
                        build.request.destination,
                      )}
                      alt=""
                    />
                    <div>
                      <b>{attempt.title}</b>
                      <span className="rf-tag">Confirmed · demo</span>
                      <p>
                        {date(build.request.date)} · {attempt.reference}
                      </p>
                    </div>
                    <strong>{money(attempt.amount)}</strong>
                    <button
                      className="rf-button"
                      onClick={() => setDetails(attempt)}
                    >
                      View details
                    </button>
                  </div>
                ))}
              </section>
            </>
          ) : stage === "chat" ? (
            <>
              <section
                className="rf-conversation"
                ref={logRef}
                aria-label="Recovery conversation"
                aria-live="polite"
              >
                {build.conversation.map((message, index) => (
                  <div className={`rf-message ${message.role}`} key={index}>
                    <span className="rf-avatar">
                      {message.role === "user" ? (
                        (user?.name || "Traveler")
                          .split(" ")
                          .map((part) => part[0])
                          .join("")
                          .slice(0, 2)
                      ) : (
                        <Plane size={22} />
                      )}
                    </span>
                    <div>
                      <p>{message.text}</p>
                      {message.questions?.length > 0 && (
                        <div className="rf-followup-questions">
                          <ul>
                            {message.questions.map((question) => (
                              <li key={question}>{question}</li>
                            ))}
                          </ul>
                          {message === latestQuestionMessage &&
                            message.questions.map((question) => {
                              const suggestions = quickRepliesFor(
                                question,
                                build.request.destination || "",
                              );
                              return suggestions.length ? (
                                <div className="rf-quick-replies" key={question} aria-label={`Quick answers for ${question}`}>
                                  {suggestions.map((suggestion) => (
                                    <button type="button" key={suggestion} disabled={locked} onClick={() => send(suggestion)}>
                                      {suggestion}
                                    </button>
                                  ))}
                                </div>
                              ) : null;
                            })}
                        </div>
                      )}
                      {message.options?.items?.map((item) => (
                        <button
                          key={item.id}
                          className="rf-button"
                          disabled={locked}
                          onClick={() =>
                            onRun("/select", {
                              category: message.options.category,
                              itemId: item.id,
                            })
                          }
                        >
                          {title(item)} · {money(item.price)}
                        </button>
                      ))}
                      <time>{time(message.at)}</time>
                    </div>
                  </div>
                ))}
              </section>
              {!collecting && (
                <section className="rf-panel rf-progress">
                  <header>
                    <IconBadge>
                      <RefreshCw
                        size={24}
                        className={searching ? "spin" : ""}
                      />
                    </IconBadge>
                    <div>
                      <h2>
                        {searching
                          ? "Searching for the best options…"
                          : "Your search results are ready"}
                      </h2>
                      <p>Comparing available options for your journey.</p>
                    </div>
                    <span className="rf-live-dot" />
                    <small>
                      {searching ? "Search in progress" : "Search complete"}
                    </small>
                    <button
                      className="rf-button"
                      aria-label="Toggle search progress"
                      aria-expanded={progressOpen}
                      onClick={() => setProgressOpen(!progressOpen)}
                    >
                      <ChevronDown size={15} />
                    </button>
                  </header>
                  {progressOpen && (
                    <>
                      <div className="rf-stations">
                        {CATEGORIES.map(({ key, label }) => {
                          const job = build.jobs[key] || {};
                          const count = build.results[key]?.length || 0;
                          const percent =
                            job.state === "COMPLETED"
                              ? 100
                              : Math.min(
                                  95,
                                  (count / Math.max(1, job.total || 1)) * 100,
                                );
                          return (
                            <div key={key}>
                              <IconBadge category={key} />
                              <b>{label}</b>
                              <small>
                                {job.state === "COMPLETED"
                                  ? "Complete"
                                  : ["FAILED", "TIMEOUT", "CANCELLED"].includes(
                                        job.state,
                                      )
                                    ? job.state.toLowerCase()
                                    : "Searching…"}
                              </small>
                              <div className="rf-progress-track">
                                <span style={{ width: `${percent}%` }} />
                              </div>
                              <small>
                                {count} options found
                                {job.startedAt && isActive(job)
                                  ? ` · ${Math.max(0, Math.floor((now - Date.parse(job.startedAt)) / 1000))}s`
                                  : ""}
                              </small>
                              {["FAILED", "TIMEOUT"].includes(job.state) && (
                                <button
                                  className="rf-retry-category"
                                  disabled={locked}
                                  onClick={() => onRun("/search", { categories: [key], force: true })}
                                >
                                  Retry {label}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <div className="rf-found">
                        <h3>Found so far (live results)</h3>
                        <div>
                          {CATEGORIES.map(({ key, label }) => (
                            <button key={key} onClick={() => browse(key)}>
                              <IconBadge category={key} />
                              <b>
                                {build.results[key]?.length || 0}
                                <small>{label}</small>
                              </b>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="rf-analyzing">
                        <span>•••</span>
                        {searching ? (
                          "Analyzing prices and arrival times to find the best combination for you…"
                        ) : (
                          <button onClick={() => browse()}>
                            Explore {totalFound} recovery options{" "}
                            <ArrowRight size={15} />
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </section>
              )}
              <form
                className="rf-panel rf-composer"
                onSubmit={(event) => {
                  event.preventDefault();
                  send(draft);
                }}
              >
                <div>
                  <input
                    ref={draftRef}
                    aria-label="Message the recovery assistant"
                    placeholder="Ask anything about your trip…"
                    maxLength={2000}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                  />
                  <button
                    className="rf-primary"
                    disabled={locked || !draft.trim()}
                    aria-label="Send message"
                  >
                    <Send size={20} />
                  </button>
                </div>
                <div className="rf-quick-actions">
                  <button
                    type="button"
                    disabled={locked || collecting}
                    onClick={() => onRun("/search", { force: true })}
                  >
                    <RefreshCw size={13} /> Search again
                  </button>
                  <button type="button" onClick={() => setEditing(true)}>
                    <Wallet size={13} /> Change budget
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      quickDraft("Show me different hotel options")
                    }
                  >
                    <BedDouble size={13} /> Change hotel
                  </button>
                  <button
                    type="button"
                    onClick={() => quickDraft("Find the cheapest options")}
                  >
                    Cheaper options
                  </button>
                  <button
                    type="button"
                    onClick={() => quickDraft("Add more activities")}
                  >
                    Things to do
                  </button>
                </div>
              </form>
            </>
          ) : stage === "options" ? (
            <>
              <nav
                className="rf-category-tabs"
                aria-label="Recovery option categories"
              >
                <button
                  className={tab === "all" ? "selected" : ""}
                  onClick={() => setTab("all")}
                >
                  All options ({totalFound})
                </button>
                {CATEGORIES.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    className={tab === key ? "selected" : ""}
                    onClick={() => setTab(key)}
                  >
                    <Icon size={16} />
                    {label} ({build.results[key]?.length || 0})
                  </button>
                ))}
              </nav>
              {CATEGORIES.filter(
                (category) => tab === "all" || tab === category.key,
              ).map(({ key, title: heading, icon: Icon }) => (
                <section className="rf-panel rf-options-section" key={key}>
                  <header>
                    <IconBadge category={key} />
                    <div>
                      <h2>{heading}</h2>
                      <p>
                        {build.results[key]?.length || 0} options found ·{" "}
                        {key === "flights" ? `${build.request.origin} → ` : ""}
                        {build.request.destination} · {date(build.request.date)}
                      </p>
                    </div>
                    {(build.results[key]?.length || 0) > 3 && (
                      <button
                        className="rf-text-button"
                        onClick={() =>
                          setExpanded({ ...expanded, [key]: !expanded[key] })
                        }
                      >
                        {expanded[key] ? "Show less" : "View more"}
                        <ArrowRight size={14} />
                      </button>
                    )}
                  </header>
                  <div className="rf-options-grid">
                    {(build.results[key] || [])
                      .slice(0, expanded[key] ? undefined : 3)
                      .map((item) => (
                        <OptionCard
                          key={item.id}
                          item={item}
                          selected={ids.has(item.id)}
                          onSelect={choose}
                          busy={selectionsLocked}
                          city={build.request.destination}
                        />
                      ))}
                  </div>
                  {!build.results[key]?.length && (
                    <div className="rf-empty">
                      No options available in this category.{" "}
                      <button
                        className="rf-button"
                        disabled={locked}
                        onClick={() =>
                          onRun("/search", { categories: [key], force: true })
                        }
                      >
                        Search again
                      </button>
                    </div>
                  )}
                </section>
              ))}
              <button className="rf-button" onClick={() => setStage("chat")}>
                <Sparkles size={16} /> Continue chatting with the assistant
              </button>
            </>
          ) : (
            <>
              <button
                className="rf-button"
                disabled={selectionsLocked}
                onClick={() => browse()}
              >
                ← Back to recovery options
              </button>
              <Itinerary build={build} />
              {!!build.conflicts?.length && (
                <section className="rf-panel">
                  <h2>Review these details</h2>
                  {build.conflicts.map((conflict, index) => (
                    <p className="rf-warning" key={index}>
                      {conflict.message}
                    </p>
                  ))}
                </section>
              )}
              {failures.map((attempt) => (
                <section className="rf-panel rf-failure" key={attempt.id}>
                  <h2>
                    <TriangleAlert size={20} /> A booking needs your attention
                  </h2>
                  <p>
                    {attempt.title}: {attempt.failureReason}
                  </p>
                  <p>
                    Alternative: <b>{attempt.replacementTitle}</b> ·{" "}
                    {money(attempt.replacementPrice)}
                  </p>
                  <button
                    className="rf-primary"
                    disabled={locked || !attempt.replacementId}
                    onClick={() => recover(attempt)}
                  >
                    Confirm this replacement & finish
                  </button>
                </section>
              ))}
            </>
          )}
        </main>
        <aside className="rf-rail">
          {completed ? (
            <>
              <section className="rf-panel">
                <h2>Trip Summary</h2>
                <div className="rf-destination">
                  <TripPhoto
                    src={destinationPhoto(build.request.destination)}
                    alt={build.request.destination}
                  />
                  <div>
                    <h2>{build.request.destination}</h2>
                    <p>
                      {date(build.request.date)} ·{" "}
                      {build.request.travelers || 1} traveler(s)
                    </p>
                  </div>
                </div>
                {budgetPanel(false)}
              </section>
              <Itinerary build={build} compact />
              <a className="rf-button rf-wide" href="/build?mode=auto">
                <Sparkles size={17} /> Start another recovery
              </a>
            </>
          ) : (
            <>
              {stage === "chat" ? (
                <>
                  <section className="rf-panel rf-control">
                    <header>
                      <h2>
                        <SlidersHorizontal size={18} /> Recovery Control
                      </h2>
                      <button
                        className="rf-text-button"
                        onClick={() => setEditing(true)}
                      >
                        Edit
                      </button>
                    </header>
                    {[
                      [
                        Plane,
                        "Current location",
                        build.request.origin || "Not set",
                      ],
                      [
                        MapPin,
                        "Destination",
                        build.request.destination || "Not set",
                      ],
                      [CalendarDays, "Travel date", date(build.request.date)],
                      [Wallet, "Budget", money(build.cost.budget)],
                      [
                        Users,
                        "Travelers",
                        `${build.request.travelers || 1} Traveler(s)`,
                      ],
                    ].map(([Icon, label, value]) => (
                      <div key={label}>
                        <Icon size={20} />
                        <span>
                          <small>{label}</small>
                          <b>{value}</b>
                        </span>
                      </div>
                    ))}
                  </section>
                  <section className="rf-panel rf-live-status">
                    <header>
                      <h2>
                        <RefreshCw
                          size={17}
                          className={searching ? "spin" : ""}
                        />{" "}
                        Live Search Status
                      </h2>
                    </header>
                    {CATEGORIES.map(({ key, label, icon: Icon }) => (
                      <button key={key} onClick={() => browse(key)}>
                        <Icon size={17} />
                        <span>{label}</span>
                        <em>{build.results[key]?.length || 0} found</em>
                        <ArrowRight size={13} />
                      </button>
                    ))}
                  </section>
                  <section className="rf-panel">
                    <header>
                      <h2>Recovery preferences</h2>
                      <button
                        className="rf-text-button"
                        onClick={() => setEditing(true)}
                      >
                        Edit
                      </button>
                    </header>
                    <div className="rf-constraints">
                      <span>
                        <Check size={14} />
                        Budget {money(build.cost.budget)}
                      </span>
                      <span>
                        <Check size={14} />
                        {build.constraints?.objective || "Balanced"} options
                      </span>
                      <span>
                        <ShieldCheck size={14} />
                        Confirm before booking
                      </span>
                    </div>
                  </section>
                  <section className="rf-panel rf-live-status">
                    <h2>Decision Queue</h2>
                    {CATEGORIES.slice(0, 3).map(
                      ({ key, label, icon: Icon }) => (
                        <button key={key} onClick={() => browse(key)}>
                          <Icon size={17} />
                          <span>{label}</span>
                          <em>Review</em>
                          <ArrowRight size={13} />
                        </button>
                      ),
                    )}
                  </section>
                </>
              ) : (
                <section className="rf-panel rf-plan">
                  <header>
                    <h2>
                      <ShieldCheck size={20} /> Your Recovery Plan
                    </h2>
                    <button
                      className="rf-text-button"
                      disabled={selectionsLocked}
                      onClick={() => browse()}
                    >
                      Edit
                    </button>
                  </header>
                  {selected.map((item) => (
                    <div className="rf-plan-item" key={item.id}>
                      <IconBadge category={item.category} />
                      <div>
                        <b>{title(item)}</b>
                        <p>{subtitle(item)}</p>
                        <button
                          className="rf-text-button"
                          disabled={
                            locked ||
                            build.status === "booked" ||
                            failures.length > 0
                          }
                          onClick={() => browse(item.category)}
                        >
                          Change <ArrowRight size={12} />
                        </button>
                      </div>
                      <strong>
                        {item.priceUnknown ? "Varies" : money(item.price)}
                      </strong>
                    </div>
                  ))}
                  {!selected.length && (
                    <p>Choose your options to build a recovery plan.</p>
                  )}
                </section>
              )}
              <section className="rf-panel">
                <h2>Budget Summary</h2>
                {budgetPanel()}
              </section>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
