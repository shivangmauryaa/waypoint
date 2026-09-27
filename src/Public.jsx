import React, { useState, useEffect } from "react";
import {
  Navigation,
  ArrowRight,
  Plane,
  Train,
  Hotel,
  CarFront,
  Ticket,
  ChevronRight,
  Check,
  AlertTriangle,
  Play,
  X,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle,
  Radio,
  Route,
  Sliders,
  ShieldCheck,
  Layers,
  UserCheck,
  GitBranch,
  Sparkles,
  Zap,
  Star,
  Globe,
  Clock,
  DollarSign,
  Briefcase,
  Users,
  Compass,
} from "lucide-react";
import { api, go, fields } from "./api";
import heroBg from "./hero-travel.jpg";
import "./public-redesign.css";

export function Brand() {
  return (
    <a href="/" className="st-brand-logo" aria-label="Waypoint Home">
      <Navigation size={22} fill="#0066ff" color="#0066ff" style={{ transform: "rotate(-45deg)" }} />
      <span>WAYPOINT</span>
    </a>
  );
}

export function Landing({ user }) {
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [activeSimNode, setActiveSimNode] = useState(1);

  const demoSequence = [
    { title: "AIRPORT RADAR", text: "ADS-B trajectory flags 2h 15m gate delay at Mumbai T2 terminal.", img: "/assets/travel/airport-login.jpg" },
    { title: "FLIGHT MONITORING", text: "Simulating downstream impact across connecting rail & hotel legs.", img: "/assets/travel/hero-plane.jpg" },
    { title: "RAIL SYNCHRONIZATION", text: "Jaipur Express rail transfer automatically rescheduled to 14:30.", img: "/assets/travel/travel-train.jpg" },
    { title: "CAB DISPATCH", text: "Driver notification sent for 15:00 pickup at station arrival.", img: "/assets/travel/hero-cab.jpg" },
    { title: "HOTEL CONCIERGE", text: "Late check-in window confirmed at Palace Resort.", img: "/assets/travel/travel-hotel.jpg" },
    { title: "RECOVERY COMPLETE", text: "94% of original itinerary preserved without manual call queues.", img: heroBg }
  ];

  useEffect(() => {
    let timer;
    if (showDemoModal) {
      timer = setInterval(() => {
        setDemoStep((prev) => (prev + 1) % demoSequence.length);
      }, 2500);
    }
    return () => clearInterval(timer);
  }, [showDemoModal]);

  const handleSelectPlan = (planName) => {
    setSelectedPlan(planName);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 4000);
  };

  return (
    <div style={{ width: "100%", overflowX: "hidden" }}>
      {/* Header */}
      <header className="st-hero-header">
        <div className="st-header-content">
          <Brand />

          <nav className="st-nav-menu">
            <a href="#features" className="st-nav-item">Features</a>
            <a href="#how-it-works" className="st-nav-item">How it works</a>
            <a href="#for-travelers" className="st-nav-item">For Travelers</a>
            <a href="#pricing" className="st-nav-item">Pricing</a>
          </nav>

          <div className="st-auth-actions">
            <a href="/login" className="st-btn-login">Login</a>
            <a href={user ? "/trips" : "/signup"} className="st-btn-get-started">
              {user ? "Open Workspace" : "Get Started →"}
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section (Cleanly Contained in Viewport) */}
      <section className="st-exact-hero">
        <img
          src={heroBg}
          alt="Waypoint Scenic Travel Background"
          className="st-hero-background"
        />

        {/* Hero Stage Content */}
        <div className="st-hero-stage">
          <div>
            <span className="st-tag-line">TRAVEL RESILIENCE ENGINE</span>

            <h1 className="st-main-h1">
              Your Trip
              <br />
              Always Finds
              <br />
              a <span className="st-blue-text">Way.</span>
            </h1>

            <p className="st-main-subtext">
              When plans change, Waypoint recalculates your journey — finding smarter alternatives across flights, trains, hotels, cabs and activities.
            </p>

            <div className="st-hero-cta-group">
              <a href={user ? "/trips" : "/signup"} className="st-btn-get-started" style={{ padding: "14px 32px", fontSize: 16 }}>
                Get Started →
              </a>

              <button
                type="button"
                className="st-btn-watch-demo"
                onClick={() => {
                  setDemoStep(0);
                  setShowDemoModal(true);
                }}
              >
                <div className="st-play-icon-blue">
                  <Play size={12} fill="#ffffff" color="#ffffff" style={{ marginLeft: 2 }} />
                </div>
                <span>Watch Demo</span>
              </button>
            </div>
          </div>

          {/* Right Disruption Card */}
          <div style={{ position: "relative" }}>
            <div className="st-disruption-matrix-card">
              <div className="st-dm-header">
                <div className="st-dm-left">
                  <div className="st-dm-flight-icon">
                    <Plane size={20} color="#ef4444" />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#1e293b", letterSpacing: "0.04em", textTransform: "uppercase" }}>FLIGHT DELAYED</div>
                    <div style={{ fontSize: 13, color: "#64748b" }}>Mumbai → Delhi</div>
                  </div>
                </div>

                <div className="st-dm-delay-tag">
                  +3h 15m
                </div>
              </div>

              <div className="st-dm-chain-list">
                <div className="st-dm-chain-item">
                  <Train size={18} color="#f59e0b" />
                  <span>Train connection at risk</span>
                </div>
                <div className="st-dm-chain-item">
                  <Hotel size={18} color="#8b5cf6" />
                  <span>Hotel check-in affected</span>
                </div>
                <div className="st-dm-chain-item">
                  <Ticket size={18} color="#ec4899" />
                  <span>Activity timing affected</span>
                </div>
              </div>

              <a href="#interactive-recovery" className="st-dm-footer-cta">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div className="st-check-green">✓</div>
                  <span>Waypoint found alternatives</span>
                </div>
                <ChevronRight size={18} color="#64748b" />
              </a>
            </div>
          </div>
        </div>

        {/* Spatial Pins */}
        <div className="st-node-pin" style={{ top: "28%", left: "45%" }}>
          <div className="st-pin-dot" /> <span>Flight</span>
        </div>
        <div className="st-node-pin" style={{ top: "45%", left: "54%" }}>
          <div className="st-pin-dot" /> <span>Train</span>
        </div>
        <div className="st-node-pin" style={{ top: "48%", right: "14%" }}>
          <div className="st-pin-dot" /> <span>Hotel</span>
        </div>
        <div className="st-node-pin" style={{ top: "68%", right: "32%" }}>
          <div className="st-pin-dot" /> <span>Cab</span>
        </div>
      </section>

      {/* SECTION 1: Clean Dedicated Modality Bar Section */}
      <section className="st-modality-section">
        <div className="st-modality-container">
          <div className="st-modality-card">
            <div className="st-modality-icon-wrapper"><Plane size={22} /></div>
            <div>
              <strong style={{ fontSize: 15, display: "block", color: "#0f172a" }}>Flights</strong>
              <span style={{ fontSize: 12, color: "#64748b" }}>180k+ global routes</span>
            </div>
          </div>

          <div className="st-modality-card">
            <div className="st-modality-icon-wrapper"><Train size={22} /></div>
            <div>
              <strong style={{ fontSize: 15, display: "block", color: "#0f172a" }}>Trains</strong>
              <span style={{ fontSize: 12, color: "#64748b" }}>High-speed networks</span>
            </div>
          </div>

          <div className="st-modality-card">
            <div className="st-modality-icon-wrapper"><Hotel size={22} /></div>
            <div>
              <strong style={{ fontSize: 15, display: "block", color: "#0f172a" }}>Hotels</strong>
              <span style={{ fontSize: 12, color: "#64748b" }}>Late check-in holds</span>
            </div>
          </div>

          <div className="st-modality-card">
            <div className="st-modality-icon-wrapper"><CarFront size={22} /></div>
            <div>
              <strong style={{ fontSize: 15, display: "block", color: "#0f172a" }}>Cabs</strong>
              <span style={{ fontSize: 12, color: "#64748b" }}>Automated drivers</span>
            </div>
          </div>

          <div className="st-modality-card">
            <div className="st-modality-icon-wrapper"><Ticket size={22} /></div>
            <div>
              <strong style={{ fontSize: 15, display: "block", color: "#0f172a" }}>Activities</strong>
              <span style={{ fontSize: 12, color: "#64748b" }}>Rescheduled passes</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: Interactive Dependency Cascade Simulator */}
      <section className="st-section" style={{ background: "#f8fafc" }}>
        <div className="st-section-inner">
          <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 48px" }}>
            <span className="st-eyebrow-pill">DISRUPTION GRAPH SIMULATION</span>
            <h2 className="st-heading-lg">Travel isn't one booking. It's a chain.</h2>
            <p className="st-subheading" style={{ margin: "0 auto" }}>
              When one segment shifts, downstream bookings shatter silently. Waypoint maps every connection into an intelligent live graph.
            </p>
          </div>

          <div style={{ background: "#ffffff", borderRadius: 24, border: "1px solid #e2e8f0", padding: 36, boxShadow: "0 12px 36px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", gap: 16, marginBottom: 32, justifyContent: "center" }}>
              {[1, 2, 3, 4].map((stepNum) => (
                <button
                  key={stepNum}
                  type="button"
                  onClick={() => setActiveSimNode(stepNum)}
                  style={{
                    padding: "10px 20px",
                    borderRadius: 9999,
                    border: "none",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                    background: activeSimNode === stepNum ? "#0066ff" : "#f1f5f9",
                    color: activeSimNode === stepNum ? "#ffffff" : "#475569",
                    transition: "all 0.2s ease"
                  }}
                >
                  Step 0{stepNum}: {stepNum === 1 ? "Disruption Ingest" : stepNum === 2 ? "Blast Radius Audit" : stepNum === 3 ? "Multimodal Reroute" : "1-Tap Recovery"}
                </button>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, alignItems: "center" }}>
              <div>
                <span style={{ fontSize: 12, fontWeight: 800, color: "#0066ff", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  PHASE {activeSimNode} SIMULATION
                </span>
                <h3 style={{ fontSize: 28, fontWeight: 800, margin: "12px 0 16px", color: "#0f172a" }}>
                  {activeSimNode === 1 && "ADS-B Radar Flags Flight AI-102 (+2h 15m)"}
                  {activeSimNode === 2 && "Blast Radius Calculations Identifies 3 Affected Bookings"}
                  {activeSimNode === 3 && "Synthesizing High-Speed Rail & Hotel Hold Options"}
                  {activeSimNode === 4 && "All Passes Updated & Drivers Dispatched Instantly"}
                </h3>
                <p style={{ fontSize: 16, color: "#475569", lineHeight: 1.6 }}>
                  {activeSimNode === 1 && "Waypoint's global radar ingests telemetry 45 minutes before airport terminal announcements, catching cascading delays at the root source."}
                  {activeSimNode === 2 && "Our graph engine computes connection buffer windows for train transfers, hotel check-in deadlines, and activity voucher expiry times."}
                  {activeSimNode === 3 && "Multi-carrier optimization engine evaluates high-speed rail, regional cabs, and alternative flights to construct 3 scored recovery itineraries."}
                  {activeSimNode === 4 && "With one tap, digital boarding passes update in Apple Wallet, hotel receptionists receive late arrival holds, and cabs reschedule automatically."}
                </p>
              </div>

              <div style={{ background: "#0f172a", borderRadius: 20, padding: 28, color: "#ffffff" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, borderBottom: "1px solid #334155", paddingBottom: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#38bdf8", letterSpacing: "0.08em" }}>LIVE GRAPH MONITOR</span>
                  <span style={{ fontSize: 11, fontWeight: 700, background: "#0284c7", padding: "2px 8px", borderRadius: 4 }}>LATENCY: 0.84s</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 12, borderRadius: 10, background: activeSimNode >= 1 ? "rgba(239, 68, 68, 0.2)" : "#1e293b", border: activeSimNode >= 1 ? "1px solid #ef4444" : "1px solid #334155" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}><Plane size={18} color="#ef4444" /> Flight BOM → DEL</span>
                    <strong style={{ color: "#ef4444", fontSize: 13 }}>Delayed +2h 15m</strong>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 12, borderRadius: 10, background: activeSimNode >= 2 ? "rgba(245, 158, 11, 0.2)" : "#1e293b", border: activeSimNode >= 2 ? "1px solid #f59e0b" : "1px solid #334155" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}><Train size={18} color="#f59e0b" /> Jaipur Rail Express</span>
                    <strong style={{ color: activeSimNode >= 3 ? "#10b981" : "#f59e0b", fontSize: 13 }}>{activeSimNode >= 3 ? "Rescheduled to 14:30 ✓" : "At Risk"}</strong>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 12, borderRadius: 10, background: activeSimNode >= 3 ? "rgba(16, 185, 129, 0.2)" : "#1e293b", border: activeSimNode >= 3 ? "1px solid #10b981" : "1px solid #334155" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}><Hotel size={18} color="#8b5cf6" /> Palace Resort Check-In</span>
                    <strong style={{ color: "#10b981", fontSize: 13 }}>{activeSimNode >= 3 ? "Late Hold Confirmed ✓" : "Pending"}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: The 6 Core Engineering Pillars (Bento Grid) */}
      <section className="st-section" id="features">
        <div className="st-section-inner">
          <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto" }}>
            <span className="st-eyebrow-pill">OUR CORE ENGINE</span>
            <h2 className="st-heading-lg">One Disruption. A Complete Recovery.</h2>
            <p className="st-subheading" style={{ margin: "0 auto" }}>
              Waypoint connects your travel ecosystem into an active, protective layer that handles complications before they disrupt your life.
            </p>
          </div>

          <div className="st-bento-grid">
            <div className="st-bento-item">
              <div className="st-bento-icon-badge"><Radio size={24} /></div>
              <h3 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 10px", color: "#0f172a" }}>Real-Time ADS-B Radar</h3>
              <p style={{ fontSize: 14, color: "#475569", margin: 0, lineHeight: 1.6 }}>Detect flight delays and rail holds up to 45 minutes before public airport board updates.</p>
            </div>

            <div className="st-bento-item">
              <div className="st-bento-icon-badge"><GitBranch size={24} /></div>
              <h3 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 10px", color: "#0f172a" }}>Dependency Graph Audit</h3>
              <p style={{ fontSize: 14, color: "#475569", margin: 0, lineHeight: 1.6 }}>Maps how every delay impacts hotel check-in cutoffs, activity vouchers, and ground cabs.</p>
            </div>

            <div className="st-bento-item">
              <div className="st-bento-icon-badge"><Sliders size={24} /></div>
              <h3 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 10px", color: "#0f172a" }}>Synthetic Rerouting</h3>
              <p style={{ fontSize: 14, color: "#475569", margin: 0, lineHeight: 1.6 }}>Combines multi-modal options: pairing high-speed rail with alternate flight hubs for fast recovery.</p>
            </div>

            <div className="st-bento-item">
              <div className="st-bento-icon-badge"><ShieldCheck size={24} /></div>
              <h3 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 10px", color: "#0f172a" }}>DGCA / EU261 Claims</h3>
              <p style={{ fontSize: 14, color: "#475569", margin: 0, lineHeight: 1.6 }}>Automatically calculates statutory refund entitlements and files compensation paperwork on your behalf.</p>
            </div>

            <div className="st-bento-item">
              <div className="st-bento-icon-badge"><Layers size={24} /></div>
              <h3 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 10px", color: "#0f172a" }}>Zero-Friction Rebooking</h3>
              <p style={{ fontSize: 14, color: "#475569", margin: 0, lineHeight: 1.6 }}>Approved changes automatically inform hotel concierges and update private car driver pickups.</p>
            </div>

            <div className="st-bento-item">
              <div className="st-bento-icon-badge" style={{ background: "#dcfce7", color: "#16a34a" }}><UserCheck size={24} /></div>
              <h3 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 10px", color: "#0f172a" }}>Traveler Sovereignty</h3>
              <p style={{ fontSize: 14, color: "#475569", margin: 0, lineHeight: 1.6 }}>Waypoint recommends options. You review timing & costs. You approve with a single transparent tap.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: Interactive Scored Recovery Plan Showcase */}
      <section id="interactive-recovery" className="st-section" style={{ background: "#f8fafc" }}>
        <div className="st-section-inner">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 48, flexWrap: "wrap", gap: 24 }}>
            <div>
              <span className="st-eyebrow-pill">INTELLIGENT DISPATCH</span>
              <h2 className="st-heading-lg" style={{ margin: "8px 0 0" }}>Instant Recovery Options Tailored To You</h2>
            </div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 9999, background: "#e0f2fe", fontSize: 14, color: "#0369a1", fontWeight: 700 }}>
              <Zap size={18} color="#0066ff" />
              <span>Recalculated in <strong>0.84 seconds</strong> across 14 transport providers</span>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 28 }}>
            {/* Plan A */}
            <div style={{ borderRadius: 24, background: "#ffffff", padding: 32, boxShadow: "0 10px 30px rgba(0,0,0,0.05)", border: "2px solid #0066ff", position: "relative" }}>
              <div style={{ position: "absolute", top: -14, left: 24, padding: "4px 14px", borderRadius: 9999, background: "#0066ff", color: "#ffffff", fontSize: 11, fontWeight: 800, textTransform: "uppercase" }}>
                ★ Recommended Match
              </div>
              <h3 style={{ fontSize: 22, fontWeight: 800, margin: "12px 0 8px", color: "#0f172a" }}>Plan A — Smart Shift</h3>
              <p style={{ fontSize: 14, color: "#475569", marginBottom: 20 }}>Keep original flight. Automatically reschedule arrival cab to 13:45 and alert hotel reception for late check-in.</p>
              <button type="button" className="st-btn-get-started" style={{ width: "100%", justifyContent: "center", padding: 12 }} onClick={() => handleSelectPlan("Plan A — Smart Shift")}>
                Select Plan A ✓
              </button>
            </div>

            {/* Plan B */}
            <div style={{ borderRadius: 24, background: "#ffffff", padding: 32, boxShadow: "0 10px 30px rgba(0,0,0,0.05)", border: "1px solid #e2e8f0" }}>
              <h3 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 8px", color: "#0f172a" }}>Plan B — Rail Bypass</h3>
              <p style={{ fontSize: 14, color: "#475569", marginBottom: 20 }}>Cancel delayed leg for a full airline refund. Catch 11:15 High-Speed Rail Express arriving directly city center.</p>
              <button type="button" className="st-btn-login" style={{ width: "100%", textAlign: "center", display: "block", padding: 12 }} onClick={() => handleSelectPlan("Plan B — Rail Bypass")}>
                Select Plan B →
              </button>
            </div>

            {/* Plan C */}
            <div style={{ borderRadius: 24, background: "#ffffff", padding: 32, boxShadow: "0 10px 30px rgba(0,0,0,0.05)", border: "1px solid #e2e8f0" }}>
              <h3 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 8px", color: "#0f172a" }}>Plan C — Resequence</h3>
              <p style={{ fontSize: 14, color: "#475569", marginBottom: 20 }}>Board later flight. Move your evening culinary reservation to tomorrow night and take express priority lounge rest.</p>
              <button type="button" className="st-btn-login" style={{ width: "100%", textAlign: "center", display: "block", padding: 12 }} onClick={() => handleSelectPlan("Plan C — Resequence")}>
                Select Plan C →
              </button>
            </div>
          </div>

          {showToast && (
            <div style={{ marginTop: 24, padding: 18, borderRadius: 16, background: "#0f172a", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <CheckCircle size={22} color="#10b981" />
                <div>
                  <strong style={{ fontSize: 15 }}>{selectedPlan} Confirmed</strong>
                  <div style={{ fontSize: 13, color: "#94a3b8" }}>Propagating updates across all connected itinerary APIs...</div>
                </div>
              </div>
              <button type="button" style={{ background: "transparent", border: "none", color: "#ffffff", cursor: "pointer" }} onClick={() => setShowToast(false)}>
                <X size={18} />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* SECTION 5: Trust Metrics Counter */}
      <section className="st-metrics-strip">
        <div className="st-section-inner">
          <div className="st-metrics-grid">
            <div>
              <div className="st-metric-number">180,000+</div>
              <div className="st-metric-label">Flights & Rail Legs Monitored Daily</div>
            </div>
            <div>
              <div className="st-metric-number">&lt; 1.2s</div>
              <div className="st-metric-label">Average Recalculation Speed</div>
            </div>
            <div>
              <div className="st-metric-number">99.4%</div>
              <div className="st-metric-label">Itinerary Preservation Rate</div>
            </div>
            <div>
              <div className="st-metric-number">$420</div>
              <div className="st-metric-label">Average Saved per Disrupted Trip</div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6: Use Cases */}
      <section className="st-section" id="for-travelers">
        <div className="st-section-inner">
          <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto" }}>
            <span className="st-eyebrow-pill">DESIGNED FOR HUMANS IN MOTION</span>
            <h2 className="st-heading-lg">Not Just Trips. Stronger Journeys.</h2>
            <p className="st-subheading" style={{ margin: "0 auto" }}>
              Built for every high-stakes voyage — from critical executive summits to once-in-a-lifetime family explorations.
            </p>
          </div>

          <div className="st-use-case-grid">
            <div className="st-use-case-card">
              <img src="/assets/travel/airport-login.jpg" alt="Executive traveler" className="st-use-case-img" />
              <div className="st-use-case-body">
                <span style={{ fontSize: 12, fontWeight: 800, color: "#0066ff", textTransform: "uppercase" }}>EXECUTIVE & CORPORATE</span>
                <h3 style={{ fontSize: 20, fontWeight: 800, margin: "8px 0 10px", color: "#0f172a" }}>Stay on Schedule, Always.</h3>
                <p style={{ fontSize: 14, color: "#475569", margin: 0, lineHeight: 1.6 }}>Missing a keynote or board meeting is unacceptable. Waypoint provides automated backup routes 2 hours before gate closure.</p>
              </div>
            </div>

            <div className="st-use-case-card">
              <img src="/assets/travel/travel-train.jpg" alt="Family Vacation" className="st-use-case-img" />
              <div className="st-use-case-body">
                <span style={{ fontSize: 12, fontWeight: 800, color: "#0066ff", textTransform: "uppercase" }}>FAMILY EXPEDITIONS</span>
                <h3 style={{ fontSize: 20, fontWeight: 800, margin: "8px 0 10px", color: "#0f172a" }}>Keep Your Plans Seamless.</h3>
                <p style={{ fontSize: 14, color: "#475569", margin: 0, lineHeight: 1.6 }}>Traveling with kids and luggage makes stranded connections excruciating. Waypoint handles rerouting without manual call queues.</p>
              </div>
            </div>

            <div className="st-use-case-card">
              <img src="/assets/travel/hero-cab.jpg" alt="Solo Nomad" className="st-use-case-img" />
              <div className="st-use-case-body">
                <span style={{ fontSize: 12, fontWeight: 800, color: "#0066ff", textTransform: "uppercase" }}>SOLO NOMADS</span>
                <h3 style={{ fontSize: 20, fontWeight: 800, margin: "8px 0 10px", color: "#0f172a" }}>Explore Without Worries.</h3>
                <p style={{ fontSize: 14, color: "#475569", margin: 0, lineHeight: 1.6 }}>Roam freely with confidence. When regional rail strikes or weather disruptions hit, receive vetted detours directly on your phone.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 7: Grand Finale CTA Banner */}
      <section className="st-section" id="pricing" style={{ background: "#f8fafc" }}>
        <div className="st-section-inner">
          <div style={{ borderRadius: 32, background: "#0f172a", padding: "64px 48px", color: "#ffffff", position: "relative", overflow: "hidden", textAlign: "center" }}>
            <span className="st-eyebrow-pill" style={{ background: "rgba(255,255,255,0.15)", color: "#38bdf8", marginBottom: 20 }}>
              NEXT-GEN TRANSIT INFRASTRUCTURE
            </span>
            <h2 style={{ fontSize: 48, fontWeight: 800, lineHeight: 1.1, margin: "0 0 16px" }}>
              Travel changes. <span style={{ color: "#38bdf8" }}>Waypoint adapts.</span>
            </h2>
            <p style={{ fontSize: 18, color: "#94a3b8", maxWidth: 560, margin: "0 auto 36px" }}>
              Join thousands of modern global travelers and corporate travel managers who never worry about missed connections again.
            </p>
            <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
              <a href={user ? "/trips" : "/signup"} className="st-btn-get-started" style={{ padding: "14px 32px", fontSize: 16 }}>
                Get Started Now →
              </a>
              <a href="/login" className="st-btn-watch-demo" style={{ background: "rgba(255,255,255,0.1)", color: "#ffffff", border: "1px solid rgba(255,255,255,0.2)" }}>
                Sign In to Account
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Video Demo Modal */}
      {showDemoModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ width: "100%", maxWidth: 840, background: "#ffffff", borderRadius: 24, overflow: "hidden", boxShadow: "0 32px 72px rgba(15, 23, 42, 0.35)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 800, fontSize: 16, color: "#0f172a" }}>
                <Play size={18} fill="#0066ff" color="#0066ff" /> Waypoint Architecture & Rerouting Demo
              </div>
              <button type="button" style={{ background: "#f1f5f9", border: "none", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }} onClick={() => setShowDemoModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div style={{ position: "relative", aspectRatio: "16/9", background: "#0f172a" }}>
              <img src={demoSequence[demoStep].img} alt={demoSequence[demoStep].title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg, rgba(15, 23, 42, 0.9) 0%, transparent 60%)" }} />
              <div style={{ position: "absolute", bottom: 24, left: 24, right: 24, color: "#ffffff" }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", color: "#38bdf8", marginBottom: 6 }}>
                  STAGE {demoStep + 1} OF {demoSequence.length} — {demoSequence[demoStep].title}
                </div>
                <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{demoSequence[demoStep].text}</h3>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer style={{ background: "#ffffff", padding: "48px 32px", borderTop: "1px solid #e2e8f0" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 24 }}>
          <Brand />
          <span style={{ fontSize: 14, color: "#64748b" }}>
            © {new Date().getFullYear()} Waypoint Technologies Inc. All rights reserved.
          </span>
          <a href="/login" style={{ color: "#0066ff", fontWeight: 700, textDecoration: "none" }}>
            Login to workspace →
          </a>
        </div>
      </footer>
    </div>
  );
}

export function AuthPage({ mode, onAuth }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const signup = mode === "signup";

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const v = fields(e.currentTarget);
      if (signup && v.password !== v.confirmPassword) {
        throw new Error("Passwords do not match.");
      }
      const r = await api("auth/" + mode, v);
      if (signup || mode === "login") {
        const account = await onAuth();
        const next = new URLSearchParams(location.search).get("next");
        go(
          next && next.startsWith("/") && !next.startsWith("//")
            ? next
            : account?.role === "admin"
            ? "admin"
            : "trips"
        );
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ width: "100%", minHeight: "100vh", background: "#f8fafc" }}>
      <header className="st-hero-header">
        <div className="st-header-content">
          <Brand />
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 600, color: "#64748b", textDecoration: "none" }}>
            <ArrowLeft size={16} /> Back to home
          </a>
        </div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: "calc(100vh - 80px)", marginTop: 80 }}>
        {/* Left Split Panel */}
        <div style={{ position: "relative", background: "#0f172a", overflow: "hidden", padding: 64, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          <img src="/assets/travel/airport-login.jpg" alt="Airport Sunset" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.85 }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(15, 23, 42, 0.3) 0%, rgba(15, 23, 42, 0.9) 100%)" }} />
          <div style={{ position: "relative", zIndex: 10, color: "#ffffff" }}>
            <span style={{ display: "inline-block", padding: "4px 14px", borderRadius: 9999, background: "rgba(255, 255, 255, 0.2)", backdropFilter: "blur(12px)", fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>
              Live Node Sync
            </span>
            <h2 style={{ fontSize: 44, fontWeight: 800, lineHeight: 1.1, margin: "0 0 16px" }}>
              Different Journeys.<br />Same Destination.
            </h2>
            <p style={{ fontSize: 16, color: "#cbd5e1", lineHeight: 1.6, maxWidth: 420 }}>
              When plans change, Waypoint recalculates your trajectory — instantly harmonizing flights, rail, stays, and transfers.
            </p>
          </div>
        </div>

        {/* Right Form Panel */}
        <div style={{ background: "#ffffff", padding: "64px 80px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ maxWidth: 440, width: "100%", margin: "0 auto" }}>
            <div style={{ marginBottom: 32 }}>
              <h1 style={{ fontSize: 36, fontWeight: 800, color: "#0f172a", margin: "0 0 8px" }}>
                {signup ? "Create Account." : "Welcome Back."}
              </h1>
              <p style={{ fontSize: 15, color: "#64748b", margin: 0 }}>
                {signup ? "Start your resilience journey with Waypoint." : "Continue your journey with Waypoint."}
              </p>
            </div>

            {error && (
              <div style={{ padding: 14, borderRadius: 12, background: "#fef2f2", color: "#ef4444", fontSize: 14, fontWeight: 600, marginBottom: 24 }}>
                {error}
              </div>
            )}

            <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {signup && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label htmlFor="name" style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>Your Name</label>
                  <input id="name" name="name" type="text" required placeholder="Alex Sharma" style={{ height: 48, padding: "0 16px", borderRadius: 12, border: "1px solid #cbd5e1", fontSize: 15, outline: "none" }} />
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label htmlFor="email" style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>Email address</label>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <Mail size={18} color="#64748b" style={{ position: "absolute", left: 14 }} />
                  <input id="email" name="email" type="email" required placeholder="you@example.com" style={{ width: "100%", height: 48, padding: "0 16px 0 44px", borderRadius: 12, border: "1px solid #cbd5e1", fontSize: 15, outline: "none" }} />
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label htmlFor="password" style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>Password</label>
                  {!signup && (
                    <a href="/forgot" style={{ fontSize: 13, fontWeight: 600, color: "#0066ff", textDecoration: "none" }}>
                      Forgot password?
                    </a>
                  )}
                </div>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <Lock size={18} color="#64748b" style={{ position: "absolute", left: 14 }} />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={10}
                    placeholder="Enter your password"
                    style={{ width: "100%", height: 48, padding: "0 44px 0 44px", borderRadius: 12, border: "1px solid #cbd5e1", fontSize: 15, outline: "none" }}
                  />
                  <button type="button" style={{ position: "absolute", right: 14, background: "transparent", border: "none", cursor: "pointer", color: "#64748b" }} onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {signup && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label htmlFor="confirmPassword" style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>Confirm Password</label>
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <Lock size={18} color="#64748b" style={{ position: "absolute", left: 14 }} />
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={10}
                      placeholder="Confirm your password"
                      style={{ width: "100%", height: 48, padding: "0 16px 0 44px", borderRadius: 12, border: "1px solid #cbd5e1", fontSize: 15, outline: "none" }}
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="st-btn-get-started"
                style={{ width: "100%", height: 48, justifyContent: "center", fontSize: 16, marginTop: 8 }}
                disabled={busy}
              >
                {busy ? "Signing in..." : signup ? "Create Account →" : "Login →"}
              </button>
            </form>

            {/* Local Demo Shortcuts */}
            {["127.0.0.1", "localhost", "::1"].includes(location.hostname) && (
              <div style={{ marginTop: 24, padding: 16, borderRadius: 14, background: "#f8fafc", border: "1px dashed #cbd5e1" }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: "#64748b", marginBottom: 10 }}>
                  LOCAL DEMO ACCOUNT SHORTCUTS
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    type="button"
                    className="st-btn-login"
                    style={{ fontSize: 13, padding: "8px 14px" }}
                    onClick={(e) => {
                      const form = e.currentTarget.closest("form") || e.currentTarget.closest("div").previousElementSibling;
                      form.elements.namedItem("email").value = "traveler@waypoint.local";
                      form.elements.namedItem("password").value = "TravelDemo123!";
                    }}
                  >
                    Traveler account
                  </button>
                  <button
                    type="button"
                    className="st-btn-login"
                    style={{ fontSize: 13, padding: "8px 14px" }}
                    onClick={(e) => {
                      const form = e.currentTarget.closest("form") || e.currentTarget.closest("div").previousElementSibling;
                      form.elements.namedItem("email").value = "admin@waypoint.local";
                      form.elements.namedItem("password").value = "AdminDemo123!";
                    }}
                  >
                    Admin account
                  </button>
                </div>
              </div>
            )}

            <div style={{ marginTop: 24, textAlign: "center", fontSize: 14, color: "#64748b" }}>
              {signup ? "Already have an account?" : "New around here?"}{" "}
              <a href={signup ? "/login" : "/signup"} style={{ color: "#0066ff", fontWeight: 700, textDecoration: "none" }}>
                {signup ? "Log in" : "Create an account"}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
