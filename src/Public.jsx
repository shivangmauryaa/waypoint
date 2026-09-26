import React, { useEffect, useRef, useState } from "react";
import {
  Compass,
  ArrowRight,
  GitBranch,
  ShieldCheck,
  Route,
  Check,
  Plane,
  Train,
  Car,
  Building2,
  ArrowUpRight,
  LockKeyhole,
  Search,
  LayoutDashboard,
  CalendarDays,
  Sparkles,
  MessageCircle,
  Ticket,
  Hotel,
  Wallet,
  Users,
  ChevronRight,
} from "lucide-react";
import { api, go, fields } from "./api";
export function Brand() {
  return (
    <a href="/" className="brand">
      <span>
        <Compass size={25} />
      </span>
      waypoint<span className="brand-dot">.</span>
    </a>
  );
}
export function Landing({ user }) {
  const sceneRef = useRef(null);
  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (reduce?.matches || !("IntersectionObserver" in window)) return;
    const root = document.documentElement;
    root.classList.add("fx-on");
    /* Scroll reveals */
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );
    document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
    /* Hero parallax */
    const scene = sceneRef.current;
    let raf = 0;
    const onSceneMove = (e) => {
      if (!scene) return;
      const r = scene.getBoundingClientRect();
      const mx = ((e.clientX - r.left) / r.width) * 2 - 1;
      const my = ((e.clientY - r.top) / r.height) * 2 - 1;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        scene.style.setProperty("--mx", mx.toFixed(3));
        scene.style.setProperty("--my", my.toFixed(3));
      });
    };
    /* Card tilt (event delegation) */
    const tiltFor = (e) => e.target?.closest?.("[data-tilt]") || null;
    const onTiltMove = (e) => {
      const card = tiltFor(e);
      if (!card) return;
      const r = card.getBoundingClientRect();
      const px = ((e.clientX - r.left) / r.width) * 2 - 1;
      const py = ((e.clientY - r.top) / r.height) * 2 - 1;
      card.style.setProperty("--rx", (py * -6).toFixed(2) + "deg");
      card.style.setProperty("--ry", (px * 8).toFixed(2) + "deg");
      card.style.setProperty("--shx", (((px + 1) / 2) * 100).toFixed(1) + "%");
      card.style.setProperty("--shy", (((py + 1) / 2) * 100).toFixed(1) + "%");
    };
    const onTiltOut = (e) => {
      const card = tiltFor(e);
      if (!card || card.contains(e.relatedTarget)) return;
      card.style.setProperty("--rx", "0deg");
      card.style.setProperty("--ry", "0deg");
    };
    window.addEventListener("pointermove", onSceneMove);
    document.addEventListener("pointermove", onTiltMove);
    document.addEventListener("pointerout", onTiltOut);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onSceneMove);
      document.removeEventListener("pointermove", onTiltMove);
      document.removeEventListener("pointerout", onTiltOut);
      root.classList.remove("fx-on");
    };
  }, []);
  return (
    <div className="landing">
      <header className="public-nav">
        <Brand />
        <nav>
          <a
            href="#features"
            onClick={(e) => {
              e.preventDefault();
              document
                .getElementById("features")
                .scrollIntoView({ behavior: "smooth" });
            }}
          >
            Why Waypoint
          </a>
          <a
            href="#how"
            onClick={(e) => {
              e.preventDefault();
              document
                .getElementById("how")
                .scrollIntoView({ behavior: "smooth" });
            }}
          >
            How it works
          </a>
          <a href="/login">Log in</a>
          <a className="button primary" href={user ? "/trips" : "/signup"}>
            {user ? "Open workspace" : "Start your journey"}
            <ArrowUpRight size={15} />
          </a>
        </nav>
      </header>
      <section className="landing-hero" ref={sceneRef}>
        <div className="hero-glow" aria-hidden="true" />
        <div className="landing-copy">
          <span
            className="pill reveal"
            style={{ transitionDelay: "0ms" }}
          >
            <span className="online-dot" /> A LITTLE LESS “WHAT NOW?”
          </span>
          <h1 className="reveal" style={{ transitionDelay: "80ms" }}>
            Life happens.
            <br />
            Your journey
            <br />
            <em>still goes on.</em>
          </h1>
          <p className="reveal" style={{ transitionDelay: "160ms" }}>
            A missed connection shouldn’t mean a missed adventure. Connect your
            plans, see what’s affected, and find your way forward—with Waypoint.
          </p>
          <div
            className="button-row reveal"
            style={{ transitionDelay: "240ms" }}
          >
            <a className="button primary" href="/signup">
              Find your way forward <ArrowRight size={17} />
            </a>
            <a className="button" href="/login">
              Explore the demo
            </a>
          </div>
          <div
            className="hero-assurance reveal"
            style={{ transitionDelay: "320ms" }}
          >
            <ShieldCheck size={16} />
            Your whole trip. One thoughtful backup plan.
          </div>
          <div
            className="hero-stats reveal"
            style={{ transitionDelay: "400ms" }}
          >
            <div>
              <b>3×</b>
              <span>touchpoints re-linked</span>
            </div>
            <div>
              <b>1</b>
              <span>calm place to decide</span>
            </div>
            <div>
              <b>0</b>
              <span>adventures abandoned</span>
            </div>
          </div>
        </div>
        <div className="journey-visual">
          <div className="visual-bg">
            <div className="sun-disc layer" />
            <div className="grid-floor layer" aria-hidden="true" />
            <div className="landscape-hill hill-one layer" />
            <div className="landscape-hill hill-two layer" />
          </div>
          <div className="orb orb-a layer" aria-hidden="true" />
          <div className="orb orb-b layer" aria-hidden="true" />
          <div className="journey-caption layer">
            THE ROUTE MAY CHANGE.
            <br />
            THE ADVENTURE DOESN’T HAVE TO.
          </div>
          <div className="floating-route layer" data-tilt>
            <span className="eyebrow">YOUR JOURNEY, RECONNECTED</span>
            <div>
              <span className="route-icon">
                <Plane />
              </span>
              <section>
                <b>Delhi → Jaipur</b>
                <small>Flight delayed by 2 hours</small>
              </section>
              <span className="tag amber">Delayed</span>
            </div>
            <div>
              <span className="route-icon">
                <Train />
              </span>
              <section>
                <b>Backup train secured</b>
                <small>Jaipur Express · departs 15:40</small>
              </section>
              <Check size={18} />
            </div>
            <div>
              <span className="route-icon">
                <Car />
              </span>
              <section>
                <b>A new ride, right on time</b>
                <small>Transfer moved to 12:00</small>
              </section>
              <Check size={18} />
            </div>
            <div>
              <span className="route-icon">
                <Building2 />
              </span>
              <section>
                <b>Your stay is still waiting</b>
                <small>Check-in updated</small>
              </section>
              <Check size={18} />
            </div>
            <div className="route-success">
              <ShieldCheck size={17} /> A way forward, found.
            </div>
          </div>
          <span className="visual-coordinate layer">
            26.9124° N &nbsp; 75.7873° E
          </span>
        </div>
      </section>
      <div className="feature-ribbon" aria-hidden="true">
        <div className="ribbon-track">
          <div>
            <span>FLIGHTS</span>
            <i>✦</i>
            <span>STAYS</span>
            <i>✦</i>
            <span>TRAINS</span>
            <i>✦</i>
            <span>TRANSFERS</span>
            <i>✦</i>
            <span>THE LITTLE THINGS IN BETWEEN</span>
            <i>✦</i>
          </div>
          <div>
            <span>FLIGHTS</span>
            <i>✦</i>
            <span>STAYS</span>
            <i>✦</i>
            <span>TRAINS</span>
            <i>✦</i>
            <span>TRANSFERS</span>
            <i>✦</i>
            <span>THE LITTLE THINGS IN BETWEEN</span>
            <i>✦</i>
          </div>
        </div>
      </div>
      <section className="landing-section" id="features">
        <span className="eyebrow reveal">BUILT FOR THE BIGGER PICTURE</span>
        <h2 className="reveal">
          Your trip is connected.
          <br />
          Your recovery should be, too.
        </h2>
        <div className="feature-grid">
          {[
            [
              GitBranch,
              "See the ripple effect",
              "Understand how one change affects your transfer, your hotel, and everything that follows.",
            ],
            [
              Route,
              "Choose your way forward",
              "Compare feasible alternatives by extra cost, time, convenience, and the plans you get to keep.",
            ],
            [
              ShieldCheck,
              "Stay a step ahead",
              "Spot tight connections before they become a problem. Keep the details and decisions in one place.",
            ],
          ].map(([Icon, title, desc], i) => (
            <article
              key={title}
              data-tilt
              className="reveal"
              style={{ transitionDelay: `${i * 110}ms` }}
            >
              <Icon size={28} />
              <h3>{title}</h3>
              <p>{desc}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="how-section" id="how">
        <div>
          <span className="eyebrow reveal">FROM “OH NO” TO “LET’S GO”</span>
          <h2 className="reveal">
            A calmer way to
            <br />
            change your plans.
          </h2>
          <a className="text-button reveal" href="/signup">
            Create your free local account <ArrowRight size={15} />
          </a>
        </div>
        <ol>
          <li className="reveal">
            <b>01</b>
            <section>
              <h3>Bring your trip together</h3>
              <p>Add bookings, import your itinerary, and connect the dots.</p>
            </section>
          </li>
          <li className="reveal">
            <b>02</b>
            <section>
              <h3>Understand what’s changed</h3>
              <p>
                Report a disruption and see the direct and downstream impact.
              </p>
            </section>
          </li>
          <li className="reveal">
            <b>03</b>
            <section>
              <h3>Pick a plan. Keep exploring.</h3>
              <p>
                Review alternatives, update your itinerary, and get back to your
                trip.
              </p>
            </section>
          </li>
        </ol>
      </section>
      <section className="landing-cta">
        <div className="globe reveal" aria-hidden="true">
          <span className="lat" />
          <Compass size={37} />
        </div>
        <h2 className="reveal">
          Leave room for adventure.
          <br />
          We’ll help with the unexpected.
        </h2>
        <a className="button primary reveal" href="/signup">
          Let’s get you going <ArrowRight size={16} />
        </a>
        <p className="reveal">
          Hackathon edition · Local JSON storage · Simulated supplier
          availability
        </p>
      </section>
      <footer className="public-footer">
        <Brand />
        <span>Intelligent travel resilience. Built around your journey.</span>
        <a href="/login">
          Traveler & admin login <ArrowUpRight size={13} />
        </a>
      </footer>
    </div>
  );
}
export function AuthPage({ mode, onAuth }) {
  const [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const signup = mode === "signup",
    forgot = mode === "forgot",
    reset = mode === "reset",
    verify = mode === "verify";
  const nextPath = new URLSearchParams(location.search).get("next") || "";
  const recoveryLogin = mode === "login" && /^\/build\/[^/]+/.test(nextPath);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const v = fields(e.currentTarget);
      if (reset || verify)
        v.token = new URLSearchParams(location.search).get("token");
      const r = await api("auth/" + mode, v);
      if (signup || mode === "login") {
        const account = await onAuth();
        const next = new URLSearchParams(location.search).get("next");
        go(
          next && next.startsWith("/") && !next.startsWith("//")
            ? next
            : account?.role === "admin"
              ? "admin"
              : "trips",
        );
      } else
        setMessage(
          r.message ||
            (verify
              ? "Email verified. You can continue to your account."
              : "Password updated. You can now log in."),
        );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  if (recoveryLogin) {
    return (
      <div className="recovery-auth">
        <header className="recovery-auth-topbar">
          <Brand />
          <label><Search size={17} /><input aria-label="Search preview" placeholder="Search destinations, hotels, activities…" readOnly /></label>
          <span className="recovery-auth-user"><span>AS</span> Alex Sharma <small>Traveler</small></span>
        </header>
        <div className="recovery-auth-body">
          <nav className="recovery-auth-nav" aria-label="Travel navigation">
            {[LayoutDashboard, CalendarDays, Plane, Sparkles, Ticket, Compass].map((Icon, index) => <span className={index === 3 ? "active" : ""} key={index}><Icon size={19} /></span>)}
          </nav>
          <main className="recovery-auth-content">
            <section className="recovery-auth-preview">
              <div className="recovery-auth-heading"><span className="eyebrow"><Sparkles size={14}/> AI POWERED TRAVEL RECOVERY</span><h1>Let’s get your journey back on track</h1><p>Your recovery chat and live travel options are ready to reopen.</p></div>
              <div className="recovery-auth-chat">
                <div className="recovery-auth-message assistant"><span><Sparkles size={18}/></span><p>Sign in to load your conversation, search progress, and recovery options for this trip.</p></div>
                <div className="recovery-auth-message user"><span>AS</span><p>Your trip conversation will continue from where you left off.</p></div>
              </div>
              <section className="recovery-auth-search"><div><span className="recovery-auth-spinner"><Sparkles size={18}/></span><div><b>Your recovery workspace</b><small>Live results and selected options will appear after sign-in.</small></div></div><div className="recovery-auth-categories">{[[Plane,"Flights"],[Hotel,"Hotels"],[Car,"Transport"],[Building2,"Restaurants"],[Route,"Activities"]].map(([Icon,label])=><div key={label}><Icon size={17}/><b>{label}</b><span>Ready to load</span></div>)}</div></section>
              <div className="recovery-auth-note"><ShieldCheck size={17}/> Your saved trip and choices stay linked to your account.</div>
            </section>
            <aside className="recovery-auth-card">
              <a className="back-link" href="/">← Back to Waypoint</a>
              <form className="auth-form" onSubmit={submit}>
                <span className="eyebrow">CONTINUE YOUR RECOVERY</span><h2>Welcome back.</h2><p>Log in to return to your recovery chat and review your travel options.</p>
                {error && <div className="error" role="alert">{error}</div>}
                <label>Email address<input type="email" name="email" autoComplete="email" required placeholder="you@example.com" /></label>
                <label>Password<input name="password" type="password" minLength={10} maxLength={128} autoComplete="current-password" required placeholder="Your password" /></label>
                <a className="forgot-link" href="/forgot">Forgot password?</a>
                <button className="button primary wide" disabled={busy}>{busy ? "One moment…" : "Log in and continue"}<ArrowRight size={16}/></button>
                { ["127.0.0.1", "localhost", "::1"].includes(location.hostname) && <div className="demo-accounts"><span>TRY THE LOCAL DEMO</span><div><button type="button" onClick={(e) => { const f=e.currentTarget.closest("form"); f.elements.namedItem("email").value="traveler@waypoint.local"; f.elements.namedItem("password").value="TravelDemo123!"; }}>Traveler account</button><button type="button" onClick={(e) => { const f=e.currentTarget.closest("form"); f.elements.namedItem("email").value="admin@waypoint.local"; f.elements.namedItem("password").value="AdminDemo123!"; }}>Admin account</button></div><p>Fills demo credentials. Select Log in to continue.</p></div> }
                <p className="auth-switch">New around here? <a href={`/signup?next=${encodeURIComponent(nextPath)}`}>Create an account</a></p>
                <div className="auth-security"><LockKeyhole size={14}/> Passwords hashed. Trips private to your account.</div>
              </form>
            </aside>
          </main>
        </div>
      </div>
    );
  }
  return (
    <div className="auth-layout">
      <aside>
        <Brand />
        <div>
          <span className="eyebrow">TRAVEL WITH A PLAN B</span>
          <h1>
            Great journeys
            <br />
            aren’t always
            <br />
            <em>straight lines.</em>
          </h1>
          <p>A little confidence for whatever comes next.</p>
          <div className="auth-art">
            <Compass size={180} strokeWidth={0.6} />
          </div>
        </div>
        <span className="auth-foot">
          YOUR TRIP. YOUR CHOICE. YOUR WAY FORWARD.
        </span>
      </aside>
      <main>
        <a className="back-link" href="/">
          ← Back to Waypoint
        </a>
        <form className="auth-form" onSubmit={submit}>
          <span className="eyebrow">
            {signup ? "NICE TO MEET YOU" : "YOUR NEXT CHAPTER STARTS HERE"}
          </span>
          <h2>
            {signup
              ? "Make yourself at home."
              : forgot
                ? "Forgot your password?"
                : reset
                  ? "A fresh start."
                  : verify
                    ? "Verify your email."
                    : "Welcome back."}
          </h2>
          <p>
            {signup
              ? "Create your account and bring your journeys together."
              : forgot
                ? "We’ll create a reset link in the local email outbox."
                : verify
                  ? "Confirm the email verification link you received."
                  : reset
                    ? "Choose a new password of at least 10 characters."
                    : "Your plans, and your backup plans, are right here."}
          </p>
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
          {message ? (
            <div className="success-message" role="status">
              {message}
              <a href="/login">Back to login →</a>
            </div>
          ) : (
            <>
              {signup && (
                <label>
                  Your name
                  <input
                    name="name"
                    autoComplete="name"
                    minLength={2}
                    maxLength={80}
                    required
                    placeholder="Alex Sharma"
                  />
                </label>
              )}
              {!reset && !verify && (
                <label>
                  Email address
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    required
                    placeholder="you@example.com"
                  />
                </label>
              )}
              {!forgot && !verify && (
                <label>
                  Password
                  <input
                    name="password"
                    type="password"
                    minLength={10}
                    maxLength={128}
                    autoComplete={
                      signup || reset ? "new-password" : "current-password"
                    }
                    required
                    placeholder="At least 10 characters"
                  />
                </label>
              )}
              {mode === "login" && (
                <a className="forgot-link" href="/forgot">
                  Forgot password?
                </a>
              )}
              <button className="button primary wide" disabled={busy}>
                {busy
                  ? "One moment…"
                  : signup
                    ? "Create account"
                    : forgot
                      ? "Create reset link"
                      : reset
                        ? "Reset password"
                        : verify
                          ? "Verify email"
                          : "Log in"}
                <ArrowRight size={16} />
              </button>
            </>
          )}
          {mode === "login" &&
            ["127.0.0.1", "localhost", "::1"].includes(location.hostname) && (
              <div className="demo-accounts">
                <span>TRY THE LOCAL DEMO</span>
                <div>
                  <button
                    type="button"
                    onClick={(e) => {
                      const f = e.currentTarget.closest("form");
                      f.elements.namedItem("email").value =
                        "traveler@waypoint.local";
                      f.elements.namedItem("password").value = "TravelDemo123!";
                    }}
                  >
                    Traveler account
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      const f = e.currentTarget.closest("form");
                      f.elements.namedItem("email").value =
                        "admin@waypoint.local";
                      f.elements.namedItem("password").value = "AdminDemo123!";
                    }}
                  >
                    Admin account
                  </button>
                </div>
                <p>Fills demo credentials. Select Log in to continue.</p>
              </div>
            )}
          {(signup || mode === "login") && (
            <p className="auth-switch">
              {signup ? "Already have an account?" : "New around here?"}{" "}
              <a href={signup ? "/login" : "/signup"}>
                {signup ? "Log in" : "Create an account"}
              </a>
            </p>
          )}
          <div className="auth-security">
            <LockKeyhole size={14} />
            Passwords hashed. Trips private to your account.
          </div>
        </form>
      </main>
    </div>
  );
}
