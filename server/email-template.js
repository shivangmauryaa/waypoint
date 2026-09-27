import { resolve } from "node:path";

const asset = (...parts) => resolve(process.cwd(), "public", ...parts);
const cityImages = [
  { match: /jaipur/i, filename: "jaipur-palace.jpg", path: asset("images", "build-welcome", "jaipur-palace.jpg") },
  { match: /bengaluru|bangalore/i, filename: "bangalore.jpg", path: asset("images", "build-welcome", "bangalore.jpg") },
  { match: /udaipur/i, filename: "udaipur-lake.jpg", path: asset("images", "build-welcome", "udaipur-lake.jpg") },
  { match: /varanasi/i, filename: "varanasi-ghats.jpg", path: asset("images", "build-welcome", "varanasi-ghats.jpg") },
  { match: /manali/i, filename: "manali.jpg", path: asset("images", "build-welcome", "manali.jpg") },
];

const escapeHtml = (value = "") =>
  String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);

const cleanBaseUrl = (value) => {
  try {
    const url = new URL(value || "http://localhost:3001");
    if (!/^(https?):$/.test(url.protocol)) return "http://localhost:3001";
    return url.toString().replace(/\/$/, "");
  } catch {
    return "http://localhost:3001";
  }
};

const dateLabel = (value) => {
  if (!value) return "Schedule to be confirmed";
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  if (Number.isNaN(date.getTime())) return "Schedule to be confirmed";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const tripRange = (trip) => {
  if (!trip.start && !trip.end) return "Your saved trip itinerary";
  const from = trip.start ? new Date(`${trip.start}T12:00:00`) : null;
  const to = trip.end ? new Date(`${trip.end}T12:00:00`) : null;
  const format = (date) => date && !Number.isNaN(date.getTime())
    ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }).format(date)
    : "";
  return `${format(from)}${to ? ` – ${format(to)}` : ""}`;
};

const eventIcon = (type = "") => {
  if (/flight|plane/i.test(type)) return "✈";
  if (/train|bus|transfer|car/i.test(type)) return "▣";
  if (/hotel|stay/i.test(type)) return "⌂";
  return "◆";
};

const button = (href, label, primary = false) =>
  `<a href="${escapeHtml(href)}" style="display:inline-block;margin:4px 5px;padding:13px 18px;border:1px solid ${primary ? "#0969f9" : "#c7d8f5"};border-radius:10px;background:${primary ? "#0969f9" : "#ffffff"};color:${primary ? "#ffffff" : "#075be5"};font-size:15px;font-weight:700;text-decoration:none;white-space:nowrap">${escapeHtml(label)} &nbsp;→</a>`;

