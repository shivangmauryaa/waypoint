// Panels for the Trip Builder page. Split out so the shared helpers stay in
// one place while the page itself stays readable.

import React, { useEffect, useRef, useState } from "react";
import { api } from "./api";
import {
  Ticket,
  Check,
  TriangleAlert,
  Clock,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Send,
  MessageCircle,
  Plane,
  Users,
  CalendarDays,
  MapPin, Search, Wallet, Crown, Scale, Mountain, Utensils, UtensilsCrossed, BedDouble, Car, Leaf, Camera, ShoppingBag, Waves, Landmark, ArrowLeftRight, FileText, Upload, Compass,
} from "lucide-react";
import { destinations, categoryPhotos, destinationPhoto, DestinationAside, TripPhoto } from "./BuilderVisuals";
import {
  money,
  itemTitle,
  itemSubtitle,
  Fidelity,
  JobChip,
  BUILDER_CITIES,
} from "./Builder";

const ATTEMPT_LABEL = {
  PENDING_CONFIRMATION: "waiting",
  CONFIRMED: "confirmed (simulated)",
  BOOKED: "booked (simulated)",
  FAILED: "failed",
  CANCELLED: "cancelled",
};

export function BookingPanel({
  build,
  onConfirm,
  onBook,
  onRecover,
  onSave,
  busy,
  savedTripId,
}) {
  const basket = build.bookingSummary;
  const failed = build.attempts.filter((a) => a.status === "FAILED");
  const done = build.status === "booked" || build.status === "partial";
  return (
    <div className="builder-booking card">
      <div className="section-title">
        <div>
          <h2>
            <Ticket size={15} /> Booking basket
          </h2>
          <p>
            {basket.count} items · {money(basket.total)} · supplier bookings are
            simulated.
          </p>
        </div>
      </div>
      <ul className="basket">
        {basket.items.map((row, i) => (
          <li key={row.category + i}>
            <span>{row.label}</span>
            <strong>{row.title}</strong>
            <em>{money(row.amount)}</em>
            <Fidelity value={row.fidelity} />
          </li>
        ))}
        {!basket.count && <li className="empty-row">Nothing selected yet.</li>}
      </ul>
      {!done && (
        <div className="booking-actions">
          <button
            className="button"
            onClick={onConfirm}
            disabled={busy || !build.ready || build.status === "confirmed"}
          >
            <Check size={14} /> Confirm selection
          </button>
          <button
            className="button primary"
            onClick={onBook}
            disabled={busy || build.status !== "confirmed"}
          >
            <ShieldCheck size={14} /> Confirm & book
          </button>
        </div>
      )}
      {!!build.attempts.length && (
        <div className="attempts">
          <h4>Booking progress</h4>
          {build.attempts.map((a) => (
            <div className={"attempt " + a.status.toLowerCase()} key={a.id}>
              {a.status === "CONFIRMED" ? (
                <Check size={13} />
              ) : a.status === "FAILED" ? (
                <TriangleAlert size={13} />
              ) : (
                <Clock size={13} />
              )}
              <span>{a.title}</span>
              <small>{ATTEMPT_LABEL[a.status] || a.status}</small>
              <em>{a.reference}</em>
              {a.status === "FAILED" && a.replacementId && (
                <button
                  className="button small"
                  onClick={() => onRecover(a)}
                  disabled={busy}
                >
                  Use {a.replacementTitle} · {money(a.replacementPrice)}
                </button>
              )}
            </div>
          ))}
          {!!failed.length && (
            <p className="builder-note error-note">
              {build.attempts.length - failed.length} of {build.attempts.length}{" "}
              bookings were confirmed. Each failed item is recoverable on its
              own — the successful bookings were kept.
            </p>
          )}
        </div>
      )}
      {done && (
        <div className="booking-actions">
          <button
            className="button primary"
            onClick={onSave}
            disabled={busy || !!savedTripId}
          >
            <ArrowRight size={14} />{" "}
            {savedTripId ? "Saved to my trips" : "Save as a real trip"}
          </button>
          {savedTripId && (
            <a className="button" href={"/trip/" + savedTripId}>
              Open it in the console
            </a>
          )}
        </div>
      )}
      <p className="builder-note">
        No supplier was contacted. References such as WP-12345 are simulated
        demo values.
      </p>
    </div>
  );
}

