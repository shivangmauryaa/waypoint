# Feature status against the supplied brief

The admin console now has full-screen left-side navigation, clean direct URLs, a searchable booking directory, recovery queue, CSV reports and a system-settings page. Clean URL routing supports deep-link refresh, browser history and automatic migration of legacy hash links.

The application is a local, multi-user hackathon implementation. This matrix is intentionally explicit: a working local workflow is different from an external service being connected.

| Requested feature                   | Implementation                                                                                                                                     |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Landing page                        | Responsive marketing page, feature explanation, walkthrough, signup/login routes                                                                   |
| Signup/login/logout                 | Email/password accounts, scrypt password hashes, expiring server-side sessions, HttpOnly cookies                                                   |
| Normal user and admin               | Server-enforced roles; signup always creates a traveler; admin user management and trip support mode                                               |
| Verification and forgotten password | One-hour, single-use tokens; local email outbox; reset revokes existing sessions                                                                   |
| Profile and preferences             | Name, phone, seat, cabin, loyalty notes, local email-preview preference; per-trip budget/ranking/accessibility                                     |
| Multiple trips                      | Create, edit, delete, search, filter, sort, archive/restore, or add a complete sample trip; each trip tile shows its resilience state (risk, booked value, warnings, next departure) with attention-first sorting |
| Trip deletion                       | Delete a trip permanently from its tile on **My trips**, with a confirmation prompt; ownership-checked and recorded in the audit log |
| Travel analytics dashboard          | `/dashboard` aggregates all of a traveler's trips: KPI cards, booked-value-by-type donut, trip-readiness and refund-exposure bars, upcoming departures, cross-trip proactive alerts and recovery outcomes (no chart library; lightweight SVG/CSS) |
| Booking management                  | Create/edit/remove six booking types, times, route codes, party prices, refund rules and dependencies                                              |
| Manual ingestion                    | Full booking editor and dependency controls                                                                                                        |
| JSON ingestion                      | Validated trip import/export, preserving trip ownership and rejecting malformed graphs                                                             |
| Spreadsheet export                  | One-click CSV of the itinerary (times, routes, party value, refund policy, dependencies) for planners and expense tracking                          |
| PDF and confirmation ingestion      | Local text extraction from PDFs; structured email/text fields; review before saving                                                                |
| Calendar ingestion                  | UTC/floating-time .ics event parsing and draft review; .ics itinerary export                                                                       |
| Unified console layout              | Traveler workspace and trip console reuse the admin console's full-screen left-rail layout with grouped, badge-aware navigation and a mobile drawer                        |
| Addressable trip functions          | Each trip section is its own URL (`/trip/<id>/overview`, `/itinerary`, `/recovery`, `/insights`, `/activity`, `/preferences`, `/inventory`, `/assistant`, `/policies`, `/settings`) with back/forward support and room to add more |
| Itinerary dashboard                 | Responsive trip cards, day-filtered timeline, status/policy details, print support                                                                 |
| Dependency visualization            | SVG graph with direction arrows, connection buffers, keyboard access and downstream highlighting                                                   |
| Disruption monitoring               | Manual/admin events for delay, cancellation, weather, missed connection, transfer failure and traveler change                                      |
| Direct/downstream impact            | Topological graph traversal with explanatory causes                                                                                                |
| Multi-component recovery            | Bounded deterministic search across local flight/train/transfer/hotel/activity/event alternatives; offers can change transport type                |
| Inventory                           | Add/remove offers manually or generate clearly labeled sample inventory for any custom trip                                                        |
| Costs and refunds                   | Party-total INR costs, deadline-based sample refunds, sample supplier-cancellation refund; no double-credit for retained bookings                  || Plan comparison                  | Up to three distinct feasible alternatives, net/new/refund costs, total schedule shift, percentage preserved and change details                                                                |
| Trip insights                    | Per-trip booked value, still-refundable amount and refund exposure, next booking countdown, connection warnings and a cost breakdown by booking type |
| Duplication                      | Duplicate an entire trip as a template (bookings, offers and dependencies remapped to fresh IDs) or duplicate a single booking as a starting point |
| Applying recovery                   | Revalidation, stale-version rejection, atomic JSON update, history, notification and undo of most recent recovery                                  |
| Recovery restore points             | Restore the itinerary to the snapshot before any earlier recovery from Activity; later recoveries are marked reverted together                      |
| Proactive alerts                    | Tight/impossible connections and location mismatches; background scan every 30 seconds, deduplicated per trip version                              |
| Connection risk scoring             | Per-booking 0–100 rule-based score with band and plain-language factors, from buffer slack, route breaks, active disruptions and departure windows; trip-level average and worst booking (explicitly not a trained ML model) |
| Plan comparison                     | Sortable table comparing recovery plans by net cost, estimated refunds, schedule shift, bookings changed and percentage preserved, alongside the plan cards |
| Refund policy explainer             | A Refund policies section showing, per booking, whether a refund is full/partial/none/expired against the trip clock, the amount, and the reason |
| Notifications                       | Private persisted inbox with read state, polling, and local email previews                                                                         |
| Trip assistant                      | Rule-based responses grounded in itinerary, recovery cost and connection risks, plus schedule, trip value/refunds, weather and accessibility intents; explicitly not an LLM |
| Human support                       | Traveler tickets, threaded replies, administrator resolution and reply notifications                                                               |
| Admin overrides                     | Admin can review/manage any trip with audit events; ownership remains with traveler                                                                |
| User management                     | Search, enable/disable and role changes; user updates revoke sessions; cannot disable/demote own admin account                                     |
| Refund-policy management            | Exact-provider rule updates across existing bookings, deadlines and audit records                                                                  |
| Audit history                       | Persisted application events, latest 500 visible; no API for editing audit records                                                                 |
| Admin analytics                     | Counts derived from users, trips, bookings, disruptions, recovery audit events and support tickets, plus a cross-trip portfolio insight with exportable value/refund-exposure breakdown |
| Integration status                  | Honest service-status panel identifying local, rule-based and disconnected services                                                                |
| Storage                             | JSON only; serialized writes and temporary-file replacement, schema migration with backup                                                          |
| Accessibility                       | Semantic forms, keyboard focus outlines, dialog focus handling, graph keyboard activation and live feedback; no formal accessibility certification |
| Responsive mobile access            | Responsive web interface; no native mobile binaries                                                                                                |