export function renderTravelerAlertEmail(result, { baseUrl = process.env.APP_BASE_URL } = {}) {
  const root = cleanBaseUrl(baseUrl);
  const trip = result.trip || {};
  const tripId = encodeURIComponent(trip.id || result.tripId || "");
  const tripUrl = `${root}/trip/${tripId}/overview`;
  const recoveryUrl = `${root}/trip/${tripId}/recovery`;
  const inboxUrl = `${root}/notifications`;
  const bookings = (trip.bookings || []).slice(0, 4);
  const firstLine = String(result.body || "Review your trip for the latest update.").split(/\r?\n/).find(Boolean) || "Review your trip for the latest update.";
  const isCancelled = Boolean(trip.cancelled) || /cancel/i.test(result.subject || "");
  const isIssue = /issue|disruption|weather|warning|impact|check complete|recover/i.test(`${result.subject || ""} ${result.body || ""}`);
  const alertLabel = isCancelled ? "TRIP STATUS UPDATE" : isIssue ? "TRAVEL ALERT" : "WAYPOINT UPDATE";
  const severity = isCancelled ? "TRIP CANCELLED" : isIssue ? "IMPORTANT" : "TRIP UPDATE";
  const accent = isCancelled || isIssue ? "#e3232d" : "#0868f8";
  const impactItems = result.impacts?.length
    ? result.impacts.slice(0, 3)
    : isCancelled
      ? ["Your trip is marked cancelled in Waypoint", "Review the trip page for its bookings and next steps"]
      : isIssue
        ? ["A booking or connection may need attention", "Check recovery options before your travel date"]
        : ["Your saved itinerary reflects the latest update", "Open your trip to review affected bookings"];
  const timeline = bookings.length
    ? bookings.map((booking) => `<td class="timeline-cell" width="25%" valign="top" style="padding:5px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #dce7f7;border-radius:12px"><tr><td style="padding:10px 10px 3px;color:#0868f8;font-size:18px;font-weight:bold">${eventIcon(booking.type)}</td></tr><tr><td style="padding:1px 10px 0;color:#101a56;font-size:13px;font-weight:bold;line-height:18px">${escapeHtml(booking.title || booking.provider || "Trip item")}</td></tr><tr><td style="padding:4px 10px 10px;color:#5c6e9a;font-size:12px;line-height:17px">${escapeHtml(dateLabel(booking.start))}${booking.provider ? `<br>${escapeHtml(booking.provider)}` : ""}</td></tr></table></td>`).join("")
    : `<td style="padding:12px;color:#5c6e9a;font-size:13px">Your trip items will appear here.</td>`;
  const cityImage = cityImages.find(({ match }) => match.test(`${trip.destination || ""} ${trip.route || ""}`));
  const attachments = [
    { filename: "waypoint-mark.png", path: asset("icons", "app-icon-192.png"), cid: "waypoint-logo" },
    ...(cityImage ? [{ filename: cityImage.filename, path: cityImage.path, cid: "trip-destination" }] : []),
  ];
  const hero = cityImage
    ? `<tr><td style="padding:0"><img src="cid:trip-destination" width="900" alt="${escapeHtml(trip.destination || "Your destination")}" style="display:block;width:100%;max-width:900px;height:auto;border:0"></td></tr>`
    : "";
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(result.subject || "Waypoint travel update")}</title><style>body{margin:0!important;padding:0!important;background:#f1f4f8}.outer{width:100%;background:#f1f4f8}.container{width:100%;max-width:900px}.stack{width:50%}.timeline-cell{width:25%}@media only screen and (max-width:620px){.container{width:100%!important}.gutter{padding-left:18px!important;padding-right:18px!important}.stack{display:block!important;width:100%!important}.timeline-cell{display:block!important;width:auto!important}.footer-feature{display:inline-block!important;width:48%!important}}</style></head><body style="margin:0;background:#f1f4f8;font-family:Arial,Helvetica,sans-serif;color:#111b53"><div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(firstLine)} Review your trip and recovery options in Waypoint.</div><table role="presentation" class="outer" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding:24px 10px"><table role="presentation" class="container" width="900" cellpadding="0" cellspacing="0" border="0" style="max-width:900px;background:#ffffff;border-radius:18px;overflow:hidden"><tr><td class="gutter" style="padding:18px 34px;border-bottom:1px solid #e8edf5"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td width="54"><img src="cid:waypoint-logo" width="46" height="46" alt="" style="display:block;width:46px;height:46px"></td><td style="font-size:28px;line-height:30px;font-weight:800;letter-spacing:-1px;color:#071548">waypoint<br><span style="font-size:10px;letter-spacing:2px;font-weight:700;color:#68769d">TRAVEL COMPANION</span></td><td align="right" style="color:#53658e;font-size:14px">Smarter travel. Fewer disruptions. A better journey.</td></tr></table></td></tr>${hero}<tr><td style="padding:0;background:#102c67"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td class="gutter" style="padding:22px 34px 24px;color:#ffffff"><div style="font-size:13px;letter-spacing:1px;font-weight:700;color:#bed8ff">${alertLabel}</div><div style="font-size:36px;line-height:42px;font-weight:800;padding-top:5px">${escapeHtml(isCancelled ? "Trip update" : isIssue ? "Travel disruption" : "Trip update")}</div><div style="font-size:17px;line-height:25px;padding-top:5px;color:#e5efff">${escapeHtml(firstLine)}</div></td></tr></table></td></tr><tr><td class="gutter" style="padding:25px 34px 4px"><div style="font-size:23px;font-weight:800;color:#0a164e">Hi ${escapeHtml(result.travelerName || "traveler")},</div><div style="padding-top:7px;color:#34466f;font-size:16px;line-height:25px">${escapeHtml(result.intro || (isCancelled ? "An update has been made to your trip. Review the details and next steps below." : "We found an update that may affect your upcoming plans. Review the details and your available options below."))}</div></td></tr><tr><td class="gutter" style="padding:20px 34px 8px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${isCancelled || isIssue ? "#fff3f3" : "#eff6ff"};border:1px solid ${isCancelled || isIssue ? "#ffd8d8" : "#d6e7ff"};border-radius:14px"><tr><td width="76" valign="top" style="padding:17px 0 17px 17px"><div style="width:54px;height:54px;border-radius:13px;background:${isCancelled || isIssue ? "#ffe4e5" : "#deedff"};text-align:center;line-height:54px;color:${accent};font-size:30px;font-weight:bold">${isCancelled || isIssue ? "!" : "i"}</div></td><td valign="top" style="padding:17px 10px"><div style="font-size:14px;font-weight:800;color:${accent}">${severity}</div><div style="padding-top:3px;font-size:22px;font-weight:800;color:#0a164e">${escapeHtml(result.subject || "Trip update")}</div><div style="padding-top:5px;color:#34466f;font-size:14px;line-height:21px;white-space:pre-line">${escapeHtml(result.body || "Review your Waypoint trip for the latest details.")}</div></td><td class="hide-mobile" align="right" valign="top" style="padding:20px 18px;color:${accent};font-size:13px;white-space:nowrap">${escapeHtml(new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date()))}</td></tr></table></td></tr><tr><td class="gutter" style="padding:10px 34px 5px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #dce7f7;border-radius:14px"><tr><td style="padding:15px 17px 4px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="font-size:21px;font-weight:800;color:#0a164e">✈ &nbsp;Your Trip</td><td align="right"><a href="${escapeHtml(tripUrl)}" style="color:#0665f7;text-decoration:none;font-weight:bold">View full trip &nbsp;→</a></td></tr><tr><td colspan="2" style="padding:4px 0 9px;color:#5c6e9a;font-size:14px">${escapeHtml(trip.name || trip.route || trip.destination || "Your Waypoint trip")} &nbsp;·&nbsp; ${escapeHtml(tripRange(trip))}</td></tr></table></td></tr><tr><td style="padding:0 10px 12px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${timeline}</tr></table></td></tr></table></td></tr><tr><td class="gutter" style="padding:14px 34px 8px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td class="stack" width="50%" valign="top" style="padding:0 7px 0 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="height:100%;background:#f8faff;border:1px solid #e4eaf4;border-radius:14px"><tr><td style="padding:15px 16px 18px"><div style="font-size:18px;font-weight:800;color:#0a164e">▤ &nbsp;What happened?</div><div style="padding-top:10px;color:#34466f;font-size:14px;line-height:22px;white-space:pre-line">${escapeHtml(result.body || firstLine)}</div></td></tr></table></td><td class="stack" width="50%" valign="top" style="padding:0 0 0 7px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="height:100%;background:#f8faff;border:1px solid #e4eaf4;border-radius:14px"><tr><td style="padding:15px 16px 18px"><div style="font-size:18px;font-weight:800;color:#0a164e">⚠ &nbsp;Potential impact</div><ul style="margin:10px 0 0;padding-left:20px;color:#34466f;font-size:14px;line-height:23px">${impactItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></td></tr></table></td></tr></table></td></tr><tr><td class="gutter" style="padding:12px 34px 12px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eff6ff;border:1px solid #dceaff;border-radius:14px"><tr><td style="padding:18px 20px"><div style="font-size:20px;font-weight:800;color:#0a164e">✧ &nbsp;Recommended actions</div><div style="padding-top:9px">${button(recoveryUrl, "Find recovery options", !isCancelled)}${button(tripUrl, "View trip details")}${button(inboxUrl, "Open notifications")}</div></td></tr></table></td></tr><tr><td class="gutter" style="padding:4px 34px 22px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f9ff;border:1px solid #dceaff;border-radius:12px"><tr><td width="60" style="padding:13px 5px 13px 16px;color:#0969f9;font-size:28px">●</td><td style="padding:13px 16px 13px 4px;color:#53658e;font-size:14px;line-height:22px">Waypoint keeps important travel events visible so you can act before a disruption becomes a missed connection.</td></tr></table></td></tr><tr><td class="gutter" style="padding:19px 34px;border-top:1px solid #e4eaf4;border-bottom:1px solid #e4eaf4"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td width="50"><img src="cid:waypoint-logo" width="42" height="42" alt="" style="display:block"></td><td style="font-size:22px;font-weight:800;color:#071548">waypoint<br><span style="font-size:9px;letter-spacing:1.8px;color:#68769d">TRAVEL COMPANION</span></td><td align="right" style="color:#6c7898;font-size:12px">Live weather &nbsp;·&nbsp; Trip protection<br>Smart replanning &nbsp;·&nbsp; Real-world signals</td></tr></table></td></tr><tr><td class="gutter" style="padding:16px 34px;color:#7682a0;font-size:12px">© ${new Date().getFullYear()} Waypoint Travel. All rights reserved.<br><span style="display:inline-block;padding-top:7px">This travel alert was sent because an administrator updated your Waypoint trip.</span></td></tr></table></td></tr></table></body></html>`;
  return { html, attachments };
}
