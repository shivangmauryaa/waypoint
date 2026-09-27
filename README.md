# Waypoint — Travel Disruption Recovery Engine

> **Hackathon Project:** Waypoint
> **Problem:** Travel Disruption Recovery Engine
> **Type:** Full-Stack Web Application
> **Purpose:** Detect how a travel disruption affects an itinerary and generate feasible recovery plans.

---

## 1. What is Waypoint?

Imagine a traveler has this plan:

```text
Mumbai
  ↓ ✈ Flight
Delhi
  ↓ 🚕 Transfer
Hotel
  ↓ 🚗
Activity
  ↓ 🚆 Train
Jaipur
```

Now suppose the Mumbai → Delhi flight is delayed by 3 hours.

The traveler normally has to manually figure out:

* Will the airport transfer still work?
* Will the hotel check-in be affected?
* Will an activity be missed?
* Is another train/flight available?
* How much money can be refunded?
* Which bookings need to be changed?
* What is the cheapest recovery plan?
* Which plan changes the least amount of the trip?

**Waypoint is designed to do this automatically.**

It represents bookings as a **dependency graph**, detects downstream impact, searches available replacement options, calculates cost/refunds, and presents recovery plans that the traveler can review before applying.

---

# 2. What We Actually Built

Waypoint is a **working hackathon prototype**.

It is NOT currently a production airline/travel booking platform.

### What works locally

* Landing page
* Login / Signup / Logout
* Traveler accounts
* Admin account
* Trip creation
* Multiple trips
* Booking management
* Booking dependencies
* Dependency graph
* Disruption simulation
* Recovery engine
* Recovery plan comparison
* Refund calculations
* Inventory / replacement offers
* Apply recovery
* Undo recovery
* Recovery history
* Notifications
* Support tickets
* Admin console
* Import / Export
* PDF / Text / Calendar parsing
* CSV export
* Weather-related trip view
* Trip assistant
* Optional server-side AI adapter
* Automated tests

### What is simulated/local

The following are **NOT real external integrations**:

* Live airline inventory
* Live railway inventory
* Real hotel booking
* Real payment processing
* Real refunds
* Real supplier cancellation
* Real SMS
* Real email delivery
* Real Google Calendar synchronization
* Real mailbox synchronization
* OAuth/social login
* Production cloud database

The application uses **local JSON data and simulated provider/inventory data** for the hackathon demonstration.

---

# 3. Tech Stack

## Frontend

```text
React 19
Vite
React DOM
Lucide React
React Three Fiber
Three.js
CSS
```

Frontend:

```text
src/
```

## Backend

```text
Node.js
Express 5
Zod
Node Crypto
PDF.js
```

Backend:

```text
server/
```

## Storage

```text
JSON
data/store.json
```

There is currently **no MySQL / PostgreSQL / MongoDB database**.

## Testing

```text
Node Test Runner
Vitest
Testing Library
jsdom
```

---

# 4. Project Structure

The most important thing to understand is the project structure.

```text
waypoint-main/
│
├── src/                         ← FRONTEND / UI
│   ├── main.jsx                 ← Application entry point + routing
│   ├── api.js                   ← Frontend → backend API helper
│   ├── Public.jsx               ← Landing/authentication UI
│   ├── CelestialPublic.jsx       ← Main landing experience
│   │
│   ├── Workspace.jsx             ← Traveler application shell
│   ├── Dashboard.jsx             ← Individual trip console
│   ├── Overview.jsx              ← Dashboard overview
│   ├── Builder.jsx               ← Trip builder
│   ├── BuilderPanels.jsx         ← Builder UI panels
│   ├── RecoveryCenter.jsx        ← Recovery UI
│   ├── RecoveryFlow.jsx          ← Recovery flow
│   ├── DependencyGraph.jsx       ← Booking dependency graph
│   ├── TripDetails.jsx           ← Booking/trip details
│   ├── TripWeather.jsx           ← Weather section
│   ├── Ingest.jsx                ← Import booking data
│   └── *.css                     ← Styling
│
├── server/                      ← BACKEND
│   ├── index.js                 ← Express server + API routes
│   ├── engine.js                ← MAIN recovery engine
│   ├── builder.js               ← Trip builder logic
│   ├── providers.js             ← Simulated travel providers
│   ├── store.js                 ← JSON persistence
│   ├── schema.js                ← Data validation
│   ├── auth.js                  ← Password/session security
│   ├── ingest.js                ← PDF/text/calendar parsing
│   ├── ai.js                    ← Optional AI adapter
│   ├── weather.js               ← Weather service
│   ├── places.js                ← Place data
│   ├── seed.js                  ← Demo/sample data
│   └── tripbuilder/             ← Additional builder logic
│
├── data/
│   └── store.json               ← LOCAL DATABASE
│
├── examples/
│   ├── booking-confirmation.txt
│   └── activities.ics
│
├── tests/                       ← AUTOMATED TESTS
│
├── docs/
│   ├── FEATURES.md
│   ├── DESIGN-REPORT.md
│   ├── RESEARCH.md
│   └── NETWORK.md
│
├── scripts/
│
├── package.json
├── vite.config.js
└── README.md
```