## Services not connected

The following need provider access, credentials, infrastructure, or separate production development; the UI does not pretend that they are active:

- Google/social OAuth and optional 2FA.
- Mailbox forwarding/synchronization and live Google Calendar synchronization.
- Live flight, rail, weather, hotel and road-routing feeds.
- Supplier booking/cancellation execution, payments, issued refunds and insurance claims.
- Delivered email, SMS and push notifications. The local email outbox is the test replacement.
- LLM/voice chat, translation/localization, AR, shared group itineraries and native apps.
- Production compliance guarantees, tamper-proof external audit storage, encrypted provider-key vault, high-availability clusters and multi-process JSON locking.

## Deliberate prototype limits

1. One local server process, up to 30 bookings and 300 offers per trip. JSON persistence does not imply horizontally scalable storage.
2. All UI times are IST and prices INR. Timestamps retain explicit offsets. Named-timezone calendar imports are rejected rather than guessed; scanned PDFs require manual entry (no OCR).
3. Parsing is structured-field extraction with user review, not universal airline-email understanding. A calendar import presents its event drafts; each booking is reviewed individually.
4. Hotel nodes represent check-in appointments rather than full room-night inventory. Multi-day accommodation and overnight stays must be entered as explicit bookings/offers.
5. Weather closure is applied to the chosen booking, not inferred across an entire region.
6. Search keeps at most 400 partial paths. It can report no solution when one lies outside its retained search space; it is not a proof of global infeasibility. Ranking is heuristic, not trained AI.
7. Account cabin/seat fields are profile notes; only trip-level preferences currently constrain/rank plans.
8. Each trip has an editable simulation clock. Completed unchanged bookings are preserved, and new alternatives cannot depart before the clock. Real time is not advanced automatically.
9. Email verification is tracked but not required for using this local demo. Administrators can view the local outbox for verification/reset testing. This is not a production email-delivery design.
10. Audit records are protected by the application API, not against a person editing files on the host machine.
