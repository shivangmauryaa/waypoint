import { createHash } from "node:crypto";

/* ============================================================
   Simulated provider layer — deterministic (seeded) so the demo
   is reproducible. Every item carries a data-quality badge:
   "live" | "verified" | "estimated" | "simulated".
   ============================================================ */

const seeded = (str) => {
  const h = createHash("sha256").update(String(str)).digest();
  let i = 0;
  const next = () => {
    const v = h.readUInt32BE((i++ * 4) % 28);
    return v / 0x100000000;
  };
  return { next, int: (a, b) => a + Math.floor(next() * (b - a + 1)) };
};
export const deterministic = (str) => seeded(str).int(1, 1e9);

/* ---------- City graph ---------- */
export const CITIES = {
  Mumbai: { lat: 19.07, lng: 72.87, tier: 1 },
  Jaipur: { lat: 26.91, lng: 75.79, tier: 2 },
  Delhi: { lat: 28.61, lng: 77.21, tier: 1 },
  Udaipur: { lat: 24.58, lng: 73.71, tier: 2 },
  Ahmedabad: { lat: 23.02, lng: 72.57, tier: 2 },
  Goa: { lat: 15.3, lng: 74.12, tier: 2 },
  Bengaluru: { lat: 12.97, lng: 77.59, tier: 1 },
  Pune: { lat: 18.52, lng: 73.86, tier: 2 },
};