---

# 5. How the Application Works

The easiest way to understand Waypoint is through layers.

```text
                    USER
                     │
                     ▼
            ┌──────────────────┐
            │ React Frontend   │
            │ src/             │
            └────────┬─────────┘
                     │
                  HTTP/JSON
                     │
                     ▼
            ┌──────────────────┐
            │ Express Backend  │
            │ server/index.js  │
            └────────┬─────────┘
                     │
          ┌──────────┼──────────┐
          ▼          ▼          ▼
       Trip Data   Recovery   Builder
       /Store      Engine     Engine
          │          │          │
          └──────────┼──────────┘
                     ▼
            ┌──────────────────┐
            │ data/store.json  │
            └──────────────────┘
```

### Important rule

The frontend should NOT directly modify:

```text
data/store.json
```

The frontend talks to the backend.

The backend validates and modifies data.

---

# 6. Most Important Backend File

## `server/index.js`

If someone asks:

> Where is the backend?

The answer is:

```text
server/index.js
```

This file:

* Starts Express
* Defines API routes
* Handles authentication
* Checks ownership
* Calls the recovery engine
* Reads/writes trip data
* Handles admin operations
* Handles support
* Handles notifications
* Handles trip builder APIs

Examples:

```text
POST /api/auth/login
POST /api/trips
GET  /api/trips
GET  /api/trips/:tripId/state
POST /api/trips/:tripId/disruptions
POST /api/trips/:tripId/apply
POST /api/trips/:tripId/undo
POST /api/trips/:tripId/assistant
```

---

# 7. Most Important Logic File

## `server/engine.js`

This is the **core recovery engine**.

Think of it as the brain of Waypoint.

It understands relationships between bookings.

Example:

```text
Flight
  │
  │ 45 min buffer
  ▼
Airport Transfer
  │
  │ 30 min buffer
  ▼
Hotel
  │
  ▼
Activity
```

If the flight is delayed:

```text
Flight ❌ DELAYED
   │
   ▼
Transfer ⚠️
   │
   ▼
Hotel ⚠️
   │
   ▼
Activity ⚠️
```

The engine traces those downstream dependencies.

---

# 8. What is a Dependency?

A dependency means:

> Booking B needs Booking A to happen correctly first.

Example:

```text
Flight arrives at Delhi
        ↓
Airport Transfer
        ↓
Hotel Check-in
```

The transfer depends on the flight.

The hotel depends on being able to reach the hotel.

Bookings contain dependency information such as:

```text
dependencies:
[
  {
    id: "previous-booking-id",
    buffer: 45
  }
]
```

The `buffer` means the minimum safe time between the previous booking and the next booking.

---

# 9. Why Does Waypoint Use a Graph?

A travel itinerary is not just a list.

It is a connected system.

Example:

```text
                Flight
               /      \
              ▼        ▼
          Transfer    Dinner
              │
              ▼
            Hotel
              │
              ▼
           Activity
```

One disruption can affect multiple bookings.

Therefore Waypoint represents the itinerary as a **directed dependency graph**.

---

# 10. Complete Recovery Flow

This is the most important flow in the project.

## Step 1 — Traveler has an itinerary

Example:

```text
Mumbai → Delhi
Flight
10:00 → 12:00
```

Then:

```text
Delhi Airport → Hotel
Transfer
12:45 → 13:30
```

Then:

```text
Hotel → Activity
15:00 → 17:00
```

---

## Step 2 — Disruption occurs

Example:

```text
Flight delayed by 120 minutes
```