const isoDay = (offsetDays) => {
  const now = Date.now() + offsetDays * 86400000;
  return new Date(now).toISOString().slice(0, 10);
};

export function RouteForm({ initial = {}, onSubmit, busy, onDestinationChange, submitLabel = "Search & build my trip" }) {
  const [roundTrip, setRoundTrip] = useState(!!initial.returnDate);
  const [style, setStyle] = useState("Balanced");
  const [interests, setInterests] = useState(initial.preferences?.activities || ["Sightseeing"]);
  const [form, setForm] = useState({
    origin: initial.origin || "Mumbai",
    destination: initial.destination || "Jaipur",
    date: initial.date || isoDay(7),
    returnDate: initial.returnDate || isoDay(10),
    durationDays: initial.durationDays || 3,
    travelers: initial.travelers || 2,
    budget: initial.budget ?? 20000,
    hotelStars: initial.preferences?.hotelStars || 0,
    maxTravelMinutes: initial.preferences?.maxTravelMinutes ?? "",
    notes: initial.notes || "",
  });
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  return (
    <form
      className="builder-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          ...form,
          returnDate: roundTrip ? form.returnDate : "",
          travelers: Number(form.travelers),
          budget: Number(form.budget),
          durationDays: Number(form.durationDays),
          preferences: {
            activities: interests,
            hotelStars: Number(form.hotelStars) || 0,
            maxTravelMinutes: form.maxTravelMinutes
              ? Number(form.maxTravelMinutes)
              : null,
          },
        });
      }}
    >
      <div className="trip-type" aria-label="Journey type">{[false, true].map((value) => <button type="button" key={String(value)} aria-pressed={roundTrip === value} className={roundTrip === value ? "selected" : ""} onClick={() => setRoundTrip(value)}><span>{roundTrip === value && <Check size={12} />}</span>{value ? "Round trip" : "One way"}</button>)}<small>A new adventure starts with a plan.</small></div>
      <div className="builder-form-grid">
        <label>
          Leaving from
          <select aria-label="Leaving from" value={form.origin} onChange={set("origin")}>
            {BUILDER_CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label>
          Going to
          <select aria-label="Going to" value={form.destination} onChange={(e) => { set("destination")(e); onDestinationChange?.(e.target.value); }}>
            {BUILDER_CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label>
          Departure date
          <input type="date" aria-label="Departure date" value={form.date} onChange={set("date")} required />
        </label>
        {roundTrip && <label>
          Return date
          <input type="date" min={form.date} aria-label="Return date" value={form.returnDate} onChange={set("returnDate")} />
        </label>}
        <label>
          Days on the ground
          <input type="number" min={1} max={14} aria-label="Days on the ground" value={form.durationDays} onChange={set("durationDays")} />
        </label>
        <label>
          Travelers
          <input type="number" min={1} max={20} aria-label="Travelers" value={form.travelers} onChange={set("travelers")} />
        </label>
        <label>
          Budget (INR)
          <input type="number" min={0} step={500} aria-label="Budget (INR)" value={form.budget} onChange={set("budget")} />
        </label>
        <label>
          Preferred hotel
          <select aria-label="Preferred hotel" value={form.hotelStars} onChange={set("hotelStars")}>
            <option value={0}>Any star rating</option>
            <option value={3}>3★ or better</option>
            <option value={4}>4★ or better</option>
            <option value={5}>5★ only</option>
          </select>
        </label>
        <label>
          Max travel between stops (min)
          <input type="number" min={5} max={180} aria-label="Max travel between stops (min)" value={form.maxTravelMinutes} onChange={set("maxTravelMinutes")} placeholder="No limit" />
        </label>
      </div>
      <div className="preference-section"><h3>How do you like to travel?</h3><div className="travel-styles">{[[Wallet, "Budget", "More memories, less spend", 3], [Scale, "Balanced", "A little comfort. A little adventure.", 4], [Crown, "Premium", "Make every moment special", 5]].map(([Icon, name, description, stars]) => <button type="button" key={name} aria-pressed={style === name} className={style === name ? "selected" : ""} onClick={() => { setStyle(name); setForm({ ...form, hotelStars: stars }); }}><span><Icon size={23} /></span><section><strong>{name}</strong><small>{description}</small></section>{style === name && <Check size={14} />}</button>)}</div></div>
      <div className="preference-section"><h3>Make it your kind of trip <small>Optional</small></h3><div className="interest-chips">{[[Camera, "Sightseeing"], [Mountain, "Adventure"], [Utensils, "Food"], [Leaf, "Nature"], [ShoppingBag, "Shopping"], [Waves, "Beaches"], [Landmark, "Culture"]].map(([Icon, label], i) => <button type="button" key={label} className={`interest-${i} ${interests.includes(label) ? "selected" : ""}`} aria-pressed={interests.includes(label)} onClick={() => setInterests(interests.includes(label) ? interests.filter((x) => x !== label) : [...interests, label])}><Icon size={16} />{label}{interests.includes(label) && <Check size={12} />}</button>)}</div></div>
      <div className="preference-section"><div className="destination-title"><h3>A little inspiration</h3><span>Where will you go next?</span></div><div className="destination-strip">{destinations.map((place) => <button key={place.name} type="button" className={form.destination === place.name ? "selected" : ""} aria-pressed={form.destination === place.name} onClick={() => { setForm({ ...form, destination: place.name }); onDestinationChange?.(place.name); }}><TripPhoto src={place.image} alt={place.name} /><strong>{place.name}</strong>{form.destination === place.name && <span><Check size={12} /></span>}</button>)}</div></div>
      <button className="button primary" disabled={busy}>
        <Search size={18} /> {busy ? "Finding your next adventure…" : submitLabel}<ArrowRight size={18} />
      </button>
      <p className="form-footnote">Flights, lovely stays, local flavours, and things you’ll love. All in one place.</p>
    </form>
  );
}

