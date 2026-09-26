// Trip Recovery Center — a guided, localized recovery workspace.
//
// It never rebuilds the whole trip: it detects the disruption, shows what is
// affected vs. preserved, prices the change from booking policy data, and lets
// the traveller apply only the affected portion through the existing engine.

import React, { useMemo, useState } from "react";
import {
  Plane,
  Clock,
  GitBranch,
  Car,
  Building2,
  UtensilsCrossed,
  Camera,
  CloudRain,
  MapPin,
  MoreHorizontal,
  TriangleAlert,
  ShieldCheck,
  Wallet,
  ArrowRight,
  Check,
  X,
  Sparkles,
  Scale,
  RefreshCw,
  CalendarDays,
  Briefcase,
} from "lucide-react";
import { api } from "./api";
import { destinationPhoto } from "./BuilderVisuals";

const hhmm = (iso) =>
  new Date(iso).toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" });

const money = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

// Event catalogue. `type` maps to the recovery engine's disruption types and
// `bookingType` is the kind of booking it usually hits.
const RECOVERY_EVENTS = [
  { key: "flight_miss", label: "I can't take my flight", icon: Plane, bookingType: "flight", type: "cancellation" },
  { key: "flight_delay", label: "My flight is delayed", icon: Clock, bookingType: "flight", type: "delay", minutes: true },
  { key: "connection", label: "I may miss my connection", icon: GitBranch, bookingType: null, type: "missed_connection" },
  { key: "transfer", label: "My transfer isn't available", icon: Car, bookingType: "transfer", type: "transfer_failure" },
  { key: "hotel", label: "My hotel is unavailable", icon: Building2, bookingType: "hotel", type: "cancellation" },
  { key: "restaurant", label: "I want to cancel a restaurant", icon: UtensilsCrossed, bookingType: "event", type: "cancellation" },
  { key: "activity", label: "I can't attend my activity", icon: Camera, bookingType: "activity", type: "cancellation" },
  { key: "weather", label: "Weather disrupted my plans", icon: CloudRain, bookingType: null, type: "weather", minutes: true },
  { key: "destination", label: "I changed my destination", icon: MapPin, bookingType: null, type: "traveler_change" },
  { key: "other", label: "Something else", icon: MoreHorizontal, bookingType: null, type: "delay" },
];