The system records the disruption.

```text
DISRUPTION
type = delay
minutes = 120
```

---

## Step 3 — Engine checks dependencies

The engine checks:

```text
Original arrival
+
Delay
+
Required buffer
<
Next booking
```

If the required buffer is broken:

```text
CONNECTION RISK
```

---

## Step 4 — Engine finds alternatives

The system searches local/simulated inventory.

Example:

```text
OPTION A

Keep flight
Move transfer

Cost: ₹500
```

```text
OPTION B

Change transfer
Change activity

Cost: ₹1,200
```

```text
OPTION C

Replace transportation

Cost: ₹2,000
```

---

## Step 5 — Refund calculation

The system considers:

```text
Original price
Refund eligibility
Refund deadline
Replacement price
```

Conceptually:

```text
NET COST
=
Replacement Cost
-
Estimated Refund
```

---

## Step 6 — User reviews plans

The UI can compare:

```text
Plan
Net Cost
Refund
Schedule Shift
Bookings Changed
Itinerary Preserved
```

---

## Step 7 — User applies a plan

The user explicitly confirms.

The backend:

1. Revalidates the plan
2. Checks that the trip has not changed
3. Applies the changes
4. Saves history
5. Creates notification
6. Allows undo

---

# 11. Recovery Is NOT Automatically Applied

This is intentional.

Waypoint does not silently modify the traveler's itinerary.

The flow is:

```text
Disruption
     ↓
Analyze
     ↓
Generate Plans
     ↓
Show Traveler
     ↓
Traveler Reviews
     ↓
Traveler Applies
```

This is an important product principle.

---

# 12. Is Waypoint Actually AI?

This is important for the hackathon presentation.

## Core Recovery Engine

The main recovery engine is:

```text
Rule-based
+
Deterministic
+
Constraint-based
```

It is NOT an LLM.

It uses:

* Graph traversal
* Time constraints
* Location constraints
* Availability
* Party size
* Accessibility
* Budget
* Refund rules
* Search heuristics

This makes the critical recovery process predictable and explainable.

---

# 13. Optional AI Layer

There is an AI adapter:

```text
server/ai.js
```

It supports the Nugen OpenAI-compatible API.

Environment variables:

```env
NUGEN_API_KEY=...
NUGEN_MODEL=gpt-oss-120b
NUGEN_BASE_URL=https://api.nugen.in
NUGEN_TIMEOUT_MS=20000
```

The browser does NOT receive the API key.

If the AI service is unavailable, the core deterministic functionality can still work.

### Correct way to explain this to judges

Say:

> Waypoint uses an explainable rule-based recovery engine for deterministic itinerary recovery, with an optional server-side AI assistant layer for natural-language interaction.

Do NOT say:

> The entire recovery engine is powered by AI.

---

# 14. Trip Builder

Waypoint also contains a trip-building workflow.

There are two conceptual modes:

```text
MANUAL

User
 ↓
Select Options
 ↓
Engine
```

and:

```text
AUTOMATED

User describes trip
 ↓
Interpret requirements
 ↓
Trip Builder
 ↓
Engine
```

The shared build logic is mainly handled by:

```text
server/builder.js
```

It can work with:

* Flights
* Rail
* Hotels
* Transfers
* Restaurants
* Activities

---

# 15. Simulated Provider Layer

The provider layer is mainly:

```text
server/providers.js
```

It provides deterministic/sample inventory.

It contains simulated:

```text
Flights
Hotels
Transfers
Restaurants
Activities
```

This allows the hackathon demo to work without depending on external booking APIs.

---

# 16. Data Storage

Waypoint uses:

```text
data/store.json
```

Think of this file as the local database.

It stores things like:

```text
users
trips
sessions
tokens
notifications
tickets
audit logs
policies
builds
offers
```

The storage layer is:

```text
server/store.js
```

### Important

Do NOT randomly edit:

```text
data/store.json
```

while the server is running.

---

# 17. Demo Accounts

### Traveler

```text
Email:
traveler@waypoint.local

Password:
TravelDemo123!
```

### Admin

```text
Email:
admin@waypoint.local

Password:
AdminDemo123!
```

Normal users sign up as travelers.

---

# 18. Authentication

Authentication is mainly handled by:

```text
server/auth.js
server/index.js
server/store.js
```

Passwords are not stored as plain text.

