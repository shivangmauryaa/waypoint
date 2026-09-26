import React, { useState } from "react";
import {
  LayoutDashboard,
  Users,
  Route,
  Ticket,
  LifeBuoy,
  ShieldCheck,
  ScrollText,
  Mail,
  Plug,
  Settings2,
  ChartNoAxesCombined,
  Activity,
  ArrowUpRight,
  ArrowRight,
  CheckCircle2,
  TriangleAlert,
  Download,
  Server,
  Clock,
  Wallet,
  Copy,
  Ban,
  X,
  Trash2,
} from "lucide-react";
import { api } from "./api";
export const adminSections = [
  {
    slug: "overview",
    label: "Overview",
    icon: LayoutDashboard,
    group: "WORKSPACE",
  },
  { slug: "users", label: "Users", icon: Users, group: "WORKSPACE" },
  { slug: "trips", label: "Trips", icon: Route, group: "WORKSPACE" },
  { slug: "bookings", label: "Bookings", icon: Ticket, group: "WORKSPACE" },
  {
    slug: "recovery",
    label: "Recovery queue",
    icon: Activity,
    group: "WORKSPACE",
  },
  { slug: "support", label: "Support", icon: LifeBuoy, group: "WORKSPACE" },
  {
    slug: "policies",
    label: "Policies",
    icon: ShieldCheck,
    group: "OPERATIONS",
  },
  {
    slug: "reports",
    label: "Reports",
    icon: ChartNoAxesCombined,
    group: "OPERATIONS",
  },
  { slug: "audit", label: "Audit log", icon: ScrollText, group: "OPERATIONS" },
  { slug: "outbox", label: "Email outbox", icon: Mail, group: "OPERATIONS" },
  { slug: "integrations", label: "Integrations", icon: Plug, group: "SYSTEM" },
  { slug: "settings", label: "Settings", icon: Settings2, group: "SYSTEM" },
];
export const adminDescriptions = {
  Overview: "A clear view of your travelers, trips, and recovery operations.",
  Users: "Manage traveler access and account permissions.",
  Trips: "Review every itinerary and help travelers get moving again.",
  Bookings: "Search all travel components across the workspace.",
  "Recovery queue":
    "Prioritize active disruptions and upcoming connection risks.",
  Support: "Keep traveler questions moving toward a resolution.",
  Policies: "Manage the refund assumptions used by the recovery engine.",
  Reports: "Review recovery outcomes and export operational data.",
  "Audit log": "Follow the decisions and changes made across your workspace.",
  "Email outbox":
    "Inspect local message previews and account verification links.",
  Integrations: "Understand which services are available and how they operate.",
  Settings: "Control local monitoring and review the application environment.",
};
const currency = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n || 0);
const when = (value) =>
  new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
