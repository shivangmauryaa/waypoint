import React, { lazy, Suspense, useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, Bell, CarFront, Check, CircleCheck, Eye, EyeOff, GitBranch, Hotel, LockKeyhole, Menu, Plane, Route, ShieldCheck, Sparkles, Train, TriangleAlert, X } from "lucide-react";
import { api, go } from "./api";
import "./celestial-public.css";

const TravelScene = lazy(() => import("./celestial3d/TravelScene").then((module) => ({ default: module.TravelScene })));
const LoginScene = lazy(() => import("./celestial3d/LoginScene").then((module) => ({ default: module.LoginScene })));

const logo = "/images/celestial/logo.png";
const localDemo = ["127.0.0.1", "localhost", "::1"].includes(location.hostname);
const demoTabs = [
  { key: "flight", label: "Flight", Icon: Plane, title: "Flight delayed", detail: "See the impact on transfers and check-in.", option: "Compare another departure" },
  { key: "train", label: "Train", Icon: Train, title: "Rail connection changed", detail: "Review the next leg and your arrival time.", option: "Explore another train" },
  { key: "road", label: "Road", Icon: CarFront, title: "Transfer unavailable", detail: "Keep the rest of your itinerary in place.", option: "Find another ride" },
  { key: "hotel", label: "Hotel", Icon: Hotel, title: "Stay needs attention", detail: "Check policy and nearby alternatives.", option: "Review stay options" },
];

class SceneErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) { console.warn("Waypoint 3D scene unavailable", error); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

function SceneFallback() {
  return <div className="cl-scene-fallback" aria-hidden="true"><span/><Plane size={40} fill="currentColor"/><b>BOM <i/> DEL</b></div>;
}

function useSceneSettings() {
  const [compact,setCompact] = useState(typeof window !== "undefined" && window.innerWidth < 800);
  const [reducedMotion,setReducedMotion] = useState(false);
  useEffect(() => {
    const resize=()=>setCompact(window.innerWidth<800);
    const query=window.matchMedia("(prefers-reduced-motion: reduce)"), update=()=>setReducedMotion(query.matches);
    resize(); update(); window.addEventListener("resize",resize); query.addEventListener?.("change",update);
    return ()=>{window.removeEventListener("resize",resize);query.removeEventListener?.("change",update);};
  },[]);
  return {compact,reducedMotion};
}

function PublicBrand() {
  return <a className="cl-brand" href="/" aria-label="Waypoint home"><img src={logo} alt="" /><span>WAYPOINT<small>TRAVEL RECOVERY</small></span></a>;
}

export function CelestialLanding({ user }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [demoTab, setDemoTab] = useState("flight");
  const flightProgressRef = useRef(0.04);
  const {compact,reducedMotion}=useSceneSettings();
  useEffect(()=>{
    if(reducedMotion){flightProgressRef.current=0.08;return undefined;}
    const started=performance.now(); let frame=0;
    const advance=()=>{flightProgressRef.current=((performance.now()-started)%24000)/24000;frame=requestAnimationFrame(advance);};
    frame=requestAnimationFrame(advance); return ()=>cancelAnimationFrame(frame);
  },[reducedMotion]);
  const selected = demoTabs.find((tab) => tab.key === demoTab) || demoTabs[0];
  const next = user ? "/dashboard" : "/signup";
  return <div className="celestial celestial-landing">
    <header className="cl-nav">
      <div className="cl-shell cl-nav-inner"><PublicBrand />
        <nav className={menuOpen ? "open" : ""} aria-label="Primary navigation">
          <a href="#product" onClick={() => setMenuOpen(false)}>Product</a><a href="#how-it-works" onClick={() => setMenuOpen(false)}>How it works</a><a href="#use-cases" onClick={() => setMenuOpen(false)}>Use cases</a><a href="#demo" onClick={() => setMenuOpen(false)}>Demo</a>
          <a className="cl-mobile-action" href={next}>{user ? "Open dashboard" : "Create account"}</a>
        </nav>
        <div className="cl-nav-actions"><span className="cl-online"><i/> SYSTEM ONLINE</span><a className="cl-nav-demo" href="#demo">Try demo <ArrowUpRight size={14}/></a><a className="cl-nav-login" href={user ? "/dashboard" : "/login"}>{user ? "Dashboard" : "Sign in"}</a><button className="cl-menu" type="button" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={22}/> : <Menu size={22}/>}</button></div>
      </div>
    </header>

