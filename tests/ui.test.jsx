import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { Landing, AuthPage } from "../src/Public";
import {
  TripList,
  BookingEditor,
  Account,
  Admin,
  Inventory,
  Assistant,
  TravelerShell,
} from "../src/Workspace";
import DependencyGraph from "../src/DependencyGraph";
import Ingest from "../src/Ingest";
import Dashboard, {
  RiskPanel,
  PlanComparison,
  PolicyExplainer,
} from "../src/Dashboard";
import { Overview } from "../src/Overview";
import { ManualTrip } from "../src/ManualTrip";
import { SearchPanel } from "../src/Builder";
import { newBuild as newTripBuild, view as tripBuildView } from "../server/builder.js";
import { impacted, recover, warnings, insights } from "../server/engine";
import { seed } from "../server/seed";
import { api, go } from "../src/api";
import {
  navigate,
  currentPath,
  installNavigation,
  migrateLegacyRoute,
} from "../src/navigation";
import { AdminOperations } from "../src/AdminOperations";
vi.mock("../src/api", async () => {
  const actual = await vi.importActual("../src/api");
  return { ...actual, api: vi.fn(), go: vi.fn() };
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  history.replaceState({}, "", "/");
});
const user = {
  id: "u",
  name: "Alex Sharma",
  email: "alex@test.com",
  role: "user",
  phone: "",
  seat: "aisle",
  cabin: "economy",
  loyalty: "",
  notifications: true,
  verified: true,
};
describe("platform components", () => {
  it("clean routing keeps query strings and supports history navigation", async () => {
    const changed = vi.fn(),
      stop = installNavigation(changed);
    try {
      navigate("/admin/users");
      expect(location.pathname).toBe("/admin/users");
      navigate("reset?token=abc");
      expect(currentPath()).toBe("reset?token=abc");
      history.back();
      await waitFor(() => expect(location.pathname).toBe("/admin/users"));
      expect(changed).toHaveBeenCalledWith("admin/users");
    } finally {
      stop();
    }
  });
  it("legacy hash links migrate to clean paths", () => {
    history.replaceState({}, "", "/#/admin/reports");
    migrateLegacyRoute();
    expect(location.pathname).toBe("/admin/reports");
    expect(location.hash).toBe("");
  });
  it("client navigation leaves downloads and modified clicks alone", () => {
    const stop = installNavigation(() => {});
    render(
      <>
        <a href="/trips">Trips link</a>
        <a href="/api/trips/one/export">Download data</a>
      </>,
    );
    try {
      fireEvent.click(screen.getByText("Trips link"));
      expect(location.pathname).toBe("/trips");
      const event = new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        ctrlKey: true,
      });
      screen.getByText("Trips link").dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
      const download = new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
      });
      screen.getByText("Download data").dispatchEvent(download);
      expect(download.defaultPrevented).toBe(false);
    } finally {
      stop();
    }
  });
  it("admin clean subsection opens directly and has left navigation", async () => {
    api.mockResolvedValue({
      metrics: {},
      settings: {},
      users: [],
      bookings: [],
    });
    render(<Admin user={{ ...user, role: "admin" }} section="bookings" />);
    await screen.findByText("Booking directory");
    expect(
      screen.getByRole("navigation", { name: "Admin navigation" }),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Bookings" })
        .getAttribute("aria-current"),
    ).toBe("page");
    fireEvent.click(screen.getByRole("link", { name: "Reports" }));
    expect(go).toHaveBeenCalledWith("admin/reports");
  });
  it("booking directory filters by type and text", () => {
    render(
      <AdminOperations
        tab="Bookings"
        data={{
          bookings: [
            {
              id: "a",
              tripId: "t",
              tripName: "Jaipur",
              title: "Airport transfer",
              type: "transfer",
              provider: "Cab",
              from: "JAI",
              to: "City",
              start: "2026-10-12T09:00:00Z",
              price: 500,
              status: "confirmed",
            },
            {
              id: "b",
              tripId: "t",
              tripName: "Jaipur",
              title: "City hotel",
              type: "hotel",
              provider: "Hotel",
              from: "City",
              to: "City",
              start: "2026-10-12T11:00:00Z",
              price: 1000,
              status: "confirmed",
            },
          ],
        }}
      />,
    );
    fireEvent.change(screen.getByLabelText("Booking type"), {
      target: { value: "hotel" },
    });
    expect(screen.queryByText("Airport transfer")).toBeNull();
    expect(screen.getByText("City hotel")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Search bookings"), {
      target: { value: "missing" },
    });
    expect(screen.getByText("No bookings match your filters.")).toBeTruthy();
  });
  it("landing exposes signup and demo routes", () => {
    render(<Landing />);
    expect(screen.getByText(/still goes on/)).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Find your way forward" })
        .getAttribute("href"),
    ).toBe("/signup");
    expect(
      screen
        .getByRole("link", { name: "Explore the demo" })
        .getAttribute("href"),
    ).toBe("/login");
  });
  it("login submits credentials and transitions after authentication", async () => {
    api.mockResolvedValue({ ok: true });
    const onAuth = vi.fn().mockResolvedValue(user);
    render(<AuthPage mode="login" onAuth={onAuth} />);
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "alex@test.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "GoodPassword123!" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: "Log in" }).closest("form"),
    );
    await waitFor(() =>
      expect(api).toHaveBeenCalledWith("auth/login", {
        email: "alex@test.com",
        password: "GoodPassword123!",
      }),
    );
    await waitFor(() => expect(go).toHaveBeenCalledWith("trips"));
  });
  it("login displays server rejection", async () => {
    api.mockRejectedValue(Error("Email or password is incorrect"));
    render(<AuthPage mode="login" onAuth={() => {}} />);
    fireEvent.submit(
      screen.getByRole("button", { name: "Log in" }).closest("form"),
    );
    await screen.findByRole("alert");
    expect(screen.getByText("Email or password is incorrect")).toBeTruthy();
  });
  it("new trip form converts traveler count and opens created trip", async () => {
    api.mockImplementation((p, b) =>
      Promise.resolve(p === "trips" && b ? { id: "new-trip" } : []),
    );
    render(<TripList user={user} />);
    fireEvent.click(screen.getByText("Plan a new trip"));
    fireEvent.change(screen.getByLabelText("Trip name"), {
      target: { value: "Goa escape" },
    });
    fireEvent.change(screen.getByLabelText("Destination"), {
      target: { value: "Goa" },
    });
    fireEvent.change(screen.getByLabelText("Start date"), {
      target: { value: "2026-11-01" },
    });
    fireEvent.change(screen.getByLabelText("End date"), {
      target: { value: "2026-11-04" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: "Save & continue" }).closest("form"),
    );
    await waitFor(() => expect(go).toHaveBeenCalledWith("trip/new-trip"));
    expect(api).toHaveBeenCalledWith(
      "trips",
      expect.objectContaining({ travelers: 1, name: "Goa escape" }),
    );
  });
  it("trip list surfaces resilience state and sorts by attention", async () => {
    api.mockResolvedValue([
      {
        id: "a",
        name: "Quiet trip",
        destination: "Goa",
        start: "2026-11-01",
        end: "2026-11-04",
        travelers: 2,
        bookings: 1,
        disruptions: 0,
        archived: false,
        riskLevel: "low",
        warnings: 0,
        affected: 0,
        value: 5000,
        refundable: 4000,
        daysUntil: 20,
        next: null,
      },
      {
        id: "b",
        name: "Troubled trip",
        destination: "Delhi",
        start: "2026-10-20",
        end: "2026-10-22",
        travelers: 1,
        bookings: 3,
        disruptions: 1,
        archived: false,
        riskLevel: "critical",
        warnings: 2,
        affected: 2,
        value: 9000,
        refundable: 1000,
        daysUntil: 5,
        next: { title: "Delhi flight", minutesUntil: 90 },
      },
    ]);
    const { container } = render(<TripList user={user} />);
    await screen.findByText("Troubled trip");
    expect(screen.getByText("Disruption active")).toBeTruthy();
    expect(screen.getByText("On track")).toBeTruthy();
    const tiles = [...container.querySelectorAll("a.trip-tile")].map(
      (a) => a.textContent,
    );
    expect(tiles[0]).toContain("Troubled trip");
    expect(tiles[1]).toContain("Quiet trip");
  });
  it("deleting a trip confirms, calls the API and removes the tile", async () => {
    const trips = [
      {
        id: "a",
        name: "Delete me",
        destination: "Goa",
        start: "2026-11-01",
        end: "2026-11-04",
        travelers: 2,
        bookings: 1,
        disruptions: 0,
        archived: false,
        riskLevel: "low",
        warnings: 0,
        affected: 0,
        value: 5000,
        refundable: 4000,
        daysUntil: 20,
        next: null,
      },
    ];
    api.mockImplementation((p, b, m) =>
      Promise.resolve(m === "DELETE" ? { ok: true } : trips),
    );
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<TripList user={user} />);
    await screen.findByText("Delete me");
    fireEvent.click(screen.getByRole("button", { name: "Delete Delete me" }));
    await waitFor(() =>
      expect(api).toHaveBeenCalledWith("trips/a", {}, "DELETE"),
    );
    await waitFor(() => expect(screen.queryByText("Delete me")).toBeNull());
    expect(confirm).toHaveBeenCalled();
    confirm.mockRestore();
  });
  it("dashboard overview renders charts and metrics", async () => {
    api.mockResolvedValue({
      trips: 2,
      active: 2,
      archived: 0,
      bookings: 4,
      travelers: 3,
      value: 14000,
      refundable: 5000,
      exposure: 9000,
      byType: { flight: 9000, hotel: 5000 },
      riskCounts: { critical: 1, high: 0, medium: 1, low: 0 },
      warnings: 2,
      disruptions: 1,
      upcoming: 1,
      departures: [
        {
          id: "t1",
          name: "Jaipur escape",
          destination: "Jaipur",
          start: "2026-10-12",
          daysUntil: 3,
          riskLevel: "medium",
        },
      ],
      risks: [],
      recoveries: { applied: 1, reverted: 0, net: 500 },
    });
    render(<Overview user={user} />);
    await screen.findByText("Where the money is");
    expect(screen.getByText("Trip readiness")).toBeTruthy();
    expect(screen.getByText("Refund picture")).toBeTruthy();
    expect(screen.getByText("Upcoming departures")).toBeTruthy();
    expect(screen.getByText("Recovery outcomes")).toBeTruthy();
    expect(api).toHaveBeenCalledWith("overview");
  });
  it("dashboard saves destinations across visits and connects planning actions", async () => {
    localStorage.clear();
    api.mockResolvedValue({ trips: 0, active: 0, value: 0, byType: {}, riskCounts: {}, warnings: 0, departures: [], risks: [], recoveries: {} });
    const first = render(<Overview user={user} />);
    await screen.findByText("Your Upcoming Trip");
    expect(screen.getByRole("link", { name: "AI Recovery" }).getAttribute("href")).toBe("/build?mode=auto");
    fireEvent.click(screen.getByRole("button", { name: "Save Jaipur" }));
    expect(screen.getByRole("button", { name: "Unsave Jaipur" }).getAttribute("aria-pressed")).toBe("true");
    first.unmount();
    render(<Overview user={user} />);
    await screen.findByRole("button", { name: "Remove Jaipur from saved" });
    expect(screen.getByRole("link", { name: /Jaipur\s*Plan your getaway/ }).getAttribute("href")).toBe("/build?destination=Jaipur");
    fireEvent.click(screen.getByRole("button", { name: "Remove Jaipur from saved" }));
    expect(screen.getByRole("button", { name: "Save Jaipur" }).getAttribute("aria-pressed")).toBe("false");
    localStorage.clear();
  });
  it("build results show all destination-specific search categories together", () => {
    const build = newTripBuild("u", { mode: "manual", origin: "Mumbai", destination: "Jaipur", date: "2026-10-15", durationDays: 3, travelers: 1, budget: 20000 });
    build.jobs = Object.fromEntries(["flights", "hotels", "transfers", "restaurants", "activities"].map((category) => [category, { category, startedAt: new Date(Date.now() - 60000).toISOString(), etaMs: 1, state: "COMPLETED", outage: false }]));
    const results = tripBuildView(build);
    render(<SearchPanel build={results} onSelect={() => {}} onRemove={() => {}} onSearch={() => {}} onStop={() => {}} busy={false} />);
    expect(screen.getByRole("heading", { name: "Travel Search Results" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Flights & rail" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Hotels" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Airport & local transport" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Restaurants" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Activities & attractions" })).toBeTruthy();
    expect(screen.getByText(/Rawat Mishtan Bhandar/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "See all activities & attractions" }));
    expect(screen.getByText("Amber Fort")).toBeTruthy();
  });
  it("manual planning excludes the AI selector and submits the chosen route and preferences", () => {
    const start = vi.fn();
    render(<ManualTrip user={user} onStart={start} busy={false} />);
    expect(screen.queryByText(/Automated Recovery/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Swap origin and destination" }));
    expect(screen.getByLabelText("From").value).toBe("Jaipur");
    expect(screen.getByLabelText("To").value).toBe("Mumbai");
    fireEvent.click(screen.getByRole("button", { name: /Premium More comfort/ }));
    fireEvent.change(screen.getByLabelText("Departure time"), { target: { value: "15:00" } });
    fireEvent.submit(screen.getByRole("button", { name: "Search & Build My Trip" }).closest("form"));
    expect(start).toHaveBeenCalledWith(expect.objectContaining({ mode: "manual", origin: "Jaipur", destination: "Mumbai", time: "15:00", travelers: 1, preferences: expect.objectContaining({ hotelStars: 5 }) }));
    expect(start.mock.calls[0][0]).not.toHaveProperty("returnDate");
  });
  it("traveler shell mirrors the admin console navigation", async () => {
    api.mockResolvedValue([]);
    render(
      <TravelerShell user={user} logout={() => {}} page="trips">
        <p>content</p>
      </TravelerShell>,
    );
    expect(
      await screen.findByRole("navigation", { name: "Traveler navigation" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /Dashboard/ }).getAttribute("href"),
    ).toBe("/dashboard");
    expect(
      screen.getByRole("link", { name: /My trips/ }).getAttribute("href"),
    ).toBe("/trips");
    expect(
      screen.getByRole("link", { name: /Inbox/ }).getAttribute("href"),
    ).toBe("/notifications");
    expect(
      screen.getByRole("link", { name: /Support/ }).getAttribute("href"),
    ).toBe("/support");
  });
  it("risk panel shows the band, score and factors", () => {
    render(
      <RiskPanel
        risks={{
          overall: 45,
          band: "high",
          worst: { id: "flight" },
          items: [
            {
              id: "flight",
              title: "Delhi → Jaipur",
              score: 45,
              band: "high",
              factors: ["Only 0 min of slack after transfer."],
            },
          ],
        }}
      />,
    );
    expect(screen.getByText("HIGH · 45/100")).toBeTruthy();
    expect(screen.getByText("Delhi → Jaipur")).toBeTruthy();
    expect(screen.getByText("Only 0 min of slack after transfer.")).toBeTruthy();
  });
  it("plan comparison sorts plans by the chosen metric", () => {
    const plans = [
      {
        id: "balanced",
        label: "Best balance",
        net: 900,
        refund: 4200,
        delay: 120,
        preservation: 60,
        changes: [1, 2],
        recommended: true,
      },
      {
        id: "budget",
        label: "Cost-conscious option",
        net: 0,
        refund: 0,
        delay: 180,
        preservation: 40,
        changes: [1],
      },
    ];
    render(<PlanComparison plans={plans} onReview={() => {}} />);
    expect(screen.getByText("Compare plans")).toBeTruthy();
    let rows = screen.getAllByRole("row");
    expect(rows[1].textContent).toContain("Cost-conscious option");
    fireEvent.click(screen.getByRole("button", { name: "Schedule shift" }));
    rows = screen.getAllByRole("row");
    expect(rows[1].textContent).toContain("Best balance");
    expect(
      screen.getAllByRole("button", { name: "Review" }).length,
    ).toBe(2);
  });
  it("policy explainer labels refund outcomes", () => {
    render(
      <PolicyExplainer
        data={{
          clock: "2026-10-12T01:30:00Z",
          policies: [
            {
              id: "a",
              title: "Delhi → Jaipur",
              provider: "IndiGo",
              price: 4200,
              refund: 0.75,
              status: "partial",
              amount: 3150,
              note: "75% refundable until 2026-10-11.",
            },
            {
              id: "b",
              title: "City hotel",
              provider: "Alsisar",
              price: 9600,
              refund: 0.5,
              status: "expired",
              amount: 0,
              note: "The refund deadline has passed.",
            },
          ],
        }}
      />,
    );
    expect(screen.getByText("Refundable now")).toBeTruthy();
    expect(screen.getByText("Why each booking refunds or not")).toBeTruthy();
    expect(screen.getByText("75% refund")).toBeTruthy();
    expect(screen.getByText("Deadline passed")).toBeTruthy();
  });
  it("trip console exposes each function as a routeable section", async () => {
    const data = {
      ...seed(),
      clock: "2026-10-11T10:00:00Z",
      ownerId: user.id,
    };
    const snapshot = () => ({
      ...data,
      impacts: impacted(data),
      warnings: warnings(data),
      plans: recover(data),
      insights: insights(data),
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => snapshot() })),
    );
    render(<Dashboard tripId="sample" user={user} section="recovery" />);
    await screen.findByText("Let’s get you back on track.");
    expect(
      screen.getByRole("navigation", { name: "Trip navigation" }),
    ).toBeTruthy();
    const link = screen.getByRole("link", { name: /Recovery center/ });
    expect(link.getAttribute("href")).toBe("/trip/sample/recovery");
    expect(link.getAttribute("aria-current")).toBe("page");
    expect(screen.queryByRole("link", { name: /My itinerary/ })).toBeNull();
  });
  it("booking editor preserves absolute time and numeric refund", async () => {
    const data = seed(),
      save = vi.fn().mockResolvedValue();
    render(
      <BookingEditor
        data={data}
        booking={data.trip.bookings[0]}
        onSave={save}
      />,
    );
    fireEvent.submit(
      screen.getByRole("button", { name: "Save & continue" }).closest("form"),
    );
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith(
        expect.objectContaining({
          start: "2026-10-12T02:30:00.000Z",
          refund: 0.75,
          price: 4200,
        }),
      ),
    );
  });
  it("booking editor creates dependency links with buffers", async () => {
    const data = seed(),
      save = vi.fn().mockResolvedValue();
    render(<BookingEditor data={data} onSave={save} />);
    fireEvent.click(screen.getByLabelText("Delhi → Jaipur"));
    fireEvent.submit(
      screen.getByRole("button", { name: "Save & continue" }).closest("form"),
    );
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith(
        expect.objectContaining({
          dependencies: [{ id: "flight", buffer: 30 }],
        }),
      ),
    );
  });
  it("inventory opens review actions instead of mutating immediately", () => {
    const data = seed(),
      open = vi.fn();
    render(<Inventory data={data} open={open} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Generate demo inventory" }),
    );
    expect(open).toHaveBeenCalledWith({ type: "generate" });
    fireEvent.click(
      screen.getAllByRole("button", { name: "Add alternative" })[0],
    );
    expect(open).toHaveBeenCalledWith({
      type: "offer",
      b: data.trip.bookings[0],
    });
  });
  it("graph nodes expose keyboard booking details", () => {
    const data = seed(),
      select = vi.fn();
    render(
      <DependencyGraph
        bookings={data.trip.bookings}
        impacts={[]}
        onSelect={select}
      />,
    );
    fireEvent.keyDown(
      screen.getByRole("button", { name: "Delhi → Jaipur; confirmed" }),
      { key: "Enter" },
    );
    expect(select).toHaveBeenCalledWith(data.trip.bookings[0]);
  });
  it("trip insights view renders the cost breakdown and next booking", async () => {
    const data = { ...seed(), clock: "2026-10-11T10:00:00Z", ownerId: user.id };
    const snapshot = () => ({
      ...data,
      impacts: impacted(data),
      warnings: warnings(data),
      plans: recover(data),
      insights: insights(data),
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => snapshot() })),
    );
    render(<Dashboard tripId="sample" user={user} section="insights" />);
    await screen.findByText("Your journey, by the numbers.");
    await screen.findByText("Where the money goes");
    expect(screen.getByText("Booked trip value")).toBeTruthy();
    expect(screen.getByText("Still refundable")).toBeTruthy();
    expect(screen.getByText("Trip rhythm")).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: /Trip insights/ })
        .getAttribute("aria-current"),
    ).toBe("page");
  });
  it("assistant shows engine response", async () => {
    api.mockResolvedValue({ answer: "Two bookings are at risk." });
    render(<Assistant tripId="trip1" />);
    fireEvent.change(screen.getByLabelText("Ask about your trip"), {
      target: { value: "What is at risk?" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: "Send" }).closest("form"),
    );
    await screen.findByText("Two bookings are at risk.");
    expect(api).toHaveBeenCalledWith("trips/trip1/assistant", {
      message: "What is at risk?",
    });
  });
  it("admin console renders computed metrics and service status", async () => {
    api.mockResolvedValue({
      metrics: { users: 2, trips: 1 },
      settings: { monitoring: true },
      users: [],
      integrations: [
        {
          name: "Storage",
          status: "JSON active",
          detail: "Atomic file writes",
        },
      ],
    });
    render(<Admin user={{ ...user, role: "admin" }} />);
    await screen.findByText("Operations overview");
    fireEvent.click(screen.getByRole("link", { name: "Integrations" }));
    expect(screen.getByText("JSON active")).toBeTruthy();
  });
  it("dashboard completes the simulate, review and apply journey", async () => {
    let data = { ...seed(), clock: "2026-10-12T01:30:00Z", ownerId: user.id };
    const snapshot = () => ({
      ...data,
      impacts: impacted(data),
      warnings: warnings(data),
      plans: recover(data),
    });
    const fetcher = vi.fn(async (url, options) => {
      if (url.endsWith("/disruptions")) {
        data.disruptions = [
          { ...JSON.parse(options.body), occurredAt: data.clock },
        ];
        data.version++;
      }
      if (url.endsWith("/apply")) {
        const p = recover(data)[0];
        data.trip.bookings = p.bookings;
        data.disruptions = [];
        data.history = [{ ...p, appliedAt: new Date().toISOString() }];
        data.version++;
      }
      return { ok: true, json: async () => snapshot() };
    });
    vi.stubGlobal("fetch", fetcher);
    render(<Dashboard tripId="sample" user={user} />);
    await screen.findByText("Good journeys. Fewer surprises.");
    fireEvent.click(
      screen.getByRole("button", { name: "Simulate disruption" }),
    );
    fireEvent.submit(
      screen
        .getByRole("button", { name: "Find my recovery options" })
        .closest("form"),
    );
    await screen.findAllByRole("button", { name: "Review this plan" });
    fireEvent.click(
      screen.getAllByRole("button", { name: "Review this plan" })[0],
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Apply to my itinerary" }),
    );
    await screen.findByText(
      "Recovery applied. Your local itinerary is up to date.",
    );
    expect(fetcher).toHaveBeenCalledWith(
      "/api/trips/sample/apply",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