function SearchProgress({ build }) {
  const jobs = Object.entries(build.jobs).filter(([key]) => key !== "itinerary");
  return (
    <div className="chat-progress">
      {jobs.map(([key, job]) => (
        <div className="chat-progress-row" key={key}>
          <span>{job.label}</span>
          <small>
            {job.revealed}/{job.total || "—"}
          </small>
          <JobChip job={job} />
        </div>
      ))}
    </div>
  );
}

export function AutoChat({ build, onSend, onSelect, busy }) {
  const [text, setText] = useState("");
  const logRef = useRef(null);
  useEffect(() => {
    const node = logRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [build.conversation.length, build.phase]);
  return (
    <div className="auto-chat card">
      <header className="chat-head">
        <MessageCircle size={16} />
        <div>
          <strong>Automated recovery</strong>
          <small>
            A rule-based planner over simulated provider data — not an LLM, and
            it never invents prices or availability.
          </small>
        </div>
      </header>
      <div className="chat-log" ref={logRef}>
        {build.conversation.map((m, i) => (
          <div className={"chat-msg " + m.role} key={i}>
            {m.text && <p>{m.text}</p>}
            {!!m.questions?.length && (
              <ul className="chat-questions">
                {m.questions.map((q) => (
                  <li key={q}>
                    <Plane size={12} /> {q}
                  </li>
                ))}
              </ul>
            )}
            {m.searching && <SearchProgress build={build} />}
            {m.plan && (
              <div className="chat-plan">
                {m.plan.lines.map((l) => (
                  <div key={l.label}>
                    <span>{l.label}</span>
                    <em>{money(l.amount)}</em>
                  </div>
                ))}
                <div className="chat-plan-total">
                  <span>Total</span>
                  <strong>{money(m.plan.total)}</strong>
                </div>
                {m.plan.budget > 0 && (
                  <p className={m.plan.overBudget ? "over" : "ok"}>
                    {m.plan.overBudget
                      ? `Budget ${money(m.plan.budget)} — ${money(m.plan.overBy)} over budget`
                      : `Budget ${money(m.plan.budget)} — ${money(m.plan.remaining)} remaining`}
                  </p>
                )}
              </div>
            )}
            {!!m.changes?.length && (
              <ul className="chat-changes">
                {m.changes.map((c, k) => (
                  <li key={k}>
                    <span>{c.label}</span> {c.before} → <b>{c.after}</b>{" "}
                    <em>
                      {c.delta > 0 ? "+" : "−"}
                      {money(Math.abs(c.delta))}
                    </em>
                  </li>
                ))}
              </ul>
            )}
            {!!m.notes?.length && (
              <p className="builder-note">{m.notes.join(" ")}</p>
            )}
            {m.options && (
              <div className="chat-options">
                {m.options.items.map((item) => (
                  <button
                    key={item.id}
                    className="chat-option"
                    onClick={() => onSelect(m.options.category, item.id)}
                    disabled={busy}
                  >
                    <strong>{itemTitle(item)}</strong>
                    <small>{money(item.price)}</small>
                    <Fidelity value={item.fidelity} />
                  </button>
                ))}
              </div>
            )}
            {!!m.explanation?.length && (
              <details className="chat-explain">
                <summary>Why these choices?</summary>
                <ul>
                  {m.explanation.map((line, k) => (
                    <li key={k}>{line}</li>
                  ))}
                </ul>
              </details>
            )}
            <time>{new Date(m.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</time>
          </div>
        ))}
      </div>
      <form
        className="chat-compose"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          onSend(text.trim());
          setText("");
        }}
      >
        <input
          aria-label="Message the trip assistant"
          placeholder="e.g. Make it cheaper, or add a water park"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
        />
        <button className="button primary" disabled={busy || !text.trim()}>
          <Send size={14} /> Send
        </button>
      </form>
    </div>
  );
}

const EXAMPLES = [
  "I missed my Jaipur flight and I'm stuck in Mumbai. I have ₹20,000.",
  "My flight to Jaipur was cancelled. I'm at Mumbai airport and need another flight today, under ₹20,000.",
  "I'm stuck at the airport in Mumbai after my connection was delayed. Find the quickest way to Jaipur.",
  "I need to reach another city today. Show me nearby airports, trains and other routes.",
  "My travel budget changed. Rework my trip to Jaipur and keep the total under ₹15,000.",
  "My hotel booking fell through in Jaipur. Find a safe nearby stay within ₹5,000 per night.",
  "I'm in Jaipur. Find local food and interesting things to do near me.",
  "I'm in Mumbai and need to get to Goa this weekend on a tight budget.",
];

const RECOVERY_SCENARIOS = [
  { icon: Plane, title: "Missed flight", detail: "I missed my flight and need another way to reach my destination today.", key: "flight", image: categoryPhotos.flights, color: "blue", example: 0 },
  { icon: TriangleAlert, title: "Flight cancelled", detail: "My flight was cancelled. Find alternate flights and routes for today.", key: "cancelled", image: "/images/trip-builder/photo-1436491865332-7a61a109cc05.jpg", color: "purple", example: 1 },
  { icon: Car, title: "Stuck at airport", detail: "Help me compare airport transfers and other ways to continue my trip.", key: "transport", image: categoryPhotos.transfers, color: "teal", example: 2 },
  { icon: MapPin, title: "Need another city", detail: "Show me nearby cities and practical alternate routes.", key: "city", image: destinationPhoto("Goa"), color: "pink", example: 3 },
  { icon: Wallet, title: "Budget change", detail: "Adjust my plan to stay under my new travel budget.", key: "budget", image: destinationPhoto("Udaipur"), color: "gold", example: 4 },
  { icon: BedDouble, title: "Hotel problem", detail: "My stay fell through. Find a suitable nearby hotel.", key: "hotel", image: categoryPhotos.hotels, color: "violet", example: 5 },
  { icon: UtensilsCrossed, title: "Food nearby", detail: "Suggest local restaurants and regional dishes close to me.", key: "food", image: categoryPhotos.restaurants, color: "orange", example: 6 },
  { icon: Ticket, title: "Things to do", detail: "Find interesting attractions and activities around me.", key: "activity", image: destinationPhoto("Jaipur"), color: "rose", example: 7 },
];

export function BuildLanding({ onStart, busy }) {
  const [mode, setMode] = useState(() => new URLSearchParams(window.location.search).get("mode") === "auto" ? "auto" : "manual");
  const [destination, setDestination] = useState(() => { const city = new URLSearchParams(window.location.search).get("destination"); return BUILDER_CITIES.includes(city) ? city : "Jaipur"; });
  const [situation, setSituation] = useState(EXAMPLES[0]);
  const [showAllScenarios, setShowAllScenarios] = useState(false);
  const [recoveryTab, setRecoveryTab] = useState("describe");
  const [uploadedName, setUploadedName] = useState("");
  const [currentTrip, setCurrentTrip] = useState(null);
  useEffect(() => { if (mode !== "auto") return; let live = true; api("trips").then((trips) => { if (live && Array.isArray(trips)) setCurrentTrip(trips.find((trip) => !trip.archived) || trips[0] || null); }).catch(() => {}); return () => { live = false; }; }, [mode]);
  const cityPattern = BUILDER_CITIES.join("|");
  const fromMatch = situation.match(new RegExp(`(?:stuck in|stranded in|from|at)\\s+(?:the airport in\\s+)?(${cityPattern})`, "i"));
  const toMatch = situation.match(new RegExp(`(?:to|missed my|missed)\\s+(${cityPattern})`, "i"));
  const budgetMatch = situation.match(/INR\s*([\d,]+)/i) || situation.match(/\u20b9\s*([\d,]+)/i);
  const travelerMatch = situation.match(/(\d+)\s*(?:traveler|passenger|people)/i);
  const previewOrigin = fromMatch?.[1] || "Mumbai", previewDestination = toMatch?.[1] || "Jaipur";
  const rupee = String.fromCharCode(0x20b9);
  const previewBudget = budgetMatch ? `${rupee}${Number(budgetMatch[1].replaceAll(",", "")).toLocaleString("en-IN")}` : `${rupee}20,000`;
  const previewTravelers = travelerMatch?.[1] || "1";
  return (
    <div className={`builder-landing${mode === "auto" ? " recovery-landing" : ""}`}>
      <div className={`builder-modes${mode === "auto" ? " recovery-modes" : ""}`}>
        <button
          className={mode === "manual" ? "selected" : ""}
          onClick={() => setMode("manual")}
        >
          <Plane size={18} />
          <strong>Build my trip</strong>
          <small>
            A trip that’s completely you. Explore, pick, and make it your own.
          </small>
        </button>
        <button
          className={mode === "auto" ? "selected" : ""}
          onClick={() => setMode("auto")}
        >
          <Sparkles size={18} />
          <strong>Automated recovery</strong>
          <small>
            A change of plans? Let’s find your next best way forward.
          </small>
        </button>
      </div>
      <div className="landing-columns"><div>{mode === "manual" ? (
        <div className="card builder-panel">
          <h2>Let’s plan something wonderful.</h2>
          <p>
            A few details now. A world of possibilities next.
          </p>
          <RouteForm
            initial={{ destination }}
            onDestinationChange={setDestination}
            onSubmit={(value) => onStart({ ...value, mode: "manual" })}
            busy={busy}
          />
        </div>
      ) : (
        <div className="recovery-start card">
          <form className="recovery-prompt" onSubmit={(e) => { e.preventDefault(); if (situation.trim()) onStart({ mode: "auto", situation: situation.trim(), travelers: Number(previewTravelers), date: new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10) }); }}>
            <div className="recovery-entry-tabs"><div><button type="button" className={recoveryTab === "describe" ? "selected" : ""} onClick={() => setRecoveryTab("describe")}><MessageCircle size={16}/> Describe your situation</button><button type="button" className={recoveryTab === "upload" ? "selected" : ""} onClick={() => setRecoveryTab("upload")}><FileText size={16}/> Upload booking details</button></div><button type="button" className="recovery-see-examples" onClick={() => { setShowAllScenarios(true); document.getElementById("recovery-examples")?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }}><Sparkles size={15}/> See examples</button></div>
            {recoveryTab === "describe" ? <textarea aria-label="Describe your travel disruption" rows={3} maxLength={500} value={situation} onChange={(e) => setSituation(e.target.value)} placeholder="Describe what happened with your trip…" /> : <label className="recovery-upload"><input type="file" accept=".txt,.eml,.json,text/plain" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; setUploadedName(file.name); try { const contents = await file.text(); if (contents.trim()) setSituation(contents.slice(0, 500)); } catch { setSituation(`I need help with the booking details in ${file.name}.`); } }} /><span><Upload size={22}/><b>{uploadedName || "Choose a booking details file"}</b><small>Text, email or JSON · contents are added to the message draft</small></span></label>}
            {recoveryTab === "describe" && <small className="recovery-character-count">{situation.length}/500</small>}
            <div className="recovery-trip-chips"><span><MapPin size={14}/> From {previewOrigin}</span><span><Plane size={14}/> To {previewDestination}</span><span><CalendarDays size={14}/> Today</span><span><Wallet size={14}/> Budget: {previewBudget}</span><span><Users size={14}/> {previewTravelers} traveler{previewTravelers === "1" ? "" : "s"}</span></div>
            <div className="recovery-prompt-bottom"><span><ShieldCheck size={15} /> Nothing is booked until you confirm.</span><button className="button primary" disabled={busy || !situation.trim()}><Sparkles size={15} /> {busy ? "Starting recovery…" : "Find recovery options"} <ArrowRight size={16} /></button></div>
          </form>
          <div className="recovery-scenarios-head" id="recovery-examples"><div><strong>Try a sample scenario</strong><small>Choose a common disruption to see how AI Recovery can help.</small></div><button type="button" onClick={() => setShowAllScenarios((value) => !value)}>{showAllScenarios ? "Show fewer" : "View all scenarios"} <ArrowRight size={14}/></button></div>
          <div className="recovery-scenarios">{RECOVERY_SCENARIOS.slice(0, showAllScenarios ? RECOVERY_SCENARIOS.length : 6).map(({ icon: Icon, title, detail, key, image, color, example }) => <button className={`recovery-scenario scenario-${key} tone-${color}`} type="button" key={key} onClick={() => { setSituation(EXAMPLES[example]); setRecoveryTab("describe"); }}><TripPhoto src={image} alt=""/><span className="recovery-scenario-icon"><Icon size={19} /></span><b>{title}</b><small>{detail}</small><i><ArrowRight size={16} /></i></button>)}</div>
          <p className="recovery-demo-note">Demo mode · provider offers and bookings are simulated. Your confirmed plan will be saved to My Trips.</p>
        </div>
      )}</div>{mode === "auto" ? <RecoveryGuide currentTrip={currentTrip} onChoose={setSituation} /> : <DestinationAside city={destination} onRecovery={() => setMode("auto")} />}</div>
      <div className="builder-disclaimer card">
        <Users size={16} />
        <div>
          <strong>A little heads-up: you’re in demo mode</strong>
          <p>
            Explore with sample prices and simulated searches. Photos are inspiration; no real reservations or payments are made.
          </p>
        </div>
      </div>
    </div>
  );
}