    <main>
      <section className="cl-hero" id="product"><div className="cl-hero-bg"/><div className="cl-shell cl-hero-grid">
        <div className="cl-hero-copy"><span className="cl-eyebrow"><span/> INTELLIGENT · TRAVEL · RESILIENCE</span><h1>When plans change,<br/><em>you still move.</em></h1><p>Waypoint connects your bookings, traces the impact of a disruption, and helps you choose a recovery plan across air, rail, road and stays.</p><div className="cl-hero-buttons"><a className="cl-button primary" href={next}>{user ? "Open dashboard" : "Start your journey"}<ArrowRight size={17}/></a><a className="cl-button secondary" href="#how-it-works">See how it works <ArrowUpRight size={16}/></a></div><div className="cl-hero-trust"><ShieldCheck size={16}/> Your trip stays yours. Review every change before applying it.</div></div>
        <div className="cl-hero-visual" aria-label="Animated 3D airplane and travel route"><div className="cl-visual-photo"/><SceneErrorBoundary fallback={<SceneFallback/>}><Suspense fallback={<SceneFallback/>}><TravelScene progressRef={flightProgressRef} active reducedMotion={reducedMotion} compact={compact} parallaxRef={flightProgressRef}/></Suspense></SceneErrorBoundary><div className="cl-floating-alert"><span><TriangleAlert size={18}/></span><div><b>Flight delay detected</b><small>Check what else may be affected</small></div><i>+2h 40m</i></div><div className="cl-city-pin from"><b>BOM</b><small>Mumbai</small></div><div className="cl-city-pin to"><b>DEL</b><small>New Delhi</small></div><div className="cl-recovery-card"><div className="cl-card-top"><span><Sparkles size={17}/> RECOVERY CENTER</span><b>Options ready</b></div><h2>One change. A connected plan.</h2><div className="cl-route-row"><span><Plane size={17}/></span><div><b>Flight</b><small>Original departure delayed</small></div><i className="warning">Review</i></div><div className="cl-route-row"><span><CarFront size={17}/></span><div><b>Airport transfer</b><small>Connection checked against arrival</small></div><i>Checked</i></div><div className="cl-route-row"><span><Hotel size={17}/></span><div><b>Hotel check-in</b><small>Stay kept in your itinerary</small></div><i>Kept</i></div><a href={user ? "/trips" : "/signup"}>Explore recovery <ArrowRight size={15}/></a></div></div>
      </div></section>

      <div className="cl-ticker" aria-label="Supported trip items"><div className="cl-shell">FLIGHTS <span>✦</span> TRAINS <span>✦</span> ROAD TRANSFERS <span>✦</span> STAYS <span>✦</span> EXPERIENCES</div></div>

      <section className="cl-section cl-how" id="how-it-works"><div className="cl-shell"><div className="cl-section-head"><span className="cl-eyebrow">01 / RECOVERY WORKFLOW</span><h2>From disruption to a<br/><em>way forward.</em></h2><p>Waypoint works through your saved itinerary so you can see what changed, what is affected and what can stay.</p></div><div className="cl-steps">{[[Bell,"Tell us what happened","Report a delay, missed connection or a booking you need to change."],[GitBranch,"Understand the impact","See which connections and bookings need attention."],[Route,"Compare options","Review alternative times, estimated costs and refund policies."],[CircleCheck,"Choose your change","Apply the local itinerary update after checking the details."]].map(([Icon,title,body],index)=><article key={title}><span className="cl-step-number">0{index+1}</span><span className="cl-step-icon"><Icon size={23}/></span><h3>{title}</h3><p>{body}</p><small>{index===3?"YOU STAY IN CONTROL":`STEP 0${index+1} OF 04`}</small></article>)}</div></div></section>