export function distanceKm(a, b) {
  const A = CITIES[a],
    B = CITIES[b];
  if (!A || !B) return 500;
  const R = 6371,
    dLat = ((B.lat - A.lat) * Math.PI) / 180,
    dLng = ((B.lng - A.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((A.lat * Math.PI) / 180) *
      Math.cos((B.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(s)));
}

/* ---------- Providers ---------- */
const AIRLINES = [
  ["Air India", 1.15, "AI"],
  ["IndiGo", 1.0, "6E"],
  ["Akasa Air", 0.95, "QP"],
  ["Vistara", 1.2, "UK"],
];
const HOTEL_BRANDS = [
  ["Taj", 5, 1.9],
  ["Marriott", 5, 1.6],
  ["Hyatt", 4, 1.45],
  ["Radisson", 4, 1.2],
  ["Holiday Inn", 3, 0.95],
  ["ITC Hotels", 5, 1.75],
  ["Hotel Grand Palace", 3, 0.7],
  ["City Comfort Inn", 2, 0.5],
];
const CABS = [
  ["Uber", 1.0],
  ["Ola", 0.92],
  ["Rapido", 0.78],
  ["Local Taxi", 1.1],
];
const HOTEL_AMENITIES = [
  "Free WiFi",
  "Breakfast",
  "Airport transfer",
  "Pool",
  "Gym",
  "Spa",
  "Room service",
  "Parking",
];
const CUISINES = [
  "Rajasthani",
  "North Indian",
  "South Indian",
  "Chinese",
  "Continental",
  "Street Food",
  "Italian",
  "Mughlai",
];
const REST_NAMES = [
  "Rajasthani House",
  "Spice Junction",
  "The Grand Thali",
  "Curry Leaf Kitchen",
  "Urban Tandoor",
  "Lake View Rooftop",
  "Pyaaz Kachori Co.",
  "Bazaar Kitchen",
  "Cafe Mehfil",
  "Tandoori Nights",
];
const ACTIVITIES = [
  ["Amber Fort", "sightseeing", 900, 180],
  ["City Palace", "sightseeing", 700, 120],
  ["Jantar Mantar", "museum", 300, 90],
  ["Hawa Mahal", "sightseeing", 200, 60],
  ["Water Kingdom", "water park", 1200, 300],
  ["Snow Park", "snow park", 900, 120],
  ["National Park Safari", "nature", 1500, 240],
  ["Bazaar Walking Tour", "walking tour", 500, 150],
  ["Sunset Point", "free", 0, 60],
  ["Nehru Garden", "park", 100, 90],
  ["Museum of Indology", "museum", 350, 90],
  ["Adventure Zipline", "adventure", 1100, 120],
  ["Old City Shopping", "shopping", 0, 150],
  ["Rooftop Nightlife", "nightlife", 800, 180],
];

const H = (x) => Math.round(x).toLocaleString("en-IN");
const mm = (m) => `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;

/* ---------- Transport (flights / trains / buses) ---------- */
export function searchTransport({ from, to, date, kind, budgetPerHead }) {
  if (from === to || !CITIES[from] || !CITIES[to]) return [];
  const km = distanceKm(from, to);
  const out = [];
  const n = { flight: 8, train: 6, bus: 5 }[kind] || 5;
  for (let i = 0; i < n; i++) {
    const s = seeded(`${kind}:${from}:${to}:${date}:${i}`);
    if (kind === "flight") {
      const [name, mult, code] = AIRLINES[s.int(0, AIRLINES.length - 1)];
      const base = 1400 + km * 2.1;
      const price = s.int(8, 16) * 100 + Math.round(base * mult);
      const depH = 6 + s.int(0, 15),
        depM = s.int(0, 11) * 5;
      const dur = 60 + Math.round((km / 750) * 60) + (s.int(0, 1) ? 55 : 0);
      const stops = s.int(0, 1);
      out.push({
        id: `FL-${code}-${i}-${deterministic(kind + from + to + date + i)}`,
        kind: "flight",
        provider: name,
        badge: "live",
        code: `${code} ${s.int(100, 999)}`,
        from,
        to,
        date,
        depart: `${String(depH).padStart(2, "0")}:${String(depM).padStart(2, "0")}`,
        arrive: `${String((depH + Math.floor(dur / 60)) % 24).padStart(2, "0")}:${String((depM + (dur % 60)) % 60).padStart(2, "0")}`,
        durationMin: dur,
        duration: mm(dur),
        stops,
        pricePerHead: price,
        baggage: s.int(0, 1) ? "15kg" : "7kg",
        refundable: !!s.int(0, 1),
        cancellation_policy: s.int(0, 1) ? "Free until 24h before" : "₹3,000 fee",
        availability: "Available",
      });
    } else if (kind === "train") {
      const classes = ["Sleeper", "3AC", "2AC", "1AC"];
      const cls = classes[s.int(0, 3)];
      const price = { Sleeper: 480, "3AC": 1280, "2AC": 1890, "1AC": 2950 }[cls];
      const depH = 5 + s.int(0, 17);
      const dur = Math.round((km / 55) * 60) + s.int(0, 90);
      out.push({
        id: `TR-${i}-${deterministic(kind + from + to + date + i)}`,
        kind: "train",
        provider: `Express ${s.int(12000, 29999)}`,
        badge: "verified",
        code: `Train #${s.int(12000, 29999)}`,
        from,
        to,
        date,
        depart: `${String(depH).padStart(2, "0")}:${String(s.int(0, 11) * 5).padStart(2, "0")}`,
        arrive: `${String((depH + Math.floor(dur / 60)) % 24).padStart(2, "0")}:${String(s.int(0, 11) * 5).padStart(2, "0")}`,
        durationMin: dur,
        duration: mm(dur),
        stops: s.int(2, 9),
        cls,
        pricePerHead: price,
        baggage: "Free",
        refundable: true,
        cancellation_policy: "₹60 + 5% of fare",
        availability: s.int(0, 9) > 1 ? "Available" : "WL 12",
      });
    } else {
      const price = 350 + Math.round(km * 0.9);
      const depH = 6 + s.int(0, 16);
      const dur = Math.round((km / 42) * 60) + s.int(0, 60);
      out.push({
        id: `BS-${i}-${deterministic(kind + from + to + date + i)}`,
        kind: "bus",
        provider: s.int(0, 1) ? "VRL Travels" : "RedBus Express",
        badge: "estimated",
        code: s.int(0, 1) ? "AC Sleeper" : "AC Seater",
        from,
        to,
        date,
        depart: `${String(depH).padStart(2, "0")}:${String(s.int(0, 11) * 5).padStart(2, "0")}`,
        arrive: `${String((depH + Math.floor(dur / 60)) % 24).padStart(2, "0")}:${String(s.int(0, 11) * 5).padStart(2, "0")}`,
        durationMin: dur,
        duration: mm(dur),
        stops: s.int(1, 4),
        pricePerHead: price,
        baggage: "1 bag",
        refundable: !!s.int(0, 1),
        cancellation_policy: "10% fee",
        availability: "Available",
      });
    }
    if (budgetPerHead && out[out.length - 1].pricePerHead > budgetPerHead * 2.5)
      out.pop();
  }
  return out.sort((a, b) => a.pricePerHead - b.pricePerHead);
}