export function AdminOverview({ data, navigate }) {
  const m = data.metrics;
  const metricItems = [
    ["Total travelers", m.users, Users, "violet", "users"],
    ["Trips managed", m.trips, Route, "blue", "trips"],
    ["Active disruptions", m.disruptions, Activity, "amber", "recovery"],
    ["Recovery actions", m.recoveries, ShieldCheck, "teal", "reports"],
  ];
  const recent = (data.audit || []).slice(0, 6),
    risks = data.risks || [];
  return (
    <>
      <div className="admin-welcome">
        <div>
          <span className="eyebrow">EVERY JOURNEY, IN GOOD HANDS</span>
          <h2>
            A little clarity.
            <br />A better way forward.
          </h2>
          <p>
            {m.disruptions
              ? `${m.disruptions} disruption${m.disruptions === 1 ? " needs" : "s need"} attention. Your recovery queue has the details.`
              : "No active disruptions. Keep an eye on connections and help every trip stay on track."}
          </p>
          <button className="button" onClick={() => navigate("recovery")}>
            Open recovery queue <ArrowRight size={15} />
          </button>
        </div>
        <div className="ops-orbit" aria-hidden="true">
          <span />
          <i />
          <b>
            <ShieldCheck size={43} strokeWidth={1.5} />
          </b>
          <small>CONNECTED. PREPARED.</small>
        </div>
      </div>
      <div className="ops-metrics">
        {metricItems.map(([label, value, Icon, color, slug]) => (
          <button
            key={label}
            className="ops-metric"
            onClick={() => navigate(slug)}
          >
            <div>
              <span className={"ops-icon " + color}>
                <Icon size={19} />
              </span>
              <ArrowUpRight size={14} />
            </div>
            <strong>{value || 0}</strong>
            <span>{label}</span>
            <small>
              View details <ArrowRight size={11} />
            </small>
          </button>
        ))}
      </div>
      <div className="ops-grid">
        <section className="card ops-panel">
          <div className="row-between">
            <div>
              <h2>Recent activity</h2>
              <p>The latest across your workspace</p>
            </div>
            <button className="text-button" onClick={() => navigate("audit")}>
              View all <ArrowUpRight size={14} />
            </button>
          </div>
          {recent.length ? (
            recent.map((a) => (
              <div className="ops-activity" key={a.id}>
                <span className="activity-dot" />
                <div>
                  <b>{a.action.replaceAll(".", " · ").replaceAll("-", " ")}</b>
                  <small>
                    {data.users?.find((u) => u.id === a.userId)?.name ||
                      "System"}{" "}
                    · {when(a.at)}
                  </small>
                </div>
              </div>
            ))
          ) : (
            <p className="empty">
              Activity appears here as travelers use the app.
            </p>
          )}
        </section>
        <section className="card ops-panel">
          <div className="row-between">
            <div>
              <h2>Needs a closer look</h2>
              <p>Small details. Better journeys.</p>
            </div>
            <TriangleAlert size={19} />
          </div>
          <button className="attention-row" onClick={() => navigate("support")}>
            <span className="ops-icon violet">
              <LifeBuoy size={18} />
            </span>
            <div>
              <b>Open support requests</b>
              <small>Traveler conversations awaiting resolution</small>
            </div>
            <strong>{m.openTickets || 0}</strong>
            <ArrowRight size={15} />
          </button>
          <button
            className="attention-row"
            onClick={() => navigate("recovery")}
          >
            <span className="ops-icon amber">
              <Clock size={18} />
            </span>
            <div>
              <b>Connection warnings</b>
              <small>Proactive alerts across active trips</small>
            </div>
            <strong>{risks.length}</strong>
            <ArrowRight size={15} />
          </button>
          <button className="attention-row" onClick={() => navigate("users")}>
            <span className="ops-icon blue">
              <Users size={18} />
            </span>
            <div>
              <b>Pending verification</b>
              <small>Accounts waiting for email verification</small>
            </div>
            <strong>
              {data.users?.filter((u) => !u.verified).length || 0}
            </strong>
            <ArrowRight size={15} />
          </button>
          <div className="ops-local-note">
            <Server size={16} />
            <p>
              <b>Your local workspace is connected.</b>
              <br />
              JSON storage · Supplier data is simulated
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
function downloadCsv(name, headers, rows) {
  const cell = (v) => {
    let s = String(v ?? "");
    if (/^[=+@-]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  };
  const blob = new Blob(
    [
      "\ufeff" +
        [headers, ...rows].map((r) => r.map(cell).join(",")).join("\r\n"),
    ],
    { type: "text/csv;charset=utf-8;" },
  );
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
export function AdminOperations({
  tab,
  data,
  update,
  reload,
  notify,
  autoRefresh,
  setAutoRefresh,
}) {
  const [query, setQuery] = useState(""),
    [kind, setKind] = useState("all"),
    [status, setStatus] = useState("all"),
    [dType, setDType] = useState("all"),
    [busy, setBusy] = useState(""),
    [actionError, setActionError] = useState(""),
    [policy, setPolicy] = useState(null);
  if (tab === "Bookings") {
    const all = data.bookings || [];
    const rows = all.filter(
      (b) =>
        (kind === "all" || b.type === kind) &&
        (status === "all" || (b.status || "confirmed") === status) &&
        (b.title + " " + b.tripName + " " + b.provider)
          .toLowerCase()
          .includes(query.toLowerCase()),
    );
    const value = rows.reduce((n, b) => n + (b.price || 0), 0);
    const confirmed = all.filter((b) => (b.status || "confirmed") === "confirmed").length;
    const cancelled = all.filter((b) => b.status === "cancelled").length;
    const run = async (key, fn, ok) => {
      setBusy(key);
      setActionError("");
      try {
        await fn();
        await reload?.();
        if (ok) notify?.(ok);
      } catch (e) {
        setActionError(e.message);
      } finally {
        setBusy("");
      }
    };
    const cancelRow = (b, fromModal) => {
      if (!window.confirm(`Cancel “${b.title}”? The traveler is notified and recovery options open.`)) return;
      if (fromModal) setPolicy(null);
      run(b.tripId + b.id + ":cancel", () =>
        api(`trips/${b.tripId}/disruptions`, { bookingId: b.id, type: "cancellation", delayMinutes: 0, note: "Cancelled by administrator" }, "POST"),
        `Cancellation recorded for ${b.title}.`,
      );
    };
    const exportCsv = () => {
      const head = ["Booking", "Type", "Provider", "Trip", "From", "To", "Start", "Status", "Party value"];
      const lines = rows.map((b) => [b.title, b.type, b.provider, b.tripName, b.from, b.to, b.start, b.status || "confirmed", b.price]);
      const csv = [head, ...lines]
        .map((r) => r.map((c) => `"${String(c ?? "").replaceAll('"', '""')}"`).join(","))
        .join("\r\n");
      const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = "waypoint-bookings.csv";
      a.click();
      URL.revokeObjectURL(url);
    };
    return (
      <section className="card editor-card">
        <div className="row-between">
          <h2>Booking directory</h2>
          <button className="button" onClick={exportCsv}><Download size={14} /> Export CSV</button>
        </div>
        <div className="admin-booking-stats">
          <article><span className="abs-ico"><Ticket size={18} /></span><div><small>Bookings</small><strong>{all.length}</strong></div></article>
          <article><span className="abs-ico green"><CheckCircle2 size={18} /></span><div><small>Confirmed</small><strong>{confirmed}</strong></div></article>
          <article><span className="abs-ico red"><Ban size={18} /></span><div><small>Cancelled</small><strong>{cancelled}</strong></div></article>
          <article><span className="abs-ico purple"><Wallet size={18} /></span><div><small>Value in view</small><strong>{currency(value)}</strong></div></article>
        </div>
        <div className="admin-filters">
          <input aria-label="Search bookings" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search booking, trip or provider…" />
          <select aria-label="Booking type" value={kind} onChange={(e) => setKind(e.target.value)}>
            {["all", "flight", "train", "transfer", "hotel", "activity", "event"].map((x) => <option key={x} value={x}>{x === "all" ? "All booking types" : x}</option>)}
          </select>
          <select aria-label="Booking status" value={status} onChange={(e) => setStatus(e.target.value)}>
            {["all", "confirmed", "recovered", "cancelled"].map((x) => <option key={x} value={x}>{x === "all" ? "All statuses" : x}</option>)}
          </select>
        </div>
        {actionError && <p className="error" role="alert">{actionError}</p>}
        <div className="table-scroll">
          <table>
            <thead>
              <tr><th>Booking</th><th>Trip / route</th><th>Departure</th><th>Party value</th><th>Status</th><th>Manage</th></tr>
            </thead>
            <tbody>
              {rows.map((b) => {
                const key = b.tripId + b.id;
                const isCancelled = (b.status || "confirmed") === "cancelled";
                return (
                  <tr key={key}>
                    <td><b>{b.title}</b><small>{b.type} · {b.provider}</small></td>
                    <td>{b.tripName}<small>{b.from} → {b.to}</small></td>
                    <td>{when(b.start)}</td>
                    <td>{currency(b.price)}</td>
                    <td><span className={"tag " + (isCancelled ? "amber" : b.status === "recovered" ? "green" : "")}>{b.status || "confirmed"}</span></td>
                    <td>
                      <div className="admin-booking-actions">
                        <button className="text-button" disabled={!!busy} onClick={() => run(key + ":policy", async () => {
                          const st = await api(`trips/${b.tripId}/state`);
                          const p = (st.policies || []).find((x) => x.id === b.id);
                          setPolicy({ booking: b, policy: p || null });
                        })}>{busy === key + ":policy" ? "…" : "Policy"}</button>
                        {!isCancelled && <button className="text-button danger-text" disabled={!!busy} onClick={() => cancelRow(b)}>Cancel</button>}
                        <button className="text-button" title="Duplicate booking" disabled={!!busy} onClick={() => run(key + ":dup", () => api(`trips/${b.tripId}/bookings/${b.id}/duplicate`, {}, "POST"), "Booking duplicated.")}><Copy size={12} /></button>
                        <button className="text-button danger-text" title="Remove booking" disabled={!!busy} onClick={() => { if (window.confirm(`Remove “${b.title}” from the trip?`)) run(key + ":del", () => api(`trips/${b.tripId}/bookings/${b.id}`, {}, "DELETE"), "Booking removed."); }}><Trash2 size={12} /></button>
                        <a className="text-button" href={"/trip/" + b.tripId}>Open <ArrowUpRight size={13} /></a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!rows.length && <p className="empty">No bookings match your filters.</p>}
        </div>
        {policy && (
          <div className="admin-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setPolicy(null); }}>
            <div className="admin-modal">
              <button className="admin-modal-close" aria-label="Close" onClick={() => setPolicy(null)}><X size={18} /></button>
              <h2>{policy.booking.title}</h2>
              <p>{policy.booking.provider} · {when(policy.booking.start)}</p>
              <dl className="details">
                <div><dt>Party value</dt><dd>{currency(policy.booking.price)}</dd></div>
                <div><dt>Refund policy</dt><dd>{policy.policy ? `${Math.round(policy.policy.refund * 100)}%` : "Not found"}</dd></div>
                <div><dt>Estimated refund now</dt><dd>{currency(policy.policy?.amount || 0)}</dd></div>
                <div><dt>Refund status</dt><dd>{policy.policy?.status || "—"}</dd></div>
              </dl>
              <p className="footnote">{policy.policy?.note || "No stored policy for this booking."}</p>
              <div className="admin-modal-actions">
                <button className="button" onClick={() => setPolicy(null)}>Close</button>
                {(policy.booking.status || "confirmed") !== "cancelled" && (
                  <button className="button primary" onClick={() => cancelRow(policy.booking, true)}>Cancel booking</button>
                )}
              </div>
            </div>
          </div>
        )}
      </section>
    );
  }
  if (tab === "Recovery queue") {
    const disruptions = data.disruptions || [];
    const risks = data.risks || [];
    const types = [...new Set(disruptions.map((d) => d.type))];
    const shown = disruptions.filter((d) => dType === "all" || d.type === dType);
    const records = data.recoveries || [];
    const run = async (key, fn, ok) => {
      setBusy(key);
      setActionError("");
      try {
        await fn();
        await reload?.();
        if (ok) notify?.(ok);
      } catch (e) {
        setActionError(e.message);
      } finally {
        setBusy("");
      }
    };
    const notifyTrip = (tripId, subject) => {
      const message = window.prompt(`Message to the traveler about “${subject}”:`, "We're reviewing your trip and will follow up shortly.");
      if (!message) return;
      run("notify:" + tripId, () => api(`admin/trips/${tripId}/notify`, { message }, "POST"), "Message sent to the traveler.");
    };
    return (
      <div className="admin-recovery">
        <div className="admin-booking-stats">
          <article><span className="abs-ico red"><TriangleAlert size={18} /></span><div><small>Open disruptions</small><strong>{disruptions.length}</strong></div></article>
          <article><span className="abs-ico amber"><Activity size={18} /></span><div><small>Connection risks</small><strong>{risks.length}</strong></div></article>
          <article><span className="abs-ico purple"><ShieldCheck size={18} /></span><div><small>Recoveries applied</small><strong>{records.filter((r) => !r.undone).length}</strong></div></article>
          <article><span className="abs-ico green"><CheckCircle2 size={18} /></span><div><small>Reverted</small><strong>{records.filter((r) => r.undone).length}</strong></div></article>
        </div>
        <div className="admin-filters">
          <select aria-label="Disruption type" value={dType} onChange={(e) => setDType(e.target.value)}>
            <option value="all">All disruption types</option>
            {types.map((t) => <option key={t} value={t}>{t.replaceAll("_", " ")}</option>)}
          </select>
        </div>
        {actionError && <p className="error" role="alert">{actionError}</p>}
        <div className="ops-grid">
          <section className="card editor-card">
            <div className="row-between">
              <h2>Active disruptions</h2>
              <span className="tag amber">{disruptions.length} OPEN</span>
            </div>
            {shown.map((d) => (
              <div className="queue-item" key={d.id}>
                <span className="tag amber">{d.type.replaceAll("_", " ")}</span>
                <h3>{d.bookingTitle}</h3>
                <p>{d.tripName}{d.delayMinutes ? ` · ${d.delayMinutes} minute change` : ""}</p>
                {d.note && <p>{d.note}</p>}
                <div className="admin-queue-actions">
                  <a className="button" href={"/trip/" + d.tripId}>Review <ArrowRight size={14} /></a>
                  <button className="button" disabled={!!busy} onClick={() => { if (window.confirm(`Apply the recommended recovery to ${d.tripName}?`)) run("recover:" + d.tripId, () => api(`admin/trips/${d.tripId}/recover`, {}, "POST"), "Recovery applied."); }}>{busy === "recover:" + d.tripId ? "Applying…" : "Auto-recover"}</button>
                  <button className="button" disabled={!!busy} onClick={() => notifyTrip(d.tripId, d.bookingTitle)}>Notify</button>
                  <button className="button danger" disabled={!!busy} onClick={() => run("clear:" + d.id, () => api(`admin/disruptions/${d.tripId}/${d.id}/clear`, {}, "POST"), "Disruption cleared.")}>Clear</button>
                </div>
              </div>
            ))}
            {!disruptions.length && (
              <div className="empty">
                <CheckCircle2 size={35} />
                <h2>All clear for now.</h2>
                <p>Reported disruptions appear here for follow-up.</p>
              </div>
            )}
            {disruptions.length > 0 && !shown.length && <p className="empty">No disruptions of this type.</p>}
          </section>
          <section className="card editor-card">
            <h2>Connection risks</h2>
            <p>Calculated from current booking times and locations.</p>
            {risks.map((r, i) => (
              <div className="queue-item" key={i}>
                <span className={"tag " + (r.severity === "high" ? "amber" : "")}>{r.severity.toUpperCase()}</span>
                <h3>{r.title}</h3>
                <p>{r.message}</p>
                <div className="admin-queue-actions">
                  <a className="text-button" href={"/trip/" + r.tripId}>{r.tripName}<ArrowUpRight size={13} /></a>
                  <button className="text-button" disabled={!!busy} onClick={() => notifyTrip(r.tripId, r.title)}>Notify</button>
                </div>
              </div>
            ))}
            {!risks.length && <p className="empty">No connection warnings.</p>}
          </section>
        </div>
      </div>
    );
  }
  if (tab === "Reports") {
    const records = data.recoveries || [],
      applied = records.filter((r) => !r.undone);
    return (
      <>
        <div className="ops-report-stats">
          <div className="card">
            <ShieldCheck />
            <strong>{applied.length}</strong>
            <span>Retained recovery plans</span>
          </div>
          <div className="card">
            <Wallet />
            <strong>{currency(applied.reduce((n, r) => n + r.net, 0))}</strong>
            <span>Estimated net additional cost</span>
          </div>
          <div className="card">
            <Ticket />
            <strong>{applied.reduce((n, r) => n + r.changes, 0)}</strong>
            <span>Booking changes in retained plans</span>
          </div>
        </div>
        {data.portfolio && (
          <section className="card editor-card">
            <div className="row-between">
              <div>
                <h2>Portfolio insights</h2>
                <p>
                  Estimated value and refund exposure across active trips.
                  Illustrative policies only.
                </p>
              </div>
              <button
                className="button"
                onClick={() =>
                  downloadCsv(
                    "waypoint-portfolio.csv",
                    [
                      "Trip",
                      "Destination",
                      "Bookings",
                      "Travelers",
                      "Value INR",
                      "Refundable INR",
                      "Exposure INR",
                      "Warnings",
                      "Disruptions",
                    ],
                    data.portfolio.trips.map((p) => [
                      p.name,
                      p.destination,
                      p.bookings,
                      p.travelers,
                      p.value,
                      p.refundable,
                      p.exposure,
                      p.warnings,
                      p.disruptions,
                    ]),
                  )
                }
              >
                <Download size={14} />
                Export portfolio CSV
              </button>
            </div>
            <div className="ops-report-stats">
              <div className="card">
                <Wallet />
                <strong>{currency(data.portfolio.value)}</strong>
                <span>Booked value in active trips</span>
              </div>
              <div className="card">
                <ShieldCheck />
                <strong>{currency(data.portfolio.refundable)}</strong>
                <span>Still refundable</span>
              </div>
              <div className="card">
                <TriangleAlert />
                <strong>{currency(data.portfolio.exposure)}</strong>
                <span>Outside refund deadlines</span>
              </div>
            </div>
            {Object.entries(data.portfolio.byType)
              .sort((a, b) => b[1] - a[1])
              .map(([type, amount]) => (
                <div className="breakdown-row" key={type}>
                  <span>{type}</span>
                  <div className="breakdown-bar">
                    <i
                      style={{
                        width: `${Math.round(
                          (amount / (data.portfolio.value || 1)) * 100,
                        )}%`,
                      }}
                    />
                  </div>
                  <strong>{currency(amount)}</strong>
                </div>
              ))}
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Trip</th>
                    <th>Bookings</th>
                    <th>Value</th>
                    <th>Refundable</th>
                    <th>Exposure</th>
                    <th>Risks</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data.portfolio.trips.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <b>{p.name}</b>
                        <small>{p.destination}</small>
                      </td>
                      <td>
                        {p.bookings} · {p.travelers} traveler
                        {p.travelers === 1 ? "" : "s"}
                      </td>
                      <td>{currency(p.value)}</td>
                      <td>{currency(p.refundable)}</td>
                      <td>{currency(p.exposure)}</td>
                      <td>
                        {p.warnings} warnings · {p.disruptions} disruptions
                      </td>
                      <td>
                        <a className="text-button" href={"/trip/" + p.id}>
                          Open <ArrowUpRight size={13} />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!data.portfolio.trips.length && (
                <p className="empty">No active trips to summarise.</p>
              )}
            </div>
          </section>
        )}
        <section className="card editor-card">
          <div className="row-between">
            <div>
              <h2>Recovery report</h2>
              <p>Local estimates, not actual supplier payments.</p>
            </div>
            <button
              className="button"
              onClick={() =>
                downloadCsv(
                  "waypoint-recoveries.csv",
                  [
                    "Date",
                    "Trip",
                    "Plan",
                    "Booking changes",
                    "Net cost INR",
                    "Reverted",
                  ],
                  records.map((r) => [
                    r.appliedAt,
                    r.tripName,
                    r.label,
                    r.changes,
                    r.net,
                    r.undone,
                  ]),
                )
              }
            >
              <Download size={14} />
              Export recovery CSV
            </button>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Applied</th>
                  <th>Trip</th>
                  <th>Plan</th>
                  <th>Changes</th>
                  <th>Net cost</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id}>
                    <td>{when(r.appliedAt)}</td>
                    <td>{r.tripName}</td>
                    <td>{r.label}</td>
                    <td>{r.changes}</td>
                    <td>{currency(r.net)}</td>
                    <td>{r.undone ? "Reverted" : "Retained"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!records.length && (
              <p className="empty">
                Apply a recovery plan to see its report here.
              </p>
            )}
          </div>
          <button
            className="button"
            onClick={() =>
              downloadCsv(
                "waypoint-trips.csv",
                [
                  "Trip",
                  "Destination",
                  "Start",
                  "End",
                  "Bookings",
                  "Disruptions",
                  "Archived",
                ],
                (data.trips || []).map((t) => [
                  t.name,
                  t.destination,
                  t.start,
                  t.end,
                  t.bookings,
                  t.disruptions,
                  t.archived,
                ]),
              )
            }
          >
            <Download size={14} />
            Export trip summary CSV
          </button>
        </section>
      </>
    );
  }
  if (tab === "Settings")
    return (
      <div className="ops-grid">
        <section className="card editor-card">
          <h2>Monitoring preferences</h2>
          <p>
            Control local proactive checks and the freshness of this console.
          </p>
          <label className="switch-row">
            <span>
              <b>Proactive connection monitoring</b>
              <small>
                Scan active trips every 30 seconds for tight connections.
              </small>
            </span>
            <input
              type="checkbox"
              checked={!!data.settings.monitoring}
              onChange={(e) =>
                update("admin/settings", { monitoring: e.target.checked })
              }
            />
          </label>
          <label className="switch-row">
            <span>
              <b>Auto-refresh admin console</b>
              <small>
                Refresh metrics every 30 seconds while this console is open.
              </small>
            </span>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
          </label>
        </section>
        <section className="card editor-card">
          <h2>Application environment</h2>
          <dl className="system-details">
            {[
              ["Storage", data.system?.storage || "Local JSON"],
              ["Server runtime", data.system?.node || "—"],
              [
                "Uptime",
                Math.floor((data.system?.uptime || 0) / 60) + " minutes",
              ],
              ["Active sessions", data.system?.activeSessions || 0],
              ["Supplier connectivity", "Local simulation"],
              ["Email delivery", "Local outbox only"],
            ].map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <a className="button" href="/account">
            Manage my account <ArrowUpRight size={14} />
          </a>
        </section>
      </div>
    );
  return null;
}