      <section className="cl-section cl-use" id="use-cases"><div className="cl-shell cl-use-grid"><div><span className="cl-eyebrow">02 / BUILT FOR THE WHOLE JOURNEY</span><h2>A better view of<br/><em>every connection.</em></h2><p>Flights, transfers, stays and activities live in one trip. When one part changes, Waypoint shows what else deserves a closer look.</p><a className="cl-button primary" href={next}>{user ? "View your trips" : "Create an account"}<ArrowRight size={16}/></a></div><div className="cl-use-art"><img src="/images/celestial/hero-travel.png" alt="Aircraft and train crossing a connected city journey"/></div></div></section>

      <section className="cl-section cl-demo" id="demo"><div className="cl-shell cl-demo-grid"><div><span className="cl-eyebrow">03 / INTERACTIVE PREVIEW</span><h2>See how a change<br/><em>moves through a trip.</em></h2><p>Choose a trip item to preview the kind of detail you can review in your own Recovery Center.</p><div className="cl-demo-tabs" role="tablist" aria-label="Trip item preview">{demoTabs.map(({key,label,Icon})=><button type="button" role="tab" aria-selected={key===demoTab} className={key===demoTab?"selected":""} key={key} onClick={()=>setDemoTab(key)}><Icon size={16}/>{label}</button>)}</div></div><div className="cl-demo-panel"><div className="cl-demo-panel-top"><span><TriangleAlert size={17}/> EXAMPLE SCENARIO</span><span>DEMO PREVIEW</span></div><h3>{selected.title}</h3><p>{selected.detail}</p><div className="cl-demo-line"><div><small>AFFECTED ITEM</small><b>{selected.label} booking</b></div><ArrowRight size={18}/><div><small>NEXT STEP</small><b>{selected.option}</b></div></div><div className="cl-demo-keep"><Check size={16}/> Other bookings are reviewed before any update.</div><a href={user?"/trips":"/signup"}>Try it with your trip <ArrowRight size={16}/></a></div></div></section>

      <section className="cl-final"><div className="cl-shell"><span className="cl-eyebrow">READY WHEN PLANS CHANGE</span><h2>Keep the journey.<br/><em>Choose the way forward.</em></h2><p>Bring your trip together and make a clear decision when the unexpected happens.</p><div><a className="cl-button primary" href={next}>{user?"Open dashboard":"Create your account"}<ArrowRight size={17}/></a><a className="cl-button secondary" href="/login">Sign in</a></div></div></section>
    </main>
    <footer className="cl-footer"><div className="cl-shell"><PublicBrand/><span>© {new Date().getFullYear()} Waypoint · Your journey, with a way forward.</span><a href="/login">Sign in <ArrowRight size={14}/></a></div></footer>
  </div>;
}