/* ---------- Hotels (one listing per brand — no duplicate brands) ---------- */
export function searchHotels({ city, nights, date, budget }) {
  const out = [];
  HOTEL_BRANDS.forEach(([brand, stars, mult], i) => {
    const s = seeded(`hotel:${city}:${date}:${brand}`);
    const base = 1800 + 2600 * (stars - 2);
    const per = Math.round(base * mult * (0.85 + s.next() * 0.4));
    const total = per * nights;
    const amenities = HOTEL_AMENITIES.filter(() => s.int(0, 2) > 0).slice(0, 5);
    if (!amenities.includes("Free WiFi")) amenities.unshift("Free WiFi");
    if (budget && total > budget * 0.85) return; /* over budget: not listed */
    out.push({
      id: `HT-${i}-${deterministic("hotel" + city + date + brand)}`,
      kind: "hotel",
      provider: brand,
      badge: i % 4 === 0 ? "verified" : "simulated",
      name: `${brand} ${city}`,
      city,
      stars,
      rating: Math.min(5, 3.4 + s.next() * 1.6).toFixed(1),
      distance_from_center_km: (0.6 + s.next() * 7).toFixed(1),
      distance_from_airport_km: (3 + s.next() * 14).toFixed(1),
      price_per_night: per,
      total_price: total,
      amenities,
      check_in: "14:00",
      check_out: "11:00",
      availability: "Available",
      cancellation_policy: s.int(0, 1) ? "Free cancellation" : "24h notice",
      image: `https://picsum.photos/seed/${deterministic("img" + city + brand)}/320/180`,
    });
  });
  return out.sort((a, b) => a.total_price - b.total_price);
}

/* ---------- Airport → hotel transfers + local transport ---------- */
export function searchTransfers({ city, toPlace, km }) {
  return CABS.map(([name, mult], i) => {
    const s = seeded(`cab:${city}:${toPlace}:${name}`);
    const fare = Math.round((45 + km * 14) * mult);
    return {
      id: `TF-${i}-${deterministic("cab" + city + toPlace + name)}`,
      kind: "transfer",
      provider: name,
      badge: name === "Local Taxi" ? "estimated" : "live",
      vehicle: ["Sedan", "Mini", "Bike", "Taxi"][i],
      route: `${city} → ${toPlace}`,
      distance_km: km.toFixed(1),
      eta_min: 8 + Math.round(km * 2.2 * (0.9 + s.next() * 0.4)),
      estimated_price: fare,
      capacity: 4,
      availability: "Available",
    };
  }).sort((a, b) => a.estimated_price - b.estimated_price);
}

/* ---------- Restaurants ---------- */
export function searchRestaurants({ city, near }) {
  return REST_NAMES.map((name, i) => {
    const s = seeded(`rest:${city}:${near}:${name}:${i}`);
    const priceMin = 250 + s.int(0, 6) * 100;
    return {
      id: `RS-${i}-${deterministic("rest" + city + near + name)}`,
      kind: "restaurant",
      provider: name,
      badge: s.int(0, 3) ? "verified" : "estimated",
      name,
      cuisine: [CUISINES[s.int(0, CUISINES.length - 1)], CUISINES[s.int(0, CUISINES.length - 1)]]
        .filter((v, j, a) => a.indexOf(v) === j)
        .join(" • "),
      rating: (3.5 + s.next() * 1.5).toFixed(1),
      price_range: "₹".repeat(1 + s.int(0, 2)),
      price_per_person: priceMin,
      distance_km: (0.3 + s.next() * 4.5).toFixed(1),
      opening_time: `${s.int(8, 11)}:00`,
      closing_time: `${s.int(22, 23)}:00`,
      reservation_available: !!s.int(0, 1),
      availability: "Available",
    };
  });
}

/* ---------- Activities / attractions ---------- */
export function searchActivities({ city, prefs }) {
  return ACTIVITIES.map(([name, category, price, dur], i) => {
    const s = seeded(`act:${city}:${name}`);
    return {
      id: `AC-${i}-${deterministic("act" + city + name)}`,
      kind: "activity",
      provider: name,
      badge: "simulated",
      name,
      category,
      city,
      rating: (3.6 + s.next() * 1.4).toFixed(1),
      price,
      durationMin: dur,
      duration: mm(dur),
      opening_time: `${9 + s.int(0, 2)}:00`,
      closing_time: `${17 + s.int(0, 4)}:00`,
      distance_km: (1 + s.next() * 17).toFixed(1),
      availability: "Available",
      tags: prefs?.filter((p) => category.includes(p) || name.toLowerCase().includes(p)).length
        ? ["match"]
        : [],
    };
  });
}

export const PROVIDERS = {
  flight: AIRLINES.map((a) => a[0]),
  hotel: HOTEL_BRANDS.map((b) => b[0]),
  transfer: CABS.map((c) => c[0]),
};
