# Waypoint — Intelligent Travel Resilience

A multi-user local web application for **Hackathon Problem ID 2: Travel Disruption Recovery Engine**. Includes the public website, account flows, traveler workspace, recovery engine, support system and admin console. **All persistence uses local JSON; no database or API key is required.**

## Start

Requires **Node.js 24+** (the PDF parser also requires a recent Node runtime).

```powershell
npm.cmd install
npm.cmd run build
npm.cmd start
```

Open **http://127.0.0.1:3001** for the landing page.

Pages use clean URLs: `/login`, `/signup`, `/dashboard`, `/trips`, `/account` and `/admin`. The traveler workspace and the trip console both use the same full-screen, left-rail console layout as the admin console. `/dashboard` is the analytics home (portfolio KPIs, value-by-type donut, readiness and refund bars, upcoming departures, proactive alerts and recovery outcomes); `/trips` is the trip list for creating, searching, filtering and opening journeys. Trip functions have direct, addressable links such as `/trip/<id>/overview`, `/trip/<id>/itinerary`, `/trip/<id>/recovery`, `/trip/<id>/insights`, `/trip/<id>/activity`, `/trip/<id>/policies` and `/trip/<id>/settings`, so each function can be linked, bookmarked and extended independently. Admin sections have direct links such as `/admin/users`, `/admin/bookings`, `/admin/recovery`, `/admin/reports` and `/admin/settings`. Refreshing a deep link works through the server's SPA fallback. Old `/#/…` links migrate automatically. Browser back/forward navigation is supported.

For development:

```powershell
npm.cmd run dev
```

Open **http://127.0.0.1:5173**. Stop the other server before starting development mode. On Windows use `npm.cmd` if PowerShell blocks `npm.ps1`; macOS/Linux can use `npm`.

## Demo accounts

| Role     | Email                     | Password         |
| -------- | ------------------------- | ---------------- |
| Traveler | `traveler@waypoint.local` | `TravelDemo123!` |
| Admin    | `admin@waypoint.local`    | `AdminDemo123!`  |

The login screen has buttons to fill these credentials. New signups get private, empty traveler workspaces; they cannot assign themselves admin access. Demo accounts are for this localhost application only, not public deployment.

## Traveler walkthrough

1. Open the landing page, then log in as the traveler or sign up.
2. Land on **Dashboard** for your overall travel picture — booked value by type (donut), trip readiness and refund-exposure bars, upcoming departures, proactive alerts and recovery outcomes. Open **My trips** to create, search, filter and sort journeys; each tile shows its resilience state (active disruptions, connection warnings, booked value, next departure) and tiles are sorted attention-first. Any trip can be duplicated as a template from **Trip settings** or deleted outright from its tile on **My trips** (a confirmation prompt guards the delete), and a single booking can be duplicated from its details dialog.
3. Add/edit bookings with route codes, timezone-aware times, party-total costs, refund policies and connection dependencies. Matching location codes identify valid connections.
4. Use **Import confirmation** for structured text/email, a text PDF, or a UTC `.ics` file. Review the draft before saving. Example files are in `examples/`. Use **Import trip JSON** for a full itinerary export.
5. Open the dependency map; select a node to highlight its downstream bookings, or press Enter to open its details. **Trip insights** summarises booked value, still-refundable amounts, refund exposure, the next booking and connection warnings. **Activity** exports the itinerary as CSV or JSON.
6. In **Inventory**, add explicit replacement offers or generate sample later slots for your own bookings.
7. Select **Simulate disruption → Delhi → Jaipur → Delay → 120 minutes**. The Recovery center shows a **Connection risk** panel (a rule-based 0–100 score per booking with its factors), the ranked plan cards, and a **sortable plan comparison table** (net cost, refunds, schedule shift, bookings changed, % preserved). Review the booking changes and costs before applying.
8. Apply a plan. The itinerary, history and notifications persist in JSON. From **Activity**, undo the latest recovery or restore the itinerary to the snapshot before any earlier recovery point (later recoveries revert together).
9. Try cancellation, weather, missed connections, transfer failure, traveler changes or simultaneous events on different bookings. Adjust budget/accessibility/ranking in **Preferences**. Open **Refund policies** to see, per booking, whether a refund is full/partial/none/expired against the trip clock and why.
10. Use **Trip settings** for dates, archive/restore, simulation clock, JSON/calendar export and printing. The assistant answers questions from your trip data; **Support** opens a ticket for an administrator.

## Admin walkthrough

Log in with the admin account, then open **Admin**:

- **Overview:** computed usage/recovery/support metrics and the proactive-monitor toggle.
- **Users:** search accounts, disable/reactivate or change roles. Disabling an account revokes sessions.
- **Trips:** enter support mode for any traveler's itinerary; edits remain associated with that owner and are audited.
- **Bookings:** search the cross-trip booking directory and filter by transport/stay/activity type.
- **Recovery queue:** inspect active disruptions and proactive connection warnings, with links to the affected trip.
- **Reports:** review retained/reverted recoveries, estimated costs and booking changes, plus a portfolio view of booked value and refund exposure across active trips; export recovery, trip-summary or portfolio CSVs.
- **Support:** reply to tickets and mark them resolved; the traveler receives an inbox notification.
- **Policies:** apply an exact-provider refund fraction and cancellation deadline to current bookings.
- **Audit log:** view persisted user/admin actions.
- **Email outbox:** view local email previews, including signup-verification and password-reset links. Messages are never actually sent.
- **Integrations:** see which services are implemented locally and which are disconnected.
- **Settings:** enable/disable proactive monitoring, toggle console auto-refresh and inspect runtime/session information.