The system uses:

```text
scrypt
salt
password hash
server-side sessions
HttpOnly cookies
```

---

# 19. Frontend Routing

Main frontend entry:

```text
src/main.jsx
```

It handles application routing.

Example routes:

```text
/
 /login
 /signup
 /dashboard
 /trips
 /account
 /support
 /build
 /trip/:id/overview
 /trip/:id/itinerary
 /trip/:id/recovery
 /trip/:id/insights
 /trip/:id/activity
 /trip/:id/policies
 /trip/:id/settings
 /admin
```

Navigation helpers:

```text
src/navigation.js
```

---

# 20. Frontend → Backend Communication

Frontend API helper:

```text
src/api.js
```

Conceptually:

```text
React Component
      ↓
src/api.js
      ↓
/api/...
      ↓
server/index.js
      ↓
Engine / Store / Builder
```

If a button does not work:

1. Find the React function.
2. Check which API endpoint it calls.
3. Check whether the endpoint exists.
4. Check backend terminal logs.
5. Check browser Network tab.
6. Check the returned JSON/error.

---

# 21. Important Frontend Files

### Landing page

```text
src/Public.jsx
src/CelestialPublic.jsx
```

### Application shell

```text
src/Workspace.jsx
```

### Dashboard

```text
src/Dashboard.jsx
```

### Trip overview

```text
src/Overview.jsx
```

### Recovery

```text
src/RecoveryCenter.jsx
src/RecoveryFlow.jsx
```

### Trip Builder

```text
src/Builder.jsx
src/BuilderPanels.jsx
```

### Dependency Graph

```text
src/DependencyGraph.jsx
```

### Import

```text
src/Ingest.jsx
```

### API helper

```text
src/api.js
```

---

# 22. Important Backend Files

| File                  | Purpose                          |
| --------------------- | -------------------------------- |
| `server/index.js`     | Main Express server + API routes |
| `server/engine.js`    | Recovery graph + recovery search |
| `server/builder.js`   | Trip builder                     |
| `server/providers.js` | Simulated inventory              |
| `server/store.js`     | JSON persistence                 |
| `server/schema.js`    | Input validation                 |
| `server/auth.js`      | Authentication                   |
| `server/ingest.js`    | PDF/text/calendar parsing        |
| `server/ai.js`        | Optional AI                      |
| `server/weather.js`   | Weather                          |
| `server/places.js`    | Place/city data                  |
| `server/seed.js`      | Demo data                        |

---

# 23. Running the Project

## Requirements

Install:

```text
Node.js 24+
npm
```

Check:

```powershell
node --version
npm --version
```

---

# 24. First-Time Setup

Open PowerShell inside the project folder.

```powershell
npm.cmd install
```

Then:

```powershell
npm.cmd run build
```

Then:

```powershell
npm.cmd start
```

Open:

```text
http://127.0.0.1:3001
```

---

# 25. Development Mode

For development:

```powershell
npm.cmd run dev
```

Frontend:

```text
http://127.0.0.1:5173
```

Development mode runs:

```text
Node Backend
+
Vite Frontend
```

### Windows PowerShell note

If this does not work:

```powershell
npm run dev
```

use:

```powershell
npm.cmd run dev
```

---

# 26. Team Development Workflow

During a hackathon, don't let everyone randomly edit everything.

Recommended:

```text
                 WAYPOINT
                    │
        ┌───────────┼───────────┐
        │           │           │
    FRONTEND     BACKEND      DOCS/QA
        │           │           │
      src/       server/       docs/
```

### Frontend developer

Mostly:

```text
src/
```

### Backend developer

Mostly:

```text
server/
```

### Recovery developer

Focus on:

```text
server/engine.js
server/builder.js
server/providers.js
```

### QA/testing

Focus on:

```text
tests/
```

### Documentation

Focus on:

```text
README.md
docs/
examples/
```

---

# 27. Files You Should Be Careful With

These are central:

```text
server/store.js
server/schema.js
server/engine.js
server/index.js
```

A small change can break multiple features.

After changing them:

```powershell
npm.cmd test
npm.cmd run build
```

---

# 28. Git Workflow

Recommended branches:

```text
main
│
├── feature/frontend
├── feature/recovery
├── feature/backend
└── feature/admin
```

Before starting:

```powershell
git pull
```

Check:

```powershell
git status
```

Add:

```powershell
git add .
```

Commit:

```powershell
git commit -m "Describe what changed"
```

Push:

```powershell
git push
```

Avoid pushing unfinished experimental work directly to `main`.

---

# 29. Adding a New Frontend Feature

Example:

```text
New Button:
"Find Hotels"
```

Typical process:

```text
1. Find React component
2. Add UI
3. Add event handler
4. Call API through src/api.js
5. Add/find backend endpoint
6. Process request
7. Return JSON
8. Update React state
9. Test
```

Do not put major business logic directly inside React.

---

# 30. Adding a New API

Backend routes live in:

```text
server/index.js
```

Typical flow:

```text
Frontend
   ↓
POST /api/something
   ↓
server/index.js
   ↓
Validate
   ↓
Process
   ↓
Store
   ↓
Return JSON
```

If new data needs validation, update:

```text
server/schema.js
```

---

# 31. Adding a Recovery Rule

If a new rule affects recovery logic, normally implement it in:

```text
server/engine.js
```

Example:

```text
A connection requires at least 45 minutes.
```

The engine checks:

```text
Arrival Time
+
Minimum Buffer
<
Next Departure
```

If false:

```text
Connection Invalid
```

Then the recovery system searches for alternatives.

---

# 32. Recovery Plan Generation

The engine evaluates alternatives against constraints.

Important constraints:

```text
Timing
Location
Availability
Party Size
Accessibility
Budget
Refunds
```

The system uses bounded search for performance.

It can retain up to:

```text
400 partial paths per booking
```

This is appropriate for a hackathon prototype.

It does NOT guarantee a mathematically global optimum.

---

# 33. Plan Preservation

The recovery engine can compare how much of the original itinerary remains unchanged.

Example:

```text
Original:

Flight
Transfer
Hotel
Activity
Dinner
```

If recovery changes:

```text
Flight
Transfer
```

then:

```text
3 / 5 major bookings preserved
```

The UI can communicate the percentage preserved.

---

# 34. Refund Logic

Refund behavior is simulated.

A booking can contain:

```text
price
refund fraction
refund deadline
```

The system checks the simulation clock against the refund deadline.

Possible results:

```text
Full Refund
Partial Refund
No Refund
Refund Expired
```

This is a prototype policy model.

It is NOT a real supplier refund guarantee.

---

# 35. Disruption Types

The application can model scenarios such as:

```text
Delay
Cancellation
Weather
Missed Connection
Transfer Failure
Traveler Change
```

Exact impact depends on the dependency graph.

---

# 36. Proactive Risk Detection

Waypoint can identify problems before a traveler manually reports them.

Examples:

```text
Very short connection
Location mismatch
Impossible timing
```

The system uses a rule-based risk score.

The score:

```text
0–100
```

is NOT an ML prediction.

It is derived from factors such as:

* Buffer slack
* Route breaks
* Active disruptions
* Departure windows

---

# 37. Trip Assistant

The assistant can answer questions using trip context.

Examples:

```text
"What is my next booking?"

"How much of my trip is refundable?"

"Which connection is risky?"

"What is my current trip value?"

"What happens if this booking is cancelled?"
```

The deterministic assistant uses application data.

Optional AI functionality is handled by:

```text
server/ai.js
```

---

# 38. Importing Data

Waypoint supports structured ingestion.

Possible sources:

```text
Text confirmation
PDF
ICS calendar
JSON trip
```

Examples:

```text
examples/
```

Imported data should be reviewed before treating it as the final itinerary.

---

# 39. Exporting Data

A trip can be exported as:

```text
JSON
CSV
ICS calendar
```

---

# 40. Admin Panel

Admin functionality is available at:

```text
/admin
```

Admin can inspect/manage:

```text
Users
Trips
Bookings
Recovery Queue
Reports
Support Tickets
Policies
Audit Logs
Settings
Integrations
```

Admin actions are audited.

---

# 41. Support System

Traveler:

```text
Support
   ↓
Create Ticket
   ↓
Admin
   ↓
Admin Reply
   ↓
Traveler Notification
```

This is a local support workflow.

---

# 42. Notifications and Email

The application has a local notification system.

It also has a local email outbox for demonstration.

This does NOT mean real emails are delivered.

For example:

```text
Password Reset
Signup Verification
Recovery Notification
```

can be represented in the local outbox.

---

