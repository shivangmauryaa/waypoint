import React, { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { RecoveryFlow } from "../src/RecoveryFlow";
import {
  newBuild,
  autoMessage,
  autoAdvance,
  view,
  confirmBuild,
  bookBuild,
  recoverAttempt,
} from "../server/builder.js";

const prompt =
  "I missed my Jaipur flight and I'm stuck in Mumbai. I have INR 20,000.";
function fixture() {
  const now = Date.now();
  const raw = newBuild("recovery-test", {
    mode: "auto",
    travelers: 1,
    date: "2026-10-15",
  });
  autoMessage(raw, prompt, now);
  // Keep this journey deterministic; provider outages are covered separately.
  for (const job of Object.values(raw.jobs)) job.outage = false;
  return { raw, now };
}
beforeEach(() => {
  Element.prototype.scrollTo = vi.fn();
});
afterEach(cleanup);

describe("dedicated recovery journey", () => {
  it("shows the submitted prompt and real progress, then transitions to options", async () => {
    const { raw, now } = fixture();
    const props = {
      user: { name: "Demo Traveler" },
      onRun: vi.fn(),
      busy: false,
    };
    const { rerender } = render(
      <RecoveryFlow {...props} build={view(raw, now)} />,
    );
    expect(screen.getByText(prompt)).toBeTruthy();
    expect(screen.getByText("Searching for the best options…")).toBeTruthy();
    expect(
      screen.queryByRole("heading", { name: "Flight Options" }),
    ).toBeNull();
    autoAdvance(raw, now + 120000);
    rerender(<RecoveryFlow {...props} build={view(raw, now + 120000)} />);
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Flight Options" }),
      ).toBeTruthy(),
    );
    expect(screen.queryByText("Searching for the best options…")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /^Hotels \(/ }));
    expect(screen.getByRole("heading", { name: "Hotel Options" })).toBeTruthy();
    expect(
      screen.queryByRole("heading", { name: "Flight Options" }),
    ).toBeNull();
  });

  it("requires review and an explicit hotel replacement before saving a confirmed trip", async () => {
    const { raw, now } = fixture();
    const clock = now + 120000;
    autoAdvance(raw, clock);
    const saved = vi.fn();
    function Harness() {
      const [build, setBuild] = useState(view(raw, clock));
      const run = async (path) => {
        if (path === "/confirm") confirmBuild(raw);
        if (path === "/book") bookBuild(raw, clock);
        if (path.includes("/recover"))
          recoverAttempt(raw, path.split("/")[2], clock);
        if (path === "/save") {
          saved();
          raw.savedTripId = "confirmed-trip";
          return { id: "confirmed-trip" };
        }
        const next = view(raw, clock);
        setBuild(next);
        return next;
      };
      return (
        <RecoveryFlow
          build={build}
          user={{ name: "Demo Traveler" }}
          onRun={run}
          busy={false}
        />
      );
    }
    render(<Harness />);
    fireEvent.click(
      screen.getByRole("button", { name: /Review & Confirm Manually/ }),
    );
    expect(saved).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", { name: "Confirm & book selected plan" }),
    );
    await waitFor(() =>
      expect(screen.getByText("A booking needs your attention")).toBeTruthy(),
    );
    expect(saved).not.toHaveBeenCalled();
    expect(screen.queryByText(/Your recovery plan is confirmed!/)).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: "Confirm this replacement & finish" }),
    );
    await waitFor(() =>
      expect(screen.getByText(/Your recovery plan is confirmed!/)).toBeTruthy(),
    );
    expect(saved).toHaveBeenCalledTimes(1);
    expect(
      screen
        .getByRole("link", { name: /View Updated Trip/ })
        .getAttribute("href"),
    ).toBe("/trip/confirmed-trip");
    expect(
      screen
        .getByRole("link", { name: /Download itinerary/ })
        .getAttribute("href"),
    ).toBe("/api/trips/confirmed-trip/export.csv");
  });

  it("restores the saved confirmation after reload", () => {
    const { raw, now } = fixture();
    autoAdvance(raw, now + 120000);
    confirmBuild(raw);
    bookBuild(raw);
    for (const failed of raw.attempts.filter(
      (attempt) => attempt.status === "FAILED",
    ))
      recoverAttempt(raw, failed.id);
    raw.savedTripId = "existing-trip";
    render(
      <RecoveryFlow
        build={view(raw, now + 120000)}
        onRun={vi.fn()}
        user={{ name: "Demo Traveler" }}
      />,
    );
    expect(screen.getByText(/Your recovery plan is confirmed!/)).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: /View Updated Trip/ })
        .getAttribute("href"),
    ).toBe("/trip/existing-trip");
  });
});
