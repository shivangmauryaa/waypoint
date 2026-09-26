import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
test("multi-user platform integration", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "waypoint-test-"));
  const child = spawn(process.execPath, ["server/index.js"], {
    env: { ...process.env, PORT: "3109", DATA_DIR: dir },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stderr = "";
  child.stderr.on("data", (c) => (stderr += c));
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(Error("Server startup timed out: " + stderr)),
        15000,
      );
      child.stdout.once("data", () => {
        clearTimeout(timer);
        resolve();
      });
      child.once("error", reject);
      child.once("exit", (code) => {
        clearTimeout(timer);
        reject(Error(`Server exited ${code}: ${stderr}`));
      });
    });
    const jar = {};
    const call = async (path, body, method = "POST", actor = "traveler") => {
      const response = await fetch("http://127.0.0.1:3109/api/" + path, {
        method: body === undefined ? "GET" : method,
        headers: {
          "Content-Type": "application/json",
          "X-Waypoint-Request": "1",
          ...(jar[actor] ? { Cookie: jar[actor] } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      const cookie = response.headers.get("set-cookie");
      if (cookie) jar[actor] = cookie.split(";")[0];
      return { status: response.status, data: await response.json() };
    };
    let tripId, otherId, otherUserId, planVersion, planId, bookingId;
    await t.test("anonymous routes and request verification", async () => {
      assert.equal((await call("trips")).status, 401);
      const r = await fetch("http://127.0.0.1:3109/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      assert.equal(r.status, 403);
    });
    await t.test("traveler login and admin authorization", async () => {
      assert.equal(
        (
          await call("auth/login", {
            email: "traveler@waypoint.local",
            password: "wrongwrongwrong",
          })
        ).status,
        401,
      );
      assert.equal(
        (
          await call("auth/login", {
            email: "traveler@waypoint.local",
            password: "TravelDemo123!",
          })
        ).status,
        200,
      );
      const me = (await call("auth/me")).data.user;
      assert.equal(me.role, "user");
      assert.equal(me.passwordHash, undefined);
      assert.equal((await call("admin/overview")).status, 403);
      tripId = (await call("trips")).data[0].id;
    });
    await t.test(
      "signup cannot choose admin and cannot read another trip",
      async () => {
        const r = await call(
          "auth/signup",
          {
            name: "Test Traveler",
            email: "test@example.com",
            password: "TestingPassword123!",
            role: "admin",
          },
          "POST",
          "other",
        );
        assert.equal(r.status, 200);
        const me = (await call("auth/me", undefined, "GET", "other")).data.user;
        assert.equal(me.role, "user");
        otherUserId = me.id;
        assert.equal(
          (await call("trips", undefined, "GET", "other")).data.length,
          0,
        );
        assert.equal(
          (await call(`trips/${tripId}/state`, undefined, "GET", "other"))
            .status,
          404,
        );
        assert.equal(
          (await call(`trips/${tripId}/reset`, {}, "POST", "other")).status,
          404,
        );
      },
    );
    await t.test(
      "create custom trip and manage bookings with validation",
      async () => {
        const created = await call(
          "trips",
          {
            name: "Coastal escape",
            destination: "Goa",
            subtitle: "A new journey",
            start: "2026-11-01",
            end: "2026-11-04",
            travelers: 2,
          },
          "POST",
          "other",
        );
        assert.equal(created.status, 200);
        otherId = created.data.id;
        const booking = {
          type: "flight",
          title: "Delhi to Goa",
          provider: "Test airline",
          reference: "TEST123",
          from: "DEL",
          to: "GOI",
          start: "2026-11-01T09:00:00+05:30",
          end: "2026-11-01T11:30:00+05:30",
          price: 5000,
          refund: 0.5,
          refundDeadline: "2026-10-31T09:00:00+05:30",
          dependencies: [],
        };
        let r = await call(
          `trips/${otherId}/bookings`,
          booking,
          "POST",
          "other",
        );
        assert.equal(r.status, 200);
        bookingId = r.data.trip.bookings[0].id;
        r = await call(
          `trips/${otherId}/bookings/${bookingId}`,
          { ...booking, dependencies: [{ id: bookingId, buffer: 0 }] },
          "PUT",
          "other",
        );
        assert.equal(r.status, 409);
        r = await call(
          `trips/${otherId}/generate-inventory`,
          {},
          "POST",
          "other",
        );
        assert.equal(r.data.offers.length, 5);
      },
    );
    await t.test(
      "confirmation ingestion previews data without saving",
      async () => {
        const r = await call(
          `trips/${otherId}/parse`,
          {
            text: "Title: Airport pickup\nType: transfer\nFrom: GOI\nTo: Goa\nStart: 2026-11-01T12:00:00+05:30\nEnd: 2026-11-01T13:00:00+05:30\nPrice: 900",
          },
          "POST",
          "other",
        );
        assert.equal(r.status, 200);
        assert.equal(r.data.drafts[0].type, "transfer");
        assert.equal(r.data.drafts[0].price, 900);
        assert.equal(
          (await call(`trips/${otherId}/state`, undefined, "GET", "other")).data
            .trip.bookings.length,
          1,
        );
      },
    );
    await t.test("trip and booking duplication clone with fresh ids", async () => {
      let r = await call(
        `trips/${otherId}/bookings/${bookingId}/duplicate`,
        {},
        "POST",
        "other",
      );
      assert.equal(r.status, 200);
      const bookings = r.data.trip.bookings;
      assert.equal(bookings.length, 2);
      const copy = bookings.find((b) => b.id !== bookingId);
      assert.match(copy.title, /\(copy\)$/);
      assert.equal(copy.dependencies.length, 0);
      r = await call(`trips/${otherId}/duplicate`, {}, "POST", "other");
      assert.equal(r.status, 200);
      const duplicateId = r.data.id;
      assert.notEqual(duplicateId, otherId);
      const state = (
        await call(`trips/${duplicateId}/state`, undefined, "GET", "other")
      ).data;
      assert.equal(state.trip.bookings.length, 2);
      assert.equal(state.history.length, 0);
      assert.equal(state.disruptions.length, 0);
      assert.equal(state.ownerId, otherUserId);
      assert.ok(state.trip.bookings.every((b) => b.id !== bookingId));
      assert.equal((await call("trips", undefined, "GET", "other")).data.length, 2);
      assert.equal(
        (
          await call(`trips/${duplicateId}/state`, undefined, "GET", "traveler")
        ).status,
        404,
      );
    });
    await t.test("itinerary CSV export streams booking rows", async () => {
      const r = await fetch(
        `http://127.0.0.1:3109/api/trips/${otherId}/export.csv`,
        { headers: { Cookie: jar.other } },
      );
      assert.equal(r.status, 200);
      assert.match(r.headers.get("content-type"), /text\/csv/);
      const text = await r.text();
      assert.match(text, /"Title","Type","Provider"/);
      assert.match(text, /"Delhi to Goa"/);
    });
    await t.test(
      "full disruption recovery persists and rejects stale selection",
      async () => {
        let r = await call(`trips/${tripId}/disruptions`, {
          bookingId: "flight",
          type: "delay",
          delayMinutes: 120,
        });
        assert.equal(r.status, 200);
        assert.ok(r.data.plans.length);
        planVersion = r.data.version;
        planId = r.data.plans[0].id;
        r = await call(`trips/${tripId}/apply`, {
          planId,
          version: planVersion,
        });
        assert.equal(r.status, 200);
        assert.equal(r.data.history.length, 1);
        assert.equal(r.data.disruptions.length, 0);
        const saved = JSON.parse(
          await readFile(join(dir, "store.json"), "utf8"),
        );
        assert.deepEqual(
          saved.trips.find((t) => t.trip.id === tripId).trip,
          r.data.trip,
        );
        assert.ok(saved.audit.some((a) => a.action === "recovery.applied"));
        assert.equal(
          (
            await call(`trips/${tripId}/apply`, {
              planId,
              version: planVersion,
            })
          ).status,
          409,
        );
      },
    );
    await t.test(
      "undo restores original itinerary and can only run once",
      async () => {
        const r = await call(`trips/${tripId}/undo`, {});
        assert.equal(r.status, 200);
        assert.equal(r.data.history[0].undone, true);
        assert.ok(r.data.disruptions.length);
        assert.equal((await call(`trips/${tripId}/undo`, {})).status, 400);
      },
    );
    await t.test("restore returns to any earlier recovery point", async () => {
      let r = await call(`trips/${tripId}/disruptions`, {
        bookingId: "flight",
        type: "delay",
        delayMinutes: 60,
      });
      assert.equal(r.status, 200);
      r = await call(`trips/${tripId}/apply`, {
        planId: r.data.plans[0].id,
        version: r.data.version,
      });
      assert.equal(r.status, 200);
      const historyId = r.data.history[0].id;
      assert.equal(
        (await call(`trips/${tripId}/history/missing/restore`, {})).status,
        404,
      );
      r = await call(`trips/${tripId}/history/${historyId}/restore`, {});
      assert.equal(r.status, 200);
      assert.equal(r.data.history[0].undone, true);
      assert.ok(r.data.disruptions.length);
    });
    await t.test(
      "notifications are private and read state is persisted",
      async () => {
        const list = (await call("notifications")).data;
        assert.ok(list.length);
        assert.ok(list.every((n) => n.tripId === tripId));
        assert.equal(
          (await call("notifications", undefined, "GET", "other")).data.length,
          0,
        );
        await call("notifications/read", {});
        assert.ok((await call("notifications")).data.every((n) => n.read));
      },
    );
    await t.test("assistant is grounded in trip context", async () => {
      const r = await call(`trips/${tripId}/assistant`, {
        message: "What are the recovery costs?",
      });
      assert.equal(r.status, 200);
      assert.match(r.data.answer, /INR/);
    });
    await t.test("assistant answers schedule, value and accessibility", async () => {
      const schedule = await call(`trips/${tripId}/assistant`, {
        message: "What is next on my schedule?",
      });
      assert.equal(schedule.status, 200);
      assert.match(schedule.data.answer, /Next up|upcoming/i);
      const value = await call(`trips/${tripId}/assistant`, {
        message: "What is the total spend?",
      });
      assert.match(value.data.answer, /INR/);
      const access = await call(`trips/${tripId}/assistant`, {
        message: "Is accessibility on?",
      });
      assert.match(access.data.answer, /Accessible-only/);
      const weather = await call(`trips/${tripId}/assistant`, {
        message: "Any weather risk?",
      });
      assert.equal(weather.status, 200);
      assert.match(weather.data.answer, /weather/i);
    });
    await t.test("trip snapshot includes computed insights", async () => {
      const s = (await call(`trips/${tripId}/state`)).data;
      assert.equal(s.insights.bookings, s.trip.bookings.length);
      assert.ok(s.insights.value > 0);
      assert.equal(
        s.insights.refundExposure,
        s.insights.value - s.insights.refundable,
      );
      assert.equal(s.risks.items.length, s.trip.bookings.length);
      assert.ok(s.risks.overall >= 0 && s.risks.overall <= 100);
      assert.equal(s.policies.length, s.trip.bookings.length);
      assert.ok(s.policies.every((p) => typeof p.amount === "number"));
    });
    await t.test("trip list summaries expose resilience state", async () => {
      const s = (await call("trips")).data.find((x) => x.id === tripId);
      assert.ok(s);
      assert.equal(s.exposure, s.value - s.refundable);
      assert.equal(typeof s.warnings, "number");
      assert.equal(typeof s.affected, "number");
      assert.ok(["critical", "high", "medium", "low", "archived"].includes(s.riskLevel));
      assert.equal(typeof s.daysUntil, "number");
    });
    await t.test("traveler overview aggregates trips for the dashboard", async () => {
      const o = (await call("overview")).data;
      assert.equal(o.exposure, o.value - o.refundable);
      assert.equal(
        Object.values(o.riskCounts).reduce((a, b) => a + b, 0),
        o.active,
      );
      assert.equal(typeof o.byType, "object");
      assert.ok(Array.isArray(o.departures));
      assert.equal(typeof o.recoveries.applied, "number");
      assert.equal(
        (await call("overview", undefined, "GET", "other")).data.trips >= 1,
        true,
      );
    });
    await t.test(
      "support ticket is visible to admin and reply reaches traveler",
      async () => {
        assert.equal(
          (
            await call(
              "auth/login",
              { email: "admin@waypoint.local", password: "AdminDemo123!" },
              "POST",
              "admin",
            )
          ).status,
          200,
        );
        await call("tickets", {
          subject: "Please help recover",
          message: "I need help with my delayed flight.",
          tripId,
        });
        const overview = (
          await call("admin/overview", undefined, "GET", "admin")
        ).data;
        const ticket = overview.tickets[0];
        assert.equal(
          (
            await call(
              `tickets/${ticket.id}/reply`,
              { message: "We are reviewing your options.", status: "resolved" },
              "POST",
              "admin",
            )
          ).status,
          200,
        );
        assert.equal((await call("tickets")).data[0].status, "resolved");
        assert.equal(
          (await call("tickets", undefined, "GET", "other")).data.length,
          0,
        );
      },
    );
    await t.test(
      "admin can review trips, change policies and disable accounts",
      async () => {
        assert.equal(
          (await call(`trips/${otherId}/state`, undefined, "GET", "admin"))
            .status,
          200,
        );
        assert.equal(
          (
            await call(
              "admin/policies",
              { provider: "Test airline", refund: 0.8, hours: 48 },
              "POST",
              "admin",
            )
          ).status,
          200,
        );
        assert.equal(
          (await call(`trips/${otherId}/state`, undefined, "GET", "other")).data
            .trip.bookings[0].refund,
          0.8,
        );
        assert.equal(
          (
            await call(
              `admin/users/${otherUserId}`,
              { active: false, role: "user" },
              "PUT",
              "admin",
            )
          ).status,
          200,
        );
        assert.equal(
          (await call("trips", undefined, "GET", "other")).status,
          401,
        );
        await call(
          `admin/users/${otherUserId}`,
          { active: true, role: "user" },
          "PUT",
          "admin",
        );
      },
    );
    await t.test(
      "verification and password reset use single-use expiring tokens",
      async () => {
        let saved = JSON.parse(await readFile(join(dir, "store.json"), "utf8"));
        let mail = saved.outbox.find(
          (m) => m.to === "test@example.com" && m.subject.startsWith("Verify"),
        );
        const verifyToken = mail.body.match(/token=([a-f0-9]+)/)[1];
        assert.equal(
          (await call("auth/verify", { token: verifyToken }, "POST", "other"))
            .status,
          200,
        );
        assert.equal(
          (await call("auth/verify", { token: verifyToken }, "POST", "other"))
            .status,
          400,
        );
        await call(
          "auth/forgot",
          { email: "test@example.com" },
          "POST",
          "other",
        );
        saved = JSON.parse(await readFile(join(dir, "store.json"), "utf8"));
        mail = saved.outbox.find(
          (m) => m.to === "test@example.com" && m.subject.startsWith("Reset"),
        );
        const resetToken = mail.body.match(/token=([a-f0-9]+)/)[1];
        assert.equal(
          (
            await call(
              "auth/reset",
              { token: resetToken, password: "NewTestingPassword123!" },
              "POST",
              "other",
            )
          ).status,
          200,
        );
        assert.equal(
          (
            await call(
              "auth/reset",
              { token: resetToken, password: "AnotherPassword123!" },
              "POST",
              "other",
            )
          ).status,
          400,
        );
        assert.equal(
          (
            await call(
              "auth/login",
              { email: "test@example.com", password: "NewTestingPassword123!" },
              "POST",
              "other",
            )
          ).status,
          200,
        );
      },
    );
    await t.test("admin portfolio aggregates insights across trips", async () => {
      const p = (await call("admin/overview", undefined, "GET", "admin"))
        .data.portfolio;
      assert.ok(p);
      assert.equal(p.exposure, p.value - p.refundable);
      assert.ok(p.trips.length >= 1);
      assert.ok(p.trips.every((x) => typeof x.value === "number"));
      assert.ok(p.trips.some((x) => x.bookings > 0));
    });
    await t.test("traveler can delete a trip permanently", async () => {
      const created = await call("trips", {
        name: "Disposable trip",
        subtitle: "Delete me",
        destination: "Nowhere",
        travelers: 1,
        start: "2026-12-01",
        end: "2026-12-03",
      });
      const temporaryId = created.data.id;
      assert.equal(
        (await call(`trips/${temporaryId}/state`, undefined, "GET")).status,
        200,
      );
      assert.ok(
        (await call("trips")).data.map((x) => x.id).includes(temporaryId),
      );
      assert.equal((await call(`trips/${temporaryId}`, {}, "DELETE")).status, 200);
      assert.ok(
        !(await call("trips")).data
          .map((x) => x.id)
          .includes(temporaryId),
      );
      assert.equal(
        (await call(`trips/${temporaryId}/state`, undefined, "GET")).status,
        404,
      );
      assert.equal(
        (await call(`trips/${temporaryId}`, {}, "DELETE")).status,
        404,
      );
    });
    await t.test("logout revokes the session", async () => {
      await call("auth/logout", {}, "POST", "other");
      assert.equal(
        (await call("trips", undefined, "GET", "other")).status,
        401,
      );
    });
  } finally {
    if (child.exitCode === null) {
      const exited = new Promise((resolve) => child.once("exit", resolve));
      child.kill();
      await exited;
    }
    assert.equal(dirname(resolve(dir)), resolve(tmpdir()));
    assert.ok(dir.includes("waypoint-test-"));
    await rm(dir, { recursive: true, force: true });
  }
});