The admin console uses a full-viewport layout, a persistent left navigation rail, a mobile navigation drawer, and a navy/teal theme. Logging in as an administrator opens this console by default.

For verification/reset testing, open the account link in the local outbox. Tokens expire after one hour and work once. Password reset revokes sessions; password change requires the current password. The local outbox is a development mail substitute, not proof of real email ownership.

## Architecture

```text
src/Public.jsx             Landing page and authentication screens
src/main.jsx               Session bootstrap and clean URL routing
src/navigation.js          History API navigation and legacy-link migration
src/AdminOperations.jsx    Admin overview, bookings, queue, reports and settings
src/theme.css              Shared colors and full-screen console design
src/Workspace.jsx          Traveler console shell, trips dashboard, profile, support and admin UI
src/Dashboard.jsx          Sectioned trip console (overview, itinerary, recovery and dialogs)
src/DependencyGraph.jsx    Interactive booking graph
src/Ingest.jsx             Confirmation import and review
src/api.js                 Authenticated API helper
server/index.js            REST API, role/ownership checks and monitoring
server/auth.js             Scrypt passwords and opaque hashed sessions
server/store.js            JSON transactions, migration, audit and notifications
server/engine.js           Graph analysis and bounded recovery search
server/schema.js           Booking/trip validation
server/ingest.js           PDF/text/calendar extraction
server/seed.js             Illustrative trip and inventory
data/store.json            Generated local persistence; never served publicly
tests/                    API, engine, parser and React component tests
```

React + Vite + Lucide frontend; Express + Zod backend; Node cryptography; PDF.js for local PDF text extraction. No LLM or database dependency. Google Fonts are cosmetic only; system font fallbacks work offline.

The JSON store contains users, trips, sessions, single-use tokens, notifications, tickets, policies, local outbox and audit events. Mutations are serialized and committed through a temporary file and rename. Only one server process may own a data directory. Existing v1 data is backed up to `data/store-v1-backup.json` and migrated into the demo traveler's workspace. A malformed existing store causes startup failure rather than silent data replacement. `DATA_DIR` and `PORT` can override defaults.

Authentication uses salted scrypt hashes, server-side session records with hashed opaque tokens, HttpOnly/SameSite cookies, role and ownership checks, login throttling, and a required non-simple request header plus origin validation. Production mode adds Secure cookies and therefore requires HTTPS. The app binds to localhost. These controls do not turn demo accounts and a local outbox into a production identity system.

## Recovery model

Bookings form a directed acyclic graph. Connections specify minimum buffers. The engine traces direct/downstream effects and searches replacement combinations satisfying location continuity, timing, availability, party size, accessibility and total net budget. It returns up to three distinct alternatives ranked by cost, schedule shift and booking changes.

Search retains at most 400 partial paths per booking: fast for hackathon itineraries, without a global-optimum guarantee. Prices are INR party totals. Refunds are explicit illustrative policies; supplier cancellation gives a full refund in the demo, other changes use the refund fraction before its deadline, and retained delayed bookings receive no refund or replacement charge. Applying a plan recomputes it against the current version before committing all local changes.

The trip clock is editable in **Trip settings**, removing the original Jaipur-only date assumption. New offers cannot depart before the clock. A hotel node models a check-in appointment rather than its full overnight duration. Calendar/PDF import always requires review. See the [full feature status and limits](docs/FEATURES.md).

## Tests

```powershell
npm.cmd test
npm.cmd run test:ui
npm.cmd run build
```

API integration tests create an isolated temporary data directory on port 3109. They cover account creation, role escalation rejection, cross-user access denial, booking validation, recovery persistence/undo, stale plans, support/admin actions, policies, disabled accounts, token verification/reset and logout. Engine/parser tests cover recovery constraints, refund arithmetic, time/location validation, PDF extraction and calendar parsing. Tests also confirm that a traveler can permanently delete a trip and that other accounts cannot. React tests cover landing/auth forms, trip creation, booking dependencies, inventory actions, assistant/admin views and the full simulate/review/apply interaction.

React interaction tests run in jsdom; they are not visual browser tests. No browser was available for screenshot-based verification in this session.

## Honest integration boundary

This is a working **local application**, not a connected airline booking service. Live airline/rail/weather feeds, actual reservations, payments/refunds, delivered email/SMS/push, OAuth, mailbox synchronization and LLM chat are **not connected**. The supplied brief's later-stage ideas—native apps, shared group travel, translation, insurance, voice/AR, cloud scale and compliance infrastructure—also remain separate production work. The app and [feature matrix](docs/FEATURES.md) identify these limits explicitly.

## Documentation

- [docs/DESIGN-REPORT.md](docs/DESIGN-REPORT.md) — the full product design and research report for Problem Statement ID 2: competitor landscape, research findings, proposed feature set, data model and APIs (JSON schemas, ER and sequence diagrams), system architecture, differentiators, UX/sitemap, roadmap and a competitor comparison. It describes the full vision; the running app implements a local subset of it.
- [docs/FEATURES.md](docs/FEATURES.md) — feature status matrix for the shipped prototype, including what is **not** connected.
- [docs/RESEARCH.md](docs/RESEARCH.md) — verified primary-source findings and the resulting design decisions.
- [docs/NETWORK.md](docs/NETWORK.md) — sharing the app over a Cloudflare tunnel or direct IP.