# 43. Environment Variables

Optional functionality can use:

```env
PORT=3001
HOST=127.0.0.1
DATA_DIR=data
NUGEN_API_KEY=...
NUGEN_MODEL=...
NUGEN_BASE_URL=...
NUGEN_TIMEOUT_MS=20000
```

### NEVER commit real API keys.

Keep secrets in:

```text
.env
```

or another ignored environment configuration.

Never put API keys in frontend React code.

---

# 44. Optional Nugen AI Setup

If AI assistant functionality is required:

```env
NUGEN_API_KEY=YOUR_KEY
```

Optional:

```env
NUGEN_MODEL=gpt-oss-120b
NUGEN_BASE_URL=https://api.nugen.in
NUGEN_TIMEOUT_MS=20000
```

Restart the backend after changing environment variables.

The key is handled by:

```text
server/ai.js
```

The frontend should never receive the key.

---

# 45. Testing

Backend/engine tests:

```powershell
npm.cmd test
```

UI tests:

```powershell
npm.cmd run test:ui
```

Production build:

```powershell
npm.cmd run build
```

Before an important demo:

```powershell
npm.cmd test
npm.cmd run test:ui
npm.cmd run build
```

---

# 46. Troubleshooting

## App does not start

Check:

```powershell
node --version
```

Make sure Node is 24+.

Then:

```powershell
npm.cmd install
npm.cmd run build
npm.cmd start
```

---

## Port 3001 is busy

Check:

```powershell
netstat -ano | findstr :3001
```

Find the process and stop it if appropriate.

Then restart.

---

## Frontend loads but API fails

Open:

```text
F12
→ Network
```

Look for:

```text
/api/...
```

Then check the Node terminal.

Common causes:

```text
Backend not running
Wrong port
API error
Invalid session
Malformed request
Store problem
```

---

## Login doesn't work

Try:

```text
Traveler:

traveler@waypoint.local
TravelDemo123!
```

or:

```text
Admin:

admin@waypoint.local
AdminDemo123!
```

---

# 47. Data Reset

If local data becomes problematic:

1. Stop the server.
2. Back up `data/store.json`.
3. Reset/delete only if necessary.
4. Start the server again.
5. Verify demo accounts.
6. Verify sample trip.

Do not delete the store blindly during a judging session.

---

# 48. Recommended Hackathon Demo

Use this sequence.

## 1. Explain the problem

Say:

> Modern travel is a chain of connected bookings. One disruption can create a ripple effect across the entire itinerary.

## 2. Show itinerary

```text
Flight
   ↓
Transfer
   ↓
Hotel
   ↓
Activity
```

## 3. Trigger disruption

Example:

```text
Flight Delay
```

## 4. Show impact graph

```text
Delayed Flight
      ↓
Connection Risk
      ↓
Downstream Bookings
```

## 5. Show recovery plans

Compare:

```text
Cost
Refund
Schedule Shift
Bookings Changed
Itinerary Preserved
```

## 6. Apply a plan

Show the itinerary changing.

## 7. Undo

Undo the recovery.

This demonstrates:

```text
Recovery
+
History
+
Reversibility
```

---

# 49. What to Say to Judges

## "What is your USP?"

> Waypoint treats a trip as a dependency graph rather than a simple list of bookings. When one booking changes, it traces downstream impact and generates coordinated recovery plans across multiple components instead of asking the traveler to manually fix each booking.

---

## "Is this real-time?"

> The current hackathon prototype uses a local simulated provider and inventory layer. The architecture is designed around provider/search abstractions, so live airline, rail, hotel, routing and weather providers can be connected later.

---

## "Where is the AI?"

> The core recovery engine is deterministic and explainable. It uses graph traversal and constraint-based search. We also have an optional server-side AI adapter for natural-language assistance, but recovery does not depend on an LLM.

---

## "Why not just use an LLM?"

> An LLM can interpret natural language, but booking recovery requires strict constraints. A hallucinated flight time or price could create an invalid itinerary. Therefore Waypoint keeps the critical recovery calculation deterministic and uses AI as an optional conversational layer.

---

## "How does it know what is affected?"

> Each booking is represented as a node in a directed dependency graph. Dependencies define the minimum required buffer between bookings. When a disruption changes the timing or availability of one node, Waypoint traverses downstream dependencies and checks which connections become invalid.

---

