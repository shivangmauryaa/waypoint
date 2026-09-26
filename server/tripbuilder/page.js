/* Standalone page for /temprory — vanilla JS, no build step. */
export const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Waypoint Trip Builder — Prototype</title>
<style>
  :root{
    --ink:#15202b; --muted:#5c6b7a; --line:#e3e8ee; --bg:#f6f8fb;
    --brand:#0b7285; --brand-deep:#095e6e; --ok:#2b8a3e; --warn:#e8590c; --bad:#c92a2a;
    --card:#ffffff; --chip:#eef4f6;
  }
  *{box-sizing:border-box}
  body{margin:0;font:14px/1.55 ui-sans-serif,system-ui,"Segoe UI",Roboto,Arial;background:var(--bg);color:var(--ink)}
  header{background:linear-gradient(120deg,#0b7285,#0c5f80);color:#fff;padding:18px 28px;display:flex;align-items:center;gap:14px}
  header h1{font-size:18px;margin:0;font-weight:650}
  header .sub{font-size:11px;opacity:.85}
  .pill{background:rgba(255,255,255,.16);border-radius:20px;padding:4px 12px;font-size:11px}
  main{max-width:1240px;margin:0 auto;padding:22px 28px 80px}
  .tabs{display:flex;gap:10px;margin:6px 0 20px}
  .tab{border:1px solid var(--line);background:#fff;border-radius:10px;padding:10px 18px;font-weight:600;font-size:13px;cursor:pointer}
  .tab.active{background:var(--brand);border-color:var(--brand);color:#fff}
  .grid{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(320px,1fr);gap:22px;align-items:start}
  @media(max-width:980px){.grid{grid-template-columns:1fr}}
  .card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px;margin-bottom:18px}
  .card h3{margin:0 0 12px;font-size:14px;letter-spacing:.3px;text-transform:uppercase;color:var(--muted)}
  label{display:block;font-size:12px;color:var(--muted);margin:10px 0 4px;font-weight:600}
  input,select{width:100%;padding:9px 11px;border:1px solid var(--line);border-radius:9px;font:inherit;background:#fff}
  .row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .row3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
  .btn{background:var(--brand);color:#fff;border:0;border-radius:10px;padding:11px 18px;font:inherit;font-weight:650;cursor:pointer}
  .btn.ghost{background:#fff;color:var(--brand);border:1px solid var(--brand)}
  .btn:disabled{opacity:.55;cursor:not-allowed}
  .searchline{display:flex;align-items:center;gap:10px;padding:9px 12px;border:1px solid var(--line);border-radius:10px;margin:8px 0;background:#fff;font-size:13px}
  .searchline .state{margin-left:auto;font-size:11px;font-weight:700;letter-spacing:.5px}
  .state.SEARCHING{color:var(--warn)} .state.PARTIAL{color:var(--warn)}
  .state.COMPLETED,.state.FOUND{color:var(--ok)} .state.FAILED,.state.TIMEOUT{color:var(--bad)}
  .opt{border:1px solid var(--line);border-radius:12px;padding:13px 15px;margin:9px 0;background:#fff;display:flex;gap:12px;align-items:center;flex-wrap:wrap}
  .opt .who{font-weight:700}
  .opt .meta{color:var(--muted);font-size:12px}
  .opt .price{margin-left:auto;font-weight:750;white-space:nowrap}
  .badge{font-size:9px;font-weight:800;letter-spacing:.8px;border-radius:5px;padding:2px 6px;vertical-align:middle}
  .badge.live{background:#d3f9d8;color:#2b8a3e}.badge.verified{background:#d0ebff;color:#1971c2}
  .badge.estimated{background:#fff3bf;color:#e67700}.badge.simulated{background:#eee1ff;color:#7048e8}
  .btn.sel{padding:7px 14px;font-size:12px}
  .more{background:none;border:none;color:var(--brand);font:inherit;font-size:12px;cursor:pointer;font-weight:650}
  .costline{display:flex;justify-content:space-between;font-size:13px;padding:4px 0}
  .costline.total{border-top:2px solid var(--ink);margin-top:8px;padding-top:9px;font-weight:800;font-size:15px}
  .budgetbar{height:9px;background:#edf0f3;border-radius:6px;overflow:hidden;margin:10px 0 4px}
  .budgetbar>div{height:100%;background:var(--ok)}
  .over .budgetbar>div{background:var(--bad)}
  .warnbox{background:#fff4e6;border:1px solid #ffd8a8;color:#ad5700;border-radius:10px;padding:10px 13px;margin:9px 0;font-size:12.5px}
  .errbox{background:#ffe3e3;border:1px solid #ffc9c9;color:#c92a2a;border-radius:10px;padding:10px 13px;margin:9px 0;font-size:12.5px}
  .itinev{display:flex;gap:12px;padding:8px 0;border-bottom:1px dashed var(--line);font-size:13px}
  .itinev .t{font-weight:750;min-width:52px;color:var(--brand-deep)}
  .chat{display:flex;flex-direction:column;gap:12px;max-height:520px;overflow:auto;padding:4px 2px}
  .msg{max-width:92%;}
  .msg.user{align-self:flex-end;background:var(--brand);color:#fff;border-radius:14px 14px 3px 14px;padding:10px 14px;font-size:13.5px}
  .msg.ai{background:#fff;border:1px solid var(--line);border-radius:14px 14px 14px 3px;padding:12px 14px}
  .msg.ai .part{margin:6px 0}
  .msg .card-inline{background:var(--chip);border-radius:10px;padding:9px 12px;font-size:12.5px;margin:5px 0}
  .chiprow{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
  .chip{border:1px solid var(--line);border-radius:20px;padding:6px 13px;font-size:12px;cursor:pointer;background:#fff}
  .chip:hover{border-color:var(--brand);color:var(--brand)}
  .bookrow{display:flex;align-items:center;gap:9px;padding:7px 0;font-size:13px}
  .dot{width:10px;height:10px;border-radius:50%;background:#ced4da}
  .dot.ok{background:var(--ok)} .dot.busy{background:var(--warn);animation:pulse 1s infinite} .dot.bad{background:var(--bad)}
  @keyframes pulse{50%{opacity:.35}}
  .footer-note{font-size:11px;color:var(--muted);text-align:center;margin-top:30px}
  .hidden{display:none}
  .small{font-size:11.5px;color:var(--muted)}
</style>
</head>
<body>
<header>
  <div>
    <h1>Waypoint · Trip Builder <span class="pill">prototype</span></h1>
    <div class="sub">Progressive search · dependency recalculation · AI recovery · simulated providers</div>
  </div>
</header>
<main>
  <div class="tabs">
    <button class="tab active" data-tab="manual">Manual Build My Trip</button>
    <button class="tab" data-tab="ai">Automated Recovery (AI)</button>
    <button class="tab" data-tab="demo">Run demo script</button>
  </div>

  <div class="grid">
    <section>
      <!-- SETUP -->
      <div class="card" id="setupCard">
        <h3>Trip setup</h3>
        <div class="row3">
          <div><label>Current location</label><input id="from" value="Mumbai"/></div>
          <div><label>Destination</label><input id="to" value="Jaipur"/></div>
          <div><label>Date</label><input id="date" type="date" value="2026-10-15"/></div>
        </div>
        <div class="row3">
          <div><label>Travelers</label><input id="travelers" type="number" min="1" max="9" value="2"/></div>
          <div><label>Budget (₹)</label><input id="budget" type="number" min="0" step="500" value="25000"/></div>
          <div><label>Nights</label><input id="nights" type="number" min="1" max="10" value="2"/></div>
        </div>
        <div style="margin-top:14px;display:flex;gap:10px">
          <button class="btn" id="startBtn">Start progressive search</button>
          <button class="btn ghost" id="demoBtn">Fill demo: Mumbai → Jaipur</button>
        </div>
      </div>

      <!-- SEARCH PROGRESS -->
      <div class="card hidden" id="progressCard">
        <h3>Building your trip</h3>
        <div id="progressLines"></div>
      </div>

      <!-- RESULTS -->
      <div class="card hidden" id="resultsCard">
        <h3>Options <span class="small">(provider data — select one per category)</span></h3>
        <div id="results"></div>
      </div>
    </section>

    <aside>
      <!-- CURRENT TRIP -->
      <div class="card" id="tripCard">
        <h3>Current trip</h3>
        <div id="tripItems" class="small">Nothing selected yet.</div>
        <div id="costBox"></div>
        <div id="issuesBox"></div>
        <button class="btn hidden" id="bookBtn" style="width:100%;margin-top:12px">Confirm &amp; book</button>
      </div>

      <!-- ITINERARY -->
      <div class="card hidden" id="itineraryCard">
        <h3>Itinerary</h3>
        <div id="itinerary"></div>
      </div>

      <!-- BOOKINGS -->
      <div class="card hidden" id="bookingCard">
        <h3>Booking</h3>
        <div id="bookingLines"></div>
        <div id="bookingSummary" class="small"></div>
      </div>

      <!-- AI CHAT -->
      <div class="card hidden" id="chatCard">
        <h3>AI Recovery</h3>
        <div class="chat" id="chat"></div>
        <div class="chiprow" id="chips"></div>
        <div style="display:flex;gap:9px;margin-top:12px">
          <input id="chatInput" placeholder='e.g. "I missed my Jaipur flight, stuck in Mumbai with ₹20,000"'/>
          <button class="btn" id="sendBtn">Send</button>
        </div>
      </div>
    </aside>
  </div>
  <div class="footer-note">Simulated providers · deterministic demo data · no real bookings · mounted at /temprory</div>
</main>
<script>
const $ = (s) => document.querySelector(s);
const money = (n) => "₹" + Math.round(n||0).toLocaleString("en-IN");
let SESSION = localStorage.getItem("tb_session") || "";
const hdr = () => ({ "Content-Type": "application/json", "x-tb-session": SESSION });
async function api(path, body, method) {
  const r = await fetch("/temprory/api" + path, { method: method || (body ? "POST" : "GET"), headers: hdr(), body: body ? JSON.stringify(body) : undefined });
  const sc = r.headers.get("x-tb-session");
  if (sc) localStorage.setItem("tb_session", sc);
  return r.json();
}

/* Tabs */
document.querySelectorAll(".tab").forEach(t => t.onclick = () => {
  document.querySelectorAll(".tab").forEach(x => x.classList.remove("active"));
  t.classList.add("active");
  if (t.dataset.tab === "ai") { $("#chatCard").classList.remove("hidden"); $("#chatCard").scrollIntoView({behavior:"smooth"}); }
  if (t.dataset.tab === "demo") runDemo();
  if (t.dataset.tab === "manual") $("#setupCard").scrollIntoView({behavior:"smooth"});
});

const CATS = [
  { key: "transport", icon: "✈️", title: "Transport" },
  { key: "hotels", icon: "🏨", title: "Hotels" },
  { key: "transfers", icon: "🚕", title: "Airport transfer" },
  { key: "restaurants", icon: "🍛", title: "Restaurants" },
  { key: "activities", icon: "🎯", title: "Activities" },
];

function renderProgress(lines) {
  $("#progressCard").classList.remove("hidden");
  $("#progressLines").innerHTML = lines.map(l =>
    \`<div class="searchline"><span>\${l.icon}</span><span>Searching \${l.title}…</span><span class="state \${l.state}">\${l.state}</span></div>\`).join("");
}
function renderResults(pool) {
  $("#resultsCard").classList.remove("hidden");
  const show = (list, fmt) => {
    const top = list.slice(0, 4);
    let html = top.map(fmt).join("");
    if (list.length > 4) {
      html += \`<button class="more" data-more="1">See more (\${list.length - 4} more) ⌄</button>\`;
      html += '<div class="extra hidden">' + list.slice(4).map(fmt).join("") + "</div>";
    }
    return html;
  };
  $("#results").innerHTML =
    show(pool.transport || [], o => optionRow(o, \`<span class="who">\${o.provider} \${o.code||""}</span> <span class="badge \${o.badge}">\${o.badge}</span><div class="meta">\${o.from} → \${o.to} · \${o.depart}–\${o.arrive} · \${o.duration}\${o.stops?\` · \${o.stops} stop(s)\`:""}\${o.cls?\` · \${o.cls}\`:""}</div>\`, money(o.pricePerHead))) +
    show(pool.hotels || [], o => optionRow(o, \`<span class="who">\${o.name}</span> <span class="badge \${o.badge}">\${o.badge}</span><div class="meta">\${"★".repeat(o.stars)} · \${o.rating}⭐ · \${o.distance_from_center_km} km from center · \${o.amenities.slice(0,3).join(", ")}</div>\`, \`\${money(o.price_per_night)}/night · \${money(o.total_price)} total\`)) +
    show(pool.transfers || [], o => optionRow(o, \`<span class="who">\${o.provider}</span> <span class="badge \${o.badge}">\${o.badge}</span><div class="meta">\${o.route} · \${o.distance_km} km · \${o.eta_min} min</div>\`, money(o.estimated_price))) +
    show(pool.restaurants || [], o => optionRow(o, \`<span class="who">\${o.name}</span> <span class="badge \${o.badge}">\${o.badge}</span><div class="meta">\${o.cuisine} · \${o.rating}⭐ · \${o.distance_km} km · open \${o.opening_time}–\${o.closing_time}</div>\`, \`\${money(o.price_per_person)}/person\`)) +
    show(pool.activities || [], o => optionRow(o, \`<span class="who">\${o.name}</span> <span class="badge \${o.badge}">\${o.badge}</span><div class="meta">\${o.category} · \${o.duration} · \${o.rating}⭐ · open \${o.opening_time}–\${o.closing_time}</div>\`, o.price ? money(o.price) : "Free"));
  document.querySelectorAll("[data-more]").forEach(b => b.onclick = () => b.nextElementSibling.classList.toggle("hidden"));
  document.querySelectorAll("[data-sel]").forEach(b => b.onclick = async () => {
    const [kind, id] = b.dataset.sel.split("|");
    const item = findItem(kind, id);
    const st = await api("/select", { item });
    renderState(st);
  });
}
function optionRow(o, left, right) {
  return \`<div class="opt"><div>\${left}</div><div class="price">\${right} <button class="btn sel" data-sel="\${o.kind}|\${o.id}">Select</button></div></div>\`;
}
function findItem(kind, id) {
  const map = { flight: st.pool.transport, train: st.pool.transport, bus: st.pool.transport, hotel: st.pool.hotels, transfer: st.pool.transfers, restaurant: st.pool.restaurants, activity: st.pool.activities };
  return (map[kind] || []).find(x => x.id === id);
}
function renderState(s) {
  st = s;
  const icons = { flight: "✈️", train: "🚆", bus: "🚌", hotel: "🏨", transfer: "🚕", restaurant: "🍛", activity: "🎯" };
  $("#tripItems").innerHTML = s.items.length ? s.items.map(i =>
    \`<div class="opt"><div><span class="who">\${icons[i.kind]||""} \${i.provider||i.name}</span><div class="meta">\${i.kind}\${i.from?\` · \${i.from}→\${i.to}\`:""}\${i.total_price?\` · \${money(i.total_price)}\`:i.price?\` · \${money(i.price)}\`:i.estimated_price?\` · \${money(i.estimated_price)}\`:""}</div></div><div class="price"><button class="more" data-rm="\${i.id}">remove</button></div></div>\`).join("")
    : "Nothing selected yet.";
  document.querySelectorAll("[data-rm]").forEach(b => b.onclick = async () => renderState(await api("/remove", { id: b.dataset.rm })));
  const c = s.cost || { lines: [], total: 0 };
  $("#costBox").innerHTML =
    c.lines.map(l => \`<div class="costline"><span>\${l.label}</span><b>\${money(l.amount)}</b></div>\`).join("") +
    \`<div class="costline total"><span>TOTAL</span><b>\${money(c.total)}</b></div>\` +
    (s.budget ? \`<div class="budgetbar"><div style="width:\${Math.min(100, c.total/s.budget*100)}%"></div></div>
      <div class="small">\${c.over_budget ? \`⚠️ \${money(c.over)} over budget of \${money(s.budget)}\` : \`Remaining: \${money(s.budget - c.total)} of \${money(s.budget)}\`}</div>\` : "");
  $("#issuesBox").innerHTML = (s.issues||[]).map(i =>
    \`<div class="\${i.level==="error"?"errbox":"warnbox"}">\${i.level==="error"?"⛔":"⚠️"} \${i.msg}</div>\`).join("");
  $("#bookBtn").classList.toggle("hidden", !(s.items||[]).length);
  if (s.schedule && s.schedule.length) {
    $("#itineraryCard").classList.remove("hidden");
    $("#itinerary").innerHTML = s.schedule.map(d =>
      \`<div style="font-weight:700;margin:12px 0 4px">DAY \${d.index}</div>\` +
      d.events.map(e => \`<div class="itinev"><span class="t">\${e.time}</span><span>\${e.icon} \${e.title}<div class="small">\${e.detail||""}</div></span></div>\`).join("")).join("");
  }
}

/* Start search (SSE progressive) */
$("#startBtn").onclick = async () => {
  await api("/start", {
    mode: "manual",
    from: $("#from").value, to: $("#to").value, date: $("#date").value,
    travelers: +$("#travelers").value, budget: +$("#budget").value, nights: +$("#nights").value,
  });
  $("#progressCard").classList.remove("hidden");
  $("#chatCard").classList.add("hidden");
  $("#progressLines").innerHTML = "";
  const es = new EventSource("/temprory/api/search");
  es.addEventListener("progress", e => { const d = JSON.parse(e.data); pushLine(d); });
  es.addEventListener("partial", e => { const d = JSON.parse(e.data); updateLine(d); });
  es.addEventListener("complete", e => { const d = JSON.parse(e.data); updateLine(d); st.pool[d.key] = d.results; if (d.key==="transfers") st.pool.transfers = d.results; renderResults(st.pool); });
  es.addEventListener("done", e => { const d = JSON.parse(e.data); st = d.pool ? { pool: d.pool } : st; es.close(); $("#startBtn").disabled = false; renderState(await api("/state")); });
  $("#startBtn").disabled = true;
};
let st = { pool: {} };
const lineMap = {};
function pushLine(d) {
  const icons = { transport: "✈️", hotels: "🏨", transfers: "🚕", restaurants: "🍛", activities: "🎯" };
  const el = document.createElement("div");
  el.className = "searchline";
  el.innerHTML = \`<span>\${icons[d.key]||"⏳"}</span><span>\${d.label}</span><span class="state \${d.state}">\${d.state}</span>\`;
  $("#progressLines").appendChild(el); lineMap[d.key] = el;
}
function updateLine(d) {
  const el = lineMap[d.key]; if (!el) return;
  const sEl = el.querySelector(".state");
  sEl.textContent = d.state === "COMPLETED" ? \`✓ \${d.count ?? ""} found\` : d.state;
  sEl.className = "state " + d.state;
}

/* AI chat */
function addMsg(role, parts) {
  const el = document.createElement("div");
  el.className = "msg " + role;
  if (role === "user") el.textContent = parts;
  else {
    for (const p of parts || []) {
      if (p.type === "text") el.innerHTML += \`<div class="part">\${p.text.replace(/\\n/g,"<br/>")}</div>\`;
      if (p.type === "progress") el.innerHTML += p.lines.map(l => \`<div class="card-inline">\${l}</div>\`).join("");
      if (p.type === "plan") {
        el.innerHTML += \`<div class="part card-inline"><b>Proposed plan — \${money(p.cost.total)}</b><br/>\${p.items.map(i => \`✈️🏨🚕🍛🎯\`.slice(0,0) || iconFor(i) + " " + (i.provider||i.name) + " · " + money(i.pricePerHead || i.total_price || i.estimated_price || i.price_per_person || i.price)).join("<br/>")}</div>\`;
        if (p.explain && p.explain.length) el.innerHTML += p.explain.map(x => \`<div class="part small">💡 \${x}</div>\`).join("");
      }
      if (p.type === "alternatives") el.innerHTML += p.items.map(o => optionRow(o, \`<span class="who">\${o.name}</span><div class="meta">\${"★".repeat(o.stars)} · \${money(o.total_price)}</div>\`, \`<button class="btn sel" onclick="pickAlt('\${o.id}')">Use</button>\`)).join("");
      if (p.type === "booking") {
        el.innerHTML += p.bookings.map(b => \`<div class="bookrow"><span class="dot \${b.status==="BOOKED"?"ok":"bad"}"></span> \${iconFor(b.item)} \${b.item.provider||b.item.name} — <b>\${b.status}</b> \${b.id} \${b.reason?\`<span class="small">\${b.reason}</span>\`:""}</div>\${b.alternative ? \`<div class="card-inline">💡 Alternative available: <b>\${b.alternative.provider||b.alternative.name}</b> · \${money(b.alternative.total_price || b.alternative.estimated_price || b.alternative.price_per_person || b.alternative.price)} <button class="btn sel" onclick="retryBooking('\${b.id}')">Use alternative</button></div>\` : ""}").join("");
        el.innerHTML += \`<div class="part"><b>\${p.summary}</b></div>\`;
      }
    }
  }
  $("#chat").appendChild(el); $("#chat").scrollTop = 1e9;
}
const iconFor = (i) => ({ flight:"✈️", train:"🚆", bus:"🚌", hotel:"🏨", transfer:"🚕", restaurant:"🍛", activity:"🎯" }[i.kind] || "•");
async function sendChat(text) {
  if (!text.trim()) return;
  addMsg("user", text);
  const r = await api("/ai", { text });
  addMsg("ai", r.reply.parts);
  renderState(r.state);
  showChips();
}
$("#sendBtn").onclick = () => { sendChat($("#chatInput").value); $("#chatInput").value = ""; };
$("#chatInput").addEventListener("keydown", e => { if (e.key === "Enter") $("#sendBtn").onclick(); });
function showChips() {
  $("#chips").innerHTML = ["Make it cheaper", "Add a water park", "Change the hotel", "Keep it under ₹15000", "Book it"].map(c => \`<button class="chip" data-c="\${c}">\${c}</button>\`).join("");
  document.querySelectorAll("[data-c]").forEach(b => b.onclick = () => sendChat(b.dataset.c));
}
async function pickAlt(id) {
  const r = await api("/ai", { text: "use alternative " + id });
  addMsg("ai", r.reply.parts); renderState(r.state);
}
window.pickAlt = pickAlt;
async function retryBooking(id) {
  const r = await api("/booking/retry", { id });
  const fail = r.bookings.find(x => x.id === id);
  addMsg("ai", [{ type: "progress", lines: [fail && fail.note ? "✓ " + fail.note : "✓ Booking recovered: " + id] }]);
  renderState({ ...st, cost: r.cost });
  const el = document.createElement("div");
  el.className = "msg ai";
  el.innerHTML = r.bookings.map(b => '<div class="bookrow"><span class="dot ' + (b.status==="BOOKED"?"ok":"bad") + '"></span> ' + iconFor(b.item) + " " + (b.item.provider||b.item.name) + " — <b>" + b.status + "</b> " + b.id + "</div>").join("");
  $("#chat").appendChild(el);
}
window.retryBooking = retryBooking;

/* Demo script */
async function runDemo() {
  document.querySelector('[data-tab="ai"]').click();
  const script = await (await fetch("/temprory/api/demo")).json();
  for (const line of script.script) {
    await sendChat(line);
    await new Promise(r => setTimeout(r, 900));
  }
}
$("#demoBtn").onclick = runDemo;

/* restore state */
(async () => { try { renderState(await api("/state")); } catch {} })();
</script>
</body>
</html>`;
