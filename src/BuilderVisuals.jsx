import React from "react";
import { ArrowRight, Check, MapPin, Plane, Sparkles, Wallet, ShieldCheck, Compass } from "lucide-react";

// Locally bundled Unsplash photographs are illustrative demo imagery.
const photo = (id) => `/images/trip-builder/${id}.jpg`;
export const destinations = [
  { name: "Jaipur", tag: "THE PINK CITY", image: photo("photo-1599661046827-dacff0c0f09a"), description: "Royal palaces, colourful bazaars, and a little magic around every corner." },
  { name: "Delhi", tag: "OLD MEETS NEW", image: photo("photo-1587474260584-136574528ed5") },
  { name: "Goa", tag: "SLOW DOWN, SEASIDE", image: photo("photo-1512343879784-a960bf40e7f2") },
  { name: "Udaipur", tag: "THE CITY OF LAKES", image: photo("photo-1595658658481-d53d3f999875") },
  { name: "Mumbai", tag: "THE CITY THAT MOVES", image: photo("photo-1570168007204-dfb528c6958f") },
  { name: "Agra", tag: "A TIMELESS WONDER", image: photo("photo-1564507592333-c60657eea523") },
];
export const destinationPhotos = {
  ...Object.fromEntries(destinations.map((place) => [place.name, place.image])),
  Bangalore: "/images/build-welcome/bangalore.jpg",
  Bengaluru: "/images/build-welcome/bangalore.jpg",
  Varanasi: "/images/build-welcome/varanasi-ghats.jpg",
};
export const destinationPhoto = (city) => destinationPhotos[city] || destinations[0].image;
export const categoryPhotos = {
  hotels: photo("photo-1566073771259-6a8506099945"),
  restaurants: photo("photo-1546833999-b9f581a1996d"),
  transfers: photo("photo-1449965408869-eaa3f722e40d"),
  flights: photo("photo-1436491865332-7a61a109cc05"),
  activities: destinations[0].image,
};
export function TripPhoto({ src, alt, className = "", ...props }) {
  return <img className={className} src={src} alt={alt} loading="lazy" onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} {...props} />;
}
export function BuilderSteps({ step = 0 }) {
  return <ol className="trip-steps" aria-label="Trip progress">{["Trip details", "Find your favourites", "Review & confirm"].map((label, i) => <li key={label} className={i === step ? "active" : i < step ? "complete" : ""}><span>{i < step ? <Check size={13} /> : `0${i + 1}`}</span>{label}{i < 2 && <ArrowRight size={14} />}</li>)}</ol>;
}
export function DestinationAside({ city = "Jaipur", onRecovery }) {
  const place = destinations.find((d) => d.name === city) || { ...destinations[0], name: city, tag: "YOUR NEXT CHAPTER", description: "Discover local favourites and make room for something unexpected." };
  return <aside className="destination-aside">
    <div className="destination-feature"><TripPhoto src={place.image} alt={`${place.name} travel inspiration`} /><span className="photo-label">A LITTLE INSPIRATION</span><div><small>{place.tag}</small><h2><MapPin size={22} /> {place.name}</h2><p>{place.description || "Beautiful places. Local flavours. A journey to make your own."}</p></div></div>
    <div className="planning-perks"><h3>A great trip starts here.</h3>{[[Compass, "More possibilities", "Flights, stays, food and experiences, together."], [ShieldCheck, "Your trip, your choices", "Pick your favourites. Change anything."], [Wallet, "Keep your budget happy", "See your total update as you build."]].map(([Icon, title, text], i) => <div key={title}><span className={`perk-icon tone-${i}`}><Icon size={20} /></span><section><strong>{title}</strong><p>{text}</p></section></div>)}</div>
    {onRecovery && <div className="recovery-tip"><Sparkles size={22} /><h3>Plans took a detour?</h3><p>Tell us what happened. We’ll help you find a new way forward.</p><button type="button" onClick={onRecovery}>Try automated recovery <ArrowRight size={15} /></button></div>}
  </aside>;
}
export function BuildProgress({ build }) {
  const jobs = Object.values(build.jobs).filter((job) => job.label);
  const done = jobs.filter((job) => job.state === "COMPLETED").length;
  const progress = jobs.length ? Math.round(jobs.reduce((sum, job) => sum + (job.state === "COMPLETED" ? 1 : Math.min(.95, (job.revealed || 0) / Math.max(1, job.total || 1))), 0) / jobs.length * 100) : 0;
  return <section className="visual-progress card" aria-live="polite"><div><span className="progress-plane"><Plane size={24} /></span><section><h2>{done === jobs.length && jobs.length ? "Your next adventure is taking shape." : "Finding the little things that make a great trip…"}</h2><p>Searching the demo catalogue · Options appear as categories finish.</p></section><strong>{progress}%</strong></div><div className="trip-progress-track"><span style={{ width: `${progress}%` }} /></div><div className="progress-stations">{jobs.map((job, i) => <span key={i} className={job.state === "COMPLETED" ? "done" : ""}>{job.state === "COMPLETED" ? <Check size={14} /> : <span className="station-dot" />}{job.label}<small>{job.state === "COMPLETED" ? `${job.total} found` : job.state === "QUEUED" ? "Up next" : "Searching…"}</small></span>)}</div></section>;
}