## "How does it choose a recovery?"

> The recovery engine searches feasible alternatives against timing, location, availability, party size, accessibility and budget constraints. It then compares the resulting plans using cost, schedule shift and the amount of the original itinerary preserved.

---

## "Can it book the new flight?"

> The current prototype generates and applies a simulated recovery plan locally. Actual supplier booking, payment and cancellation APIs are future production integrations.

---

# 50. Architecture Diagram

```text
                    ┌─────────────────────┐
                    │       TRAVELER      │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   React / Vite UI   │
                    │       src/          │
                    └──────────┬──────────┘
                               │
                          REST / JSON
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Express Backend   │
                    │   server/index.js   │
                    └──────────┬──────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
   ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
   │ Auth        │      │ Recovery    │      │ Trip Builder│
   │ auth.js     │      │ engine.js   │      │ builder.js  │
   └─────────────┘      └──────┬──────┘      └──────┬──────┘
                               │                    │
                               └─────────┬──────────┘
                                         ▼
                               ┌──────────────────┐
                               │ Providers        │
                               │ Simulated Data   │
                               └────────┬─────────┘
                                        │
                                        ▼
                               ┌──────────────────┐
                               │ JSON Store       │
                               │ data/store.json  │
                               └──────────────────┘

                         OPTIONAL AI
                               │
                               ▼
                         ┌──────────────┐
                         │ Nugen AI     │
                         │ server/ai.js │
                         └──────────────┘
```

---

# 51. Complete Data Flow

```text
USER CREATES TRIP
       │
       ▼
Trip Saved
       │
       ▼
Bookings Added
       │
       ▼
Dependencies Created
       │
       ▼
Disruption Occurs
       │
       ▼
Recovery Engine
       │
       ▼
Affected Bookings
       │
       ▼
Candidate Replacements
       │
       ▼
Timing / Location / Budget / Refund Checks
       │
       ▼
Recovery Plans
       │
       ▼
Traveler Compares
       │
       ▼
Traveler Applies
       │
       ▼
JSON Store Updated
       │
       ▼
History + Notification
       │
       ▼
Undo / Restore
```

---

# 52. Full API Categories

## Authentication

```text
/api/auth/*
```

## Trips

```text
/api/trips/*
```

## Bookings

```text
/api/trips/:tripId/bookings/*
```

## Recovery

```text
/api/trips/:tripId/disruptions
/api/trips/:tripId/apply
/api/trips/:tripId/undo
/api/trips/:tripId/history/*
```

## Inventory

```text
/api/trips/:tripId/offers
/api/trips/:tripId/generate-inventory
```

## Import / Export

```text
/api/trips/:tripId/import
/api/trips/:tripId/parse
/api/trips/:tripId/export
/api/trips/:tripId/export.csv
/api/trips/:tripId/calendar
```

## Assistant

```text
/api/trips/:tripId/assistant
/api/ai/*
```

## Support

```text
/api/tickets/*
```

## Admin

```text
/api/admin/*
```

---

# 53. Security

The prototype includes:

* Password hashing with scrypt
* Server-side sessions
* Hashed session tokens
* HttpOnly cookies
* SameSite cookie policy
* Role checks
* Trip ownership checks
* Zod input validation
* Request/origin checks
* Login throttling
* Session revocation

However:

> This is still a hackathon/local application and should not be treated as production infrastructure.

---

# 54. What Would Be Needed for Production?

If Waypoint becomes a real product:

```text
Real Database
Cloud Infrastructure
Distributed Locking
Real Airline APIs
Real Railway APIs
Hotel APIs
Maps / Routing
Live Weather
Supplier Booking
Payment Gateway
Real Refunds
Email Provider
SMS Provider
Push Notifications
OAuth
2FA
Secrets Manager
TLS
Production Monitoring
Rate Limiting
Job Queue
Cloud Storage
Audit Infrastructure
Privacy / Compliance
Backup / Recovery
```

---

# 55. Current Prototype Limitations

```text
Local server process
JSON persistence
Maximum ~30 bookings per trip
Maximum ~300 offers per trip
Bounded recovery search
IST-oriented UI
INR pricing
Simulated provider inventory
No production booking execution
No real email delivery
No production database
```

Recovery search can retain up to:

```text
400 partial paths per booking
```

Therefore it is optimized for hackathon-scale itineraries.

