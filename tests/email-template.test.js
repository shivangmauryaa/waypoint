import test from "node:test";
import assert from "node:assert/strict";
import { renderTravelerAlertEmail } from "../server/email-template.js";

test("traveler alert email includes branded trip context, itinerary, and real action links", () => {
  const rendered = renderTravelerAlertEmail(
    {
      to: "alex@example.com",
      travelerName: "Alex",
      subject: "Trip cancelled",
      body: "An administrator cancelled this trip. Review your next steps.",
      trip: {
        id: "trip-123",
        name: "Delhi → Jaipur",
        destination: "Jaipur, India",
        start: "2026-10-12",
        end: "2026-10-14",
        cancelled: true,
        bookings: [
          { type: "flight", title: "Delhi → Jaipur", provider: "IndiGo · 6E 204", start: "2026-10-12T08:00:00+05:30" },
          { type: "hotel", title: "Check in at Alsisar Haveli", provider: "Alsisar Haveli", start: "2026-10-12T11:00:00+05:30" },
        ],
      },
      impacts: ["Your trip is marked cancelled in Waypoint"],
    },
    { baseUrl: "https://travel.example" },
  );

  assert.match(rendered.html, /Hi Alex/);
  assert.match(rendered.html, /TRIP CANCELLED/);
  assert.match(rendered.html, /IndiGo · 6E 204/);
  assert.match(rendered.html, /Your trip is marked cancelled in Waypoint/);
  assert.match(rendered.html, /https:\/\/travel\.example\/trip\/trip-123\/overview/);
  assert.match(rendered.html, /https:\/\/travel\.example\/trip\/trip-123\/recovery/);
  assert.match(rendered.html, /https:\/\/travel\.example\/notifications/);
  assert.deepEqual(rendered.attachments.map(({ cid }) => cid), ["waypoint-logo", "trip-destination"]);
});

test("traveler email escapes user-provided text and uses a safe local base URL fallback", () => {
  const rendered = renderTravelerAlertEmail({
    travelerName: "<img src=x onerror=alert(1)>",
    subject: "Update <script>alert(1)</script>",
    body: "A change & a new detail",
    trip: { id: "id/with spaces", name: "<b>Trip</b>", destination: "Unknown City", bookings: [] },
  }, { baseUrl: "javascript:alert(1)" });

  assert.doesNotMatch(rendered.html, /<script>|<img src=x/);
  assert.match(rendered.html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(rendered.html, /http:\/\/localhost:3001\/trip\/id%2Fwith%20spaces\/overview/);
  assert.deepEqual(rendered.attachments.map(({ cid }) => cid), ["waypoint-logo"]);
});