function RecoveryGuide({ currentTrip, onChoose }) {
  const trip = currentTrip || { name: "Jaipur Getaway", destination: "Jaipur", start: "12 Oct 2026", end: "14 Oct 2026", bookings: 4, id: "" };
  const tripHref = trip.id ? `/trip/${trip.id}/overview` : "/trips";
  const dateText = (value) => { if (!value) return "Flexible dates"; const parsed = new Date(`${value}T12:00:00`); return Number.isNaN(parsed.valueOf()) ? value : parsed.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); };
  return <aside className="recovery-guide">
    <section className="wp-rail-card recovery-current"><header className="wp-rail-head"><b><Compass size={15}/> Your Current Trip</b><a href={tripHref}>View trip <ArrowRight size={14}/></a></header><a className="recovery-current-photo" href={tripHref}><TripPhoto src={destinationPhoto(trip.destination)} alt={`${trip.destination} trip`} /><span className="recovery-current-track"><ShieldCheck size={13}/> On Track</span><div><b>{trip.name}</b><small>{dateText(trip.start)} – {dateText(trip.end)}</small></div></a><div className="recovery-current-services"><span><Plane/><b>Flight</b><small>{trip.bookings} saved</small></span><span><BedDouble/><b>Hotel</b><small>View stay</small></span><span><Car/><b>Transport</b><small>Transfer</small></span><span><Ticket/><b>Activities</b><small>View plans</small></span></div></section>
    <section className="wp-rail-card"><header className="wp-rail-head"><b>Popular scenarios</b><Sparkles size={15} /></header>{[[Plane,"Missed or delayed flight",0],[TriangleAlert,"Flight cancelled",1],[Car,"Stuck at the airport",2],[MapPin,"Need another city",3],[Wallet,"Looking for cheaper options",4],[Ticket,"Find things to do nearby",7]].map(([Icon,label,index])=><button type="button" className="recovery-guide-link" key={label} onClick={()=>onChoose(EXAMPLES[index])}><Icon size={15}/><span>{label}</span><ArrowRight size={14}/></button>)}</section>
    <section className="wp-rail-card recovery-how"><header className="wp-rail-head"><b>How it works</b><ShieldCheck size={15}/></header>{[["1","Describe your situation","Tell us what happened in simple words."],["2","Explore your options","Compare flights, stays, transport, food and activities."],["3","Review and confirm","Choose what you want. Nothing is booked before confirmation."]].map(([n,title,detail])=><div className="recovery-how-step" key={n}><b>{n}</b><div><strong>{title}</strong><small>{detail}</small></div></div>)}</section>
  </aside>;
}
