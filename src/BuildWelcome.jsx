import React, { useState } from "react";
import { Plane, Bot, ArrowRight, MapPin, Search, Hotel, CarFront, Utensils, Camera, X } from "lucide-react";
import { destinations, TripPhoto } from "./BuilderVisuals";
import "./build-welcome.css";

const photo = (name) => destinations.find((d) => d.name === name)?.image;
const places = [
  { name: "Jaipur", image: photo("Jaipur") },
  { name: "Mumbai", image: photo("Mumbai") },
  { name: "Delhi", image: photo("Delhi") },
  { name: "Goa", image: photo("Goa") },
  { name: "Bangalore", city: "Bengaluru", image: "/images/build-welcome/bangalore.jpg" },
  { name: "Udaipur", image: "/images/build-welcome/udaipur-lake.jpg" },
  { name: "Manali", image: "/images/build-welcome/manali.jpg", soon: true },
  { name: "Varanasi", image: "/images/build-welcome/varanasi-ghats.jpg" },
  { name: "Agra", image: photo("Agra") },
];
const information = {
  "How It Works": "Choose Build My Trip to enter your route, dates, and budget. Explore flights, hotels, transport, restaurants, and activities as the demo searches finish. Select your favourites, review the itinerary and cost, then confirm your plan.",
  Pricing: "Try the trip builder with simulated prices. Your estimated total updates as you select options. This local demo does not take payments or make real reservations.",
  About: "Waypoint brings trip planning and disruption recovery into one travel workspace. Build your journey yourself, or describe a change of plans to the automated recovery assistant. All provider searches and bookings in this demo are simulated.",
  Manali: "Manali is here for inspiration. Searchable demo options for this destination are coming later. You can start planning with Jaipur, Mumbai, Delhi, Goa, Bengaluru, Udaipur, Varanasi, or Agra today.",
};
export function BuildWelcome() {
  const [all, setAll] = useState(false);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [info, setInfo] = useState("");
  const shown = places.filter((place) => place.name.toLowerCase().includes(query.toLowerCase())).slice(0, all || query ? places.length : 8);
  return <div className="build-welcome">
    <section className="welcome-hero" aria-labelledby="welcome-title">
      <div className="welcome-route" aria-hidden="true"><svg viewBox="0 0 500 270" preserveAspectRatio="none"><path d="M 35 255 C 80 20, 330 -20, 440 105" fill="none" stroke="white" strokeWidth="4" strokeDasharray="9 9" /></svg><span className="route-mumbai"><MapPin size={22} fill="#0862ff" color="#0862ff" /><b>Mumbai</b></span><span className="route-jaipur"><MapPin size={22} fill="#ff3735" color="#ff3735" /><b>Jaipur</b></span></div>
      <div className="welcome-copy"><p className="welcome-eyebrow">TRAVEL DISRUPTION RECOVERY ENGINE</p><h1 id="welcome-title">Your Journey.<br /><span>Recovered.</span></h1><p className="welcome-description">Plan, recover and rebuild your entire trip in one place.<br className="welcome-desktop-break" /> Flights, hotels, transport, activities, restaurants and more —<br className="welcome-desktop-break" /> so you can keep exploring, no matter what happens.</p>
        <div className="welcome-choices">
          <article className="welcome-choice manual"><span className="welcome-choice-icon"><Plane size={25} fill="currentColor" strokeWidth={1.5} /></span><div className="welcome-choice-content"><span className="welcome-choice-kicker">YOUR WAY, YOUR PACE</span><h2>Build My Trip</h2><p>Choose flights, stays and experiences.</p><a href="/build?mode=manual">Plan your trip <ArrowRight size={16} /></a></div></article>
          <article className="welcome-choice automated"><span className="welcome-choice-icon"><Bot size={25} strokeWidth={2.1} /></span><div className="welcome-choice-content"><span className="welcome-choice-kicker">WHEN PLANS CHANGE</span><h2>Automated Recovery <span>(AI)</span></h2><p>Tell us what happened. We’ll find a way forward.</p><a href="/build?mode=auto">Explore recovery <ArrowRight size={16} /></a></div></article>
        </div>
        <div className="welcome-features" id="welcome-features">{[[Plane, "Flights", "Compare best options"], [Hotel, "Hotels", "Find your stay"], [CarFront, "Transport", "Uber, Ola, Rapido & more"], [Utensils, "Restaurants", "Best food nearby"], [Camera, "Activities", "Parks, tours, sightseeing"]].map(([Icon, title, text], i) => <a key={title} href="/build?mode=manual" className={i > 2 ? "violet" : ""}><span><Icon size={26} strokeWidth={2.5} /></span><div><strong>{title}</strong><small>{text}</small></div></a>)}</div>
      </div>
    </section>
    <section className="welcome-destinations" id="welcome-destinations"><header><h2><MapPin size={25} fill="currentColor" />Popular Destinations</h2><button className="welcome-search-button" aria-label="Search destinations" aria-expanded={searching} onClick={() => { setSearching(!searching); setQuery(""); }}><Search size={19} /></button><button onClick={() => setAll(!all)}>{all ? "Show Less" : "View All"} <ArrowRight size={16} /></button></header>
      {searching && <div className="welcome-destination-search"><Search size={18} /><input autoFocus aria-label="Find a destination" placeholder="Where would you like to go?" value={query} onChange={(e) => setQuery(e.target.value)} /><button aria-label="Close destination search" onClick={() => { setSearching(false); setQuery(""); }}><X size={17} /></button></div>}
      <div className="welcome-destination-grid">{shown.map((place) => { const content = <><TripPhoto src={place.image} alt={place.name} /><strong>{place.name}</strong></>; return place.soon ? <button key={place.name} className="welcome-destination" onClick={() => setInfo(place.name)}>{content}</button> : <a className="welcome-destination" key={place.name} href={`/build?mode=manual&destination=${encodeURIComponent(place.city || place.name)}`}>{content}</a>; })}</div>{!shown.length && <p className="welcome-no-results">No destinations match “{query}”. Try Jaipur, Goa, or Delhi.</p>}
    </section>
    {info && <div className="welcome-dialog-backdrop" onClick={() => setInfo("")}><section className="welcome-dialog" role="dialog" aria-modal="true" aria-labelledby="welcome-dialog-title" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === "Escape") setInfo(""); }}><button autoFocus className="welcome-dialog-close" aria-label="Close information" onClick={() => setInfo("")}><X size={21} /></button><span className="welcome-dialog-icon"><Plane size={28} /></span><h2 id="welcome-dialog-title">{info}</h2><p>{information[info]}</p><a href="/build?mode=manual">Start planning <ArrowRight size={17} /></a></section></div>}
  </div>;
}