It does NOT guarantee a mathematically global optimum.

---

# 56. Documentation Map

```text
README.md
    ↓
START HERE

docs/FEATURES.md
    ↓
Implemented features

docs/DESIGN-REPORT.md
    ↓
Architecture + product design

docs/RESEARCH.md
    ↓
Research

docs/NETWORK.md
    ↓
Network/local access
```

---

# 57. Quick Command Cheat Sheet

## Install

```powershell
npm.cmd install
```

## Development

```powershell
npm.cmd run dev
```

## Production-style local run

```powershell
npm.cmd run build
npm.cmd start
```

## Tests

```powershell
npm.cmd test
```

## UI Tests

```powershell
npm.cmd run test:ui
```

## Build

```powershell
npm.cmd run build
```

## Git Status

```powershell
git status
```

## Pull

```powershell
git pull
```

## Commit

```powershell
git add .
git commit -m "your message"
```

## Push

```powershell
git push
```

---

# 58. The 10 Files Everyone Should Know

If you are new to Waypoint, understand these first:

### 1. `src/main.jsx`

Frontend entry point and routing.

### 2. `src/api.js`

Frontend → backend communication.

### 3. `src/Workspace.jsx`

Main application shell.

### 4. `src/Dashboard.jsx`

Trip interface.

### 5. `src/RecoveryFlow.jsx`

Recovery experience.

### 6. `src/DependencyGraph.jsx`

Dependency visualization.

### 7. `server/index.js`

Backend API.

### 8. `server/engine.js`

Recovery brain.

### 9. `server/store.js`

Local database/storage.

### 10. `server/providers.js`

Simulated travel inventory.

If you understand these ten files, you understand most of the project.

---

# 59. One-Minute Mental Model

Remember this:

```text
TRIP
 │
 ├── BOOKINGS
 │      │
 │      └── DEPENDENCIES
 │
 ├── DISRUPTION
 │
 ▼
RECOVERY ENGINE
 │
 ├── Find affected bookings
 ├── Check timing
 ├── Check location
 ├── Check availability
 ├── Check budget
 ├── Check refunds
 │
 ▼
RECOVERY PLANS
 │
 ▼
TRAVELER REVIEWS
 │
 ▼
APPLY
 │
 ▼
STORE + HISTORY + NOTIFICATION
```

That is Waypoint.

---

# 60. Final Team Rule

Before changing anything, ask:

> **"Is this UI, API, business logic, storage, or provider data?"**

Then edit the correct layer.

```text
UI
→ src/

API
→ server/index.js

Validation
→ server/schema.js

Recovery / Business Logic
→ server/engine.js
→ server/builder.js

Simulated Inventory
→ server/providers.js

Persistence
→ server/store.js

Authentication
→ server/auth.js

Parsing / Import
→ server/ingest.js

Optional AI
→ server/ai.js
```

### DO NOT:

* Put backend secrets in frontend code
* Directly modify `store.json` while server is running
* Put recovery logic randomly inside React
* Call simulated inventory "live inventory"
* Claim the deterministic recovery engine is an LLM
* Push broken experimental code directly to `main`

---

# 61. TL;DR

Waypoint is a:

> **Travel Disruption Recovery Engine**

It models a traveler's itinerary as a dependency graph.

When a disruption happens:

```text
DISRUPTION
    ↓
IMPACT ANALYSIS
    ↓
RECOVERY SEARCH
    ↓
COST + REFUND + TIME ANALYSIS
    ↓
PLAN COMPARISON
    ↓
TRAVELER APPROVAL
    ↓
RECOVERY APPLIED
    ↓
HISTORY + NOTIFICATION
```

The current project is a:

```text
FULL-STACK
+
LOCAL
+
HACKATHON
+
PROTOTYPE
```

with:

```text
React
+
Vite
+
Node.js
+
Express
+
JSON Storage
+
Deterministic Recovery Engine
+
Optional AI
```

Start it with:

```powershell
npm.cmd install
npm.cmd run build
npm.cmd start
```

Then open:

```text
http://127.0.0.1:3001
```

### Demo Traveler

```text
Email:
traveler@waypoint.local

Password:
TravelDemo123!
```

### Demo Admin

```text
Email:
admin@waypoint.local

Password:
AdminDemo123!
```

---

## WAYPOINT

> **When travel breaks, Waypoint finds the way forward.**