// Light natural-language routing for the free-text box. Deterministic and local
// (no LLM): it only chooses which catalogued event to run.
function guessFromText(text) {
  const t = String(text || "").toLowerCase();
  let key = null;
  if (/miss(ed)?\s+(my\s+)?flight|can'?t take (my )?flight/.test(t)) key = "flight_miss";
  else if (/connection/.test(t)) key = "connection";
  else if (/(uber|ola|rapido|taxi|transfer|cab)/.test(t)) key = "transfer";
  else if (/(hotel|stay|check[- ]?in)/.test(t)) key = "hotel";
  else if (/(restaurant|dinner|lunch|meal|food|eat)/.test(t)) key = "restaurant";
  else if (/(weather|rain|storm|snow)/.test(t)) key = "weather";
  else if (/(activity|tour|museum|fort|park|sightsee)/.test(t)) key = "activity";
  else if (/(destination|instead of|different city|reroute)/.test(t)) key = "destination";
  else if (/flight/.test(t) && /(delay|late)/.test(t)) key = "flight_delay";
  let minutes = 0;
  const m = t.match(/(\d+)\s*(min|mins|minutes|hour|hours|hr)/);
  if (m) minutes = /(hour|hr)/.test(m[2]) ? Number(m[1]) * 60 : Number(m[1]);
  return { key, minutes };
}

const TYPE_LABEL = {
  delay: "Delayed",
  cancellation: "Cancelled",
  weather: "Weather",
  missed_connection: "Missed connection",
  transfer_failure: "Transfer unavailable",
  traveler_change: "Changed plans",
};

export function RecoveryCenter({ data, bookings, affected, hasDisruption, showPlans, onShowPlans, busy, onTrigger, onClear, onPreferences, tripId, onReplace, onUndo }) {
  const [open, setOpen] = useState(false);
  const [eventKey, setEventKey] = useState("flight_miss");
  const [bookingId, setBookingId] = useState(bookings[0]?.id || "");
  const [text, setText] = useState("");
  const [minutes, setMinutes] = useState(120);
  const [altBooking, setAltBooking] = useState(null);
  const [altData, setAltData] = useState(null);
  const [altLoading, setAltLoading] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [applying, setApplying] = useState(false);

  const openAlternatives = async (booking) => {
    setAltBooking(booking);
    setAltData(null);
    setSelectedOffer(null);
    setAltLoading(true);
    try {
      setAltData(await api(`trips/${tripId}/bookings/${booking.id}/alternatives`));
    } catch (err) {
      setAltData({ error: err.message, alternatives: [], policy: { amount: 0, note: "" } });
    } finally {
      setAltLoading(false);
    }
  };
  const applyOffer = async () => {
    if (!selectedOffer || !altBooking) return;
    setApplying(true);
    const ok = await onReplace(altBooking.id, selectedOffer.id);
    setApplying(false);
    if (ok !== false) {
      setAltBooking(null);
      setAltData(null);
      setSelectedOffer(null);
    }
  };

  const recommended = useMemo(
    () => data.plans.find((p) => p.recommended) || data.plans[0] || null,
    [data.plans],
  );
  const tripCost = bookings.reduce((n, b) => n + (b.price || 0), 0);
  const newValue = recommended ? tripCost - recommended.refund + recommended.gross : tripCost;
  const preserved = recommended ? Math.max(0, bookings.length - recommended.changes.length) : bookings.length;
  const preservedForPlan = recommended
    ? bookings.filter((b) => !recommended.changes.some((change) => change.bookingId === b.id))
    : [];
  const unaffected = bookings.filter((b) => !affected.some((i) => i.id === b.id));
  const affectedById = (id) => bookings.find((b) => b.id === id);
  const tripInfo = data.trip || {};
  const currentDisruption = data.disruptions?.at(-1);
  const disruptedBooking = currentDisruption && affectedById(currentDisruption.bookingId);
  const tripDateRange = tripInfo.start && tripInfo.end
    ? `${new Date(`${tripInfo.start}T12:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} – ${new Date(`${tripInfo.end}T12:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
    : "Your upcoming journey";

  const selectedEvent = RECOVERY_EVENTS.find((e) => e.key === eventKey) || RECOVERY_EVENTS.at(-1);
  const eligible = selectedEvent.bookingType
    ? bookings.filter((b) => b.type === selectedEvent.bookingType)
    : bookings;
  const activeBooking = eligible.find((b) => b.id === bookingId) || eligible[0] || bookings[0];

  const chooseEvent = (key) => {
    setEventKey(key);
    const ev = RECOVERY_EVENTS.find((e) => e.key === key);
    const match = ev?.bookingType && bookings.find((b) => b.type === ev.bookingType);
    if (match) setBookingId(match.id);
  };

  const analyzeText = () => {
    const guess = guessFromText(text);
    if (guess.key) chooseEvent(guess.key);
    if (guess.minutes) setMinutes(guess.minutes);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!activeBooking) return;
    const ok = await onTrigger({
      bookingId: activeBooking.id,
      type: selectedEvent.type,
      delayMinutes: selectedEvent.minutes ? minutes || 120 : 0,
      note: text.trim() || selectedEvent.label,
    });
    if (ok !== false) {
      setOpen(false);
      setText("");
    }
  };

  return (
    <section className={"rc " + (hasDisruption && showPlans ? "rc-plan-mode" : "rc-overview-mode")}>
      {hasDisruption && showPlans ? (
        <>
          <header className="rc-plan-hero" style={{ backgroundImage: "linear-gradient(90deg,rgba(245,249,255,.98) 0%,rgba(245,249,255,.9) 48%,rgba(245,249,255,.1) 100%), url(" + destinationPhoto(tripInfo.destination) + ")" }}>
            <div>
              <span className="rc-kicker">TRIP RECOVERY CENTER</span>
              <h1>Recovery plans for your disrupted trip</h1>
              <p>We traced the impact across your itinerary. Compare the options and choose what works best for you.</p>
              <div className="rc-plan-context"><span><TriangleAlert size={14} /> {currentDisruption?.note || TYPE_LABEL[currentDisruption?.type] || "Travel disruption reported"}</span><span><MapPin size={14} /> {tripInfo.destination}</span><span className="rc-demo-badge">Estimated demo inventory</span></div>
            </div>
            <button className="rc-plan-modify" onClick={() => onShowPlans(false)}><ArrowRight size={14} /> Back to recovery center</button>
          </header>
          <div className="rc-plan-summary-strip">
            <div><span className="red"><TriangleAlert size={16} /></span><section><small>Directly affected</small><b>{affected.filter((item) => item.direct).length} booking{affected.filter((item) => item.direct).length === 1 ? "" : "s"}</b></section></div>
            <div><span className="amber"><GitBranch size={16} /></span><section><small>At risk downstream</small><b>{affected.filter((item) => !item.direct).length} booking{affected.filter((item) => !item.direct).length === 1 ? "" : "s"}</b></section></div>
            <div><span className="green"><ShieldCheck size={16} /></span><section><small>Kept unchanged</small><b>{preservedForPlan.length} bookings</b></section></div>
            <div><span className="violet"><Wallet size={16} /></span><section><small>Estimated net change</small><b>{recommended ? money(recommended.net) : "No feasible plan"}</b></section></div>
          </div>
          <div className="rc-plan-caution"><ShieldCheck size={15} /><span>No bookings or refunds are processed automatically. Review a recovery plan and confirm each local itinerary change.</span><button onClick={() => setOpen(true)}>Modify scenario</button><button onClick={onClear} disabled={busy}>Clear disruption</button></div>
        </>
      ) : (
        <>
          <header className="rc-trip-hero">
            <img src={destinationPhoto(tripInfo.destination)} alt={tripInfo.destination + " travel view"} />
            <div className="rc-trip-hero-shade" />
            <div className="rc-trip-hero-content">
              <span className="rc-kicker">TRIP RECOVERY CENTER</span>
              <h1>Let's get you <em>back on track.</em></h1>
              <p>Thoughtful decisions for the trip you want to take.</p>
              <div className="rc-trip-meta"><span><CalendarDays size={15} /> {tripDateRange}</span><i /><span><MapPin size={15} /> {tripInfo.destination}</span></div>
            </div>
            <span className="rc-weather"><span>Sunny</span><b>28 C</b><small>Trip forecast</small></span>
          </header>
          <div className="rc-status rc-status-color">
            <div className="rc-status-tile tone-green"><span><ShieldCheck size={22} /></span><div><small>Trip status</small><b className={hasDisruption ? "warn" : "ok"}>{hasDisruption ? "Needs attention" : "On track"}</b><small>{hasDisruption ? "Review the affected booking" : "Most of your trip is running smoothly"}</small></div></div>
            <div className="rc-status-tile tone-blue"><span><Briefcase size={22} /></span><div><small>Bookings</small><b>{bookings.length}</b><small>Confirmed trip items</small></div></div>
            <div className="rc-status-tile tone-amber"><span><TriangleAlert size={22} /></span><div><small>At risk</small><b>{affected.length}</b><small>May need attention</small></div></div>
            <div className="rc-status-tile tone-violet"><span><RefreshCw size={22} /></span><div><small>Recoverable plans</small><b>{data.plans.length}</b><small>Options based on your itinerary</small></div></div>
            <div className="rc-status-tile tone-blue"><span><Wallet size={22} /></span><div><small>Trip cost</small><b>{money(tripCost)}</b><small>Current total trip value</small></div></div>
          </div>
          <div className={"rc-clear-banner" + (hasDisruption ? " has-incident" : "")}><span>{hasDisruption ? <TriangleAlert size={18} /> : <ShieldCheck size={18} />}</span><div><b>{hasDisruption ? "A disruption may affect your plans" : "Your trip is on track"}</b><small>{hasDisruption ? `${currentDisruption?.note || TYPE_LABEL[currentDisruption?.type] || "One booking needs attention"}. We found alternatives to keep your trip moving.` : "No active disruptions. If plans change, we will help you update only what needs attention."}</small></div>{hasDisruption ? <button onClick={() => onShowPlans(true)}>View recovery plans <ArrowRight size={15} /></button> : <button onClick={() => setOpen(true)}>Open Recovery Center <ArrowRight size={15} /></button>}</div>
          <section className="rc-prefs rc-preferences-wide">
            <div className="rc-prefs-head"><div><b>Recovery preferences</b><small>Set your priorities to get the best recovery options.</small></div><button onClick={onPreferences}>Change preferences <ArrowRight size={14} /></button></div>
            <div className="rc-prefs-grid">
              <div><span className="tone-blue"><CalendarDays size={17} /></span><section><small>Budget limit</small><b>{money(data.preferences?.budget || 0)}</b><small>Per traveler</small></section></div>
              <div><span className="tone-violet"><Scale size={17} /></span><section><small>What matters most</small><b>{data.preferences?.priority || "Balanced"}</b><small>Cost, time and convenience</small></section></div>
              <div><span className="tone-blue"><RefreshCw size={17} /></span><section><small>Acceptable alternatives</small><b>{data.preferences?.accessible ? "Accessible only" : "Any"}</b><small>Flights, train, bus, cab</small></section></div>
              <div><span className="tone-pink"><Check size={17} /></span><section><small>Keep existing bookings</small><b>High</b><small>Preserve as much as possible</small></section></div>
            </div>
          </section>
          <section className="rc-scenarios">
            <div><b>How can we help you today?</b><small>Select a common scenario or describe what happened.</small></div>
            <div className="rc-scenario-buttons">
              {["flight_miss", "flight_delay", "transfer", "restaurant", "activity", "other"].map((key) => {
                const event = RECOVERY_EVENTS.find((item) => item.key === key);
                if (!event) return null;
                const Icon = event.icon;
                return <button type="button" key={key} onClick={() => { chooseEvent(key); setOpen(true); }}><Icon size={16} />{event.label}</button>;
              })}
            </div>
          </section>
          <div className="rc-overview-grid">
            <section className="rc-history rc-history-large">
              <header><h2>Recovery History</h2><a href={"/trip/" + tripId + "/activity"}>View all <ArrowRight size={13} /></a></header>
              {data.history?.length ? data.history.slice(0, 5).map((item) => {
                const change = item.changes?.[0] || {};
                const title = change.title || item.label;
                const Icon = /flight/i.test(title) ? Plane : /transfer|uber|taxi|transport/i.test(title) ? Car : /restaurant|dinner|food/i.test(title) ? UtensilsCrossed : /hotel|stay/i.test(title) ? Building2 : /activity|tour|fort/i.test(title) ? Camera : Clock;
                return <div className="rc-history-row" key={item.id}><span className={item.undone ? "undone" : ""}><Icon size={15} /></span><div><b>{item.label}</b><small>{title} - {new Date(item.appliedAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</small></div><i className={item.undone ? "reverted" : "complete"}>{item.undone ? "Reverted" : "Completed"}</i><strong className={item.net < 0 ? "saved" : ""}>{item.net < 0 ? "-" : "+"}{money(Math.abs(item.net))}</strong></div>;
              }) : <div className="rc-history-empty"><Clock size={20} /> Your completed recovery actions will appear here.</div>}
              {data.history?.[0] && !data.history[0].undone && <button className="rc-undo-link" onClick={onUndo} disabled={busy}>Undo latest change <ArrowRight size={13} /></button>}
            </section>
            <aside className="rc-current-card">
              <header><h2>Current trip health</h2><span><i /> Monitoring</span></header>
              <div className={"rc-current-incident" + (hasDisruption ? " active" : "")}><span>{hasDisruption ? <TriangleAlert size={18} /> : <ShieldCheck size={18} />}</span><div><b>{hasDisruption ? (currentDisruption?.note || TYPE_LABEL[currentDisruption?.type] || "Disruption reported") : "No active disruption"}</b><small>{hasDisruption ? "Review the recovery options before continuing." : "Your itinerary is clear and ready to go."}</small></div>{hasDisruption ? <ArrowRight size={16} /> : <Check size={16} />}</div>
              <h3>Impact on your trip</h3>
              <div className="rc-impact-list">{bookings.slice(0, 6).map((booking) => {
                const impact = affected.find((item) => item.id === booking.id);
                const Icon = booking.type === "flight" || booking.type === "train" ? Plane : booking.type === "transfer" ? Car : booking.type === "hotel" ? Building2 : booking.type === "event" ? UtensilsCrossed : Camera;
                return <div key={booking.id}><Icon size={14} /><span>{booking.title}</span><b className={impact ? (impact.direct ? "danger" : "warn") : "safe"}>{impact ? (impact.direct ? "Affected" : "At risk") : "Safe"}</b></div>;
              })}</div>
              <button className="rc-current-action" onClick={() => setOpen(true)}>Report a change <ArrowRight size={14} /></button>
            </aside>
          </div>
        </>
      )}
      {open && (
        <div className="rc-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget && !busy) setOpen(false); }}>
          <form className="rc-modal" onSubmit={submit} role="dialog" aria-modal="true" aria-label="Something changed">
            <button type="button" className="rc-close" aria-label="Close" onClick={() => setOpen(false)} disabled={busy}><X size={18} /></button>
            <div className="rc-kicker">SOMETHING CHANGED</div>
            <h2>What happened?</h2>
            <p>Pick the closest match, or describe it in your own words.</p>

            <div className="rc-event-grid">
              {RECOVERY_EVENTS.map((ev) => {
                const Icon = ev.icon;
                return (
                  <button type="button" key={ev.key} className={"rc-event" + (eventKey === ev.key ? " active" : "")} aria-pressed={eventKey === ev.key} onClick={() => chooseEvent(ev.key)}>
                    <Icon size={17} /> <span>{ev.label}</span>
                  </button>
                );
              })}
            </div>

            <label className="rc-field">
              Describe what happened
              <textarea value={text} maxLength={500} onChange={(e) => setText(e.target.value)} onBlur={analyzeText} placeholder="e.g. I missed my flight from Mumbai to Jaipur and need to reach Jaipur today." />
            </label>

            <div className="rc-modal-row">
              <label className="rc-field">
                Affected booking
                <select value={activeBooking?.id || ""} onChange={(e) => setBookingId(e.target.value)}>
                  {eligible.map((b) => <option value={b.id} key={b.id}>{b.title}</option>)}
                  {!eligible.length && <option value="">No matching booking</option>}
                </select>
              </label>
              {selectedEvent.minutes && (
                <label className="rc-field">
                  {selectedEvent.type === "weather" ? "Closure (minutes)" : "Delay (minutes)"}
                  <input type="number" min="1" max="1440" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} />
                </label>
              )}
            </div>

            <div className="rc-modal-note">
              <Scale size={14} /> We’ll trace the impact across your trip, price the change from booking policy data, and preserve everything else.
            </div>

            <div className="rc-modal-actions">
              <button type="button" className="button" onClick={() => setOpen(false)} disabled={busy}>Cancel</button>
              <button type="submit" className="button primary" disabled={busy || !activeBooking}>
                {busy ? "Analyzing…" : "Analyze my options"} <ArrowRight size={16} />
              </button>
            </div>
          </form>
        </div>
      )}

      {altBooking && (
        <div className="rc-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget && !applying) setAltBooking(null); }}>
          <div className="rc-modal rc-modal-alt" role="dialog" aria-modal="true" aria-label="Alternative options">
            <button type="button" className="rc-close" aria-label="Close" onClick={() => setAltBooking(null)} disabled={applying}><X size={18} /></button>
            <div className="rc-kicker">PER-BOOKING RECOVERY</div>
            <h2>{altBooking.title}</h2>
            <p>Original: {altBooking.provider} · {money(altBooking.price)} · {hhmm(altBooking.start)}–{hhmm(altBooking.end)}</p>

            {altLoading ? (
              <div className="rc-search-status"><RefreshCw size={15} className="spin" /> Searching alternative options…</div>
            ) : altData?.error ? (
              <div className="error" role="alert">{altData.error}</div>
            ) : (
              <>
                <div className="rc-policy">
                  <b>{altData.alternatives.length} option{altData.alternatives.length === 1 ? "" : "s"} found</b>
                  <span>{altData.policy?.note} Estimated refund on the original: {money(altData.policy?.amount || 0)}.</span>
                </div>
                <div className="rc-alts">
                  {altData.alternatives.map((o) => (
                    <button
                      type="button"
                      key={o.id}
                      className={"rc-alt" + (selectedOffer?.id === o.id ? " selected" : "") + (o.feasible ? "" : " infeasible")}
                      onClick={() => o.feasible && setSelectedOffer(o)}
                      disabled={applying || !o.feasible}
                    >
                      <div className="rc-alt-top"><b>{o.provider}</b><strong>{money(o.price)}</strong></div>
                      <div className="rc-alt-times">{hhmm(o.start)} → {hhmm(o.end)}</div>
                      <div className="rc-alt-meta">
                        <span>Refund {money(o.refund)}</span>
                        <span className={o.difference <= 0 ? "good" : "warn"}>{o.difference <= 0 ? "−" : "+"}{money(Math.abs(o.difference))} {o.difference <= 0 ? "saved" : "extra"}</span>
                        <span className={o.feasible ? "ok" : "bad"}>{o.note}</span>
                      </div>
                    </button>
                  ))}
                  {!altData.alternatives.length && (
                    <div className="rc-empty">No replacement inventory for this booking yet. Generate demo inventory from the Inventory view, then try again.</div>
                  )}
                </div>
                <p className="rc-alt-note">Simulated demo inventory — no live supplier search is connected. Prices and refunds are estimates from stored policy data.</p>
              </>
            )}

            {selectedOffer && (
              <div className="rc-review">
                <h3>Review this change</h3>
                <div><span>Replace</span><b>{altBooking.provider} · {money(altBooking.price)}</b></div>
                <div><span>With</span><b>{selectedOffer.provider} · {money(selectedOffer.price)}</b></div>
                <div><span>Estimated refund</span><b>{money(selectedOffer.refund)}</b></div>
                <div className="total"><span>Difference</span><b>{selectedOffer.difference <= 0 ? "−" : "+"}{money(Math.abs(selectedOffer.difference))}</b></div>
                <p className="rc-review-note">Only this booking changes. Your other bookings and their connections stay as they are.</p>
                <div className="rc-modal-actions">
                  <button type="button" className="button" onClick={() => setSelectedOffer(null)} disabled={applying}>Back</button>
                  <button type="button" className="button primary" onClick={applyOffer} disabled={applying}>
                    {applying ? "Applying…" : "Apply change"} <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