export function CelestialAuthPage({ mode, onAuth }) {
  const signup = mode === "signup";
  const progressRef=useRef(0), takeoffRef=useRef({active:false,start:0});
  const {compact,reducedMotion}=useSceneSettings();
  const [name,setName] = useState("");
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [showPassword,setShowPassword] = useState(false);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const nextPath = new URLSearchParams(location.search).get("next") || "";
  const nextQuery = nextPath ? `?next=${encodeURIComponent(nextPath)}` : "";
  const progress = [signup ? name.trim().length >= 2 : true, /\S+@\S+\.\S+/.test(email), password.length >= 10].filter(Boolean).length / 3;
  useEffect(()=>{progressRef.current=progress;},[progress]);
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      await api(`auth/${mode}`, signup ? { name: name.trim(), email: email.trim(), password } : { email: email.trim(), password });
      const account = await onAuth();
      go(nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : account?.role === "admin" ? "admin" : "dashboard");
    } catch (cause) { setError(cause.message || "Please try again."); }
    finally { setBusy(false); }
  };
  return <div className="celestial cl-auth-page"><header className="cl-auth-top"><PublicBrand/><a href="/">← Back to Waypoint</a></header><main className="cl-auth-main"><div className="cl-auth-scene"/><SceneErrorBoundary fallback={<SceneFallback/>}><Suspense fallback={<SceneFallback/>}><LoginScene login={{progressRef,takeoffRef}} reducedMotion={reducedMotion} compact={compact}/></Suspense></SceneErrorBoundary><div className="cl-shell cl-auth-grid"><section className="cl-auth-copy"><span className="cl-eyebrow">WAYPOINT · TRAVEL ACCESS</span><h1>{signup ? <>Start your <em>next journey.</em></> : <>Board the <em>recovery engine.</em></>}</h1><p>{signup ? "Create your Waypoint account to bring your trips, bookings and backup plans together." : "Sign in to see your trips, understand travel changes and decide what happens next."}</p><div className="cl-flight-board"><div><span>BOM<small>MUMBAI</small></span><i/><Plane size={22}/><i/><span>DEL<small>NEW DELHI</small></span></div><footer><span><small>JOURNEY</small>CONNECTED</span><span><small>STATUS</small>READY</span><span><small>CONTROL</small>YOURS</span></footer></div><div className="cl-auth-note"><ShieldCheck size={17}/> Your saved trips stay private to your account.</div></section><section className="cl-pass" aria-label={signup ? "Create account" : "Sign in"}><header><div><span className="cl-eyebrow">PASSENGER ACCESS</span><h2>Boarding pass</h2></div><span className="cl-pass-badge">{signup ? "NEW TRAVELER" : "WELCOME BACK"}</span></header><form onSubmit={submit}><p>{signup ? "A few details and you’re ready to go." : "Your travel workspace is ready when you are."}</p>{signup && <label>Passenger name<input value={name} onChange={(e)=>setName(e.target.value)} name="name" type="text" autoComplete="name" minLength={2} maxLength={80} required placeholder="Alex Sharma"/></label>}<label>Email address<input value={email} onChange={(e)=>setEmail(e.target.value)} name="email" type="email" autoComplete="email" required placeholder="you@example.com"/></label><label>Password<div className="cl-password"><input value={password} onChange={(e)=>setPassword(e.target.value)} name="password" type={showPassword?"text":"password"} autoComplete={signup?"new-password":"current-password"} minLength={10} maxLength={128} required placeholder={signup?"At least 10 characters":"Your password"}/><button type="button" aria-label={showPassword?"Hide password":"Show password"} onClick={()=>setShowPassword(!showPassword)}>{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></label>{!signup && <a className="cl-forgot" href="/forgot">Forgot password?</a>}<div className="cl-perforation" aria-hidden="true"/><div className="cl-barcode" aria-hidden="true">{[2,1,3,1,4,2,1,3,1,2,4,1,2,3,1,4,2,1,3,2,1,4,1,3,2,1,4,2,1,3].map((width,index)=><i key={index} style={{width:`${width}px`}}/>)}</div><div className="cl-progress"><span style={{width:`${progress*100}%`}}/></div><small className="cl-progress-note">{progress===1?"CLEARED TO CONTINUE":"COMPLETE YOUR DETAILS TO CONTINUE"}</small>{error && <p className="cl-auth-error" role="alert">{error}</p>}<button className="cl-button primary cl-submit" disabled={busy}>{busy?"One moment…":signup?"Create account":"Sign in"}<ArrowRight size={17}/></button>{!signup && localDemo && <div className="cl-demo-login"><small>TRY THE LOCAL DEMO</small><div><button type="button" onClick={()=>{setEmail("traveler@waypoint.local");setPassword("TravelDemo123!");setError("")}}>Traveler</button><button type="button" onClick={()=>{setEmail("admin@waypoint.local");setPassword("AdminDemo123!");setError("")}}>Admin</button></div></div>}<div className="cl-auth-switch">{signup?"Already have an account?":"New to Waypoint?"} <a href={(signup?"/login":"/signup")+nextQuery}>{signup?"Sign in":"Create an account"} <ArrowRight size={14}/></a></div></form></section></div></main><footer className="cl-auth-footer"><LockKeyhole size={14}/> Secure access to your Waypoint trips</footer></div>;
}
