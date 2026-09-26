// Simulated travel-provider layer for the Trip Builder.
//
// Nothing here talks to a real supplier. Every result is generated
// deterministically from the search query, is labelled with its data
// fidelity, and is de-duplicated, so that:
//   * the same query always yields the same results (safe to poll),
//   * the UI can honestly show "Simulated" instead of inventing live data,
//   * a provider "outage" is a property of the layer, not of the itinerary.

export const fidelity = {
  LIVE: "Live",
  VERIFIED: "Verified",
  ESTIMATED: "Estimated",
  SIMULATED: "Simulated",
};

export const categories = [
  "flights",
  "hotels",
  "transfers",
  "restaurants",
  "activities",
];

// Deliberately staggered simulated search timings (ms) so the demo shows a
// genuinely orchestrated, progressive search instead of one instant blob.
export const timings = {
  flights: 2000,
  hotels: 4000,
  transfers: 3000,
  restaurants: 5000,
  activities: 7000,
  itinerary: 3000,
};

export const cities = {
  Mumbai: { code: "BOM", lat: 19.0896, lon: 72.8656 },
  Jaipur: { code: "JAI", lat: 26.8242, lon: 75.8122 },
  Delhi: { code: "DEL", lat: 28.5562, lon: 77.1 },
  Udaipur: { code: "UDR", lat: 24.6177, lon: 73.8961 },
  Goa: { code: "GOI", lat: 15.3808, lon: 73.8314 },
  Bengaluru: { code: "BLR", lat: 13.1986, lon: 77.7066 },
  Agra: { code: "AGR", lat: 27.1558, lon: 78.0058 },
  Varanasi: { code: "VNS", lat: 25.4524, lon: 82.8594 },
};
export const cityNames = Object.keys(cities);

export const providers = {
  flights: [
    { id: "air-india", name: "Air India", prefix: "AI", tone: "red" },
    { id: "indigo", name: "IndiGo", prefix: "6E", tone: "indigo" },
    { id: "akasa", name: "Akasa Air", prefix: "QP", tone: "orange" },
    { id: "vistara", name: "Vistara", prefix: "UK", tone: "purple" },
  ],
  trains: [
    { id: "rajdhani", name: "Rajdhani Express", tone: "blue" },
    { id: "shatabdi", name: "Shatabdi Express", tone: "teal" },
    { id: "duronto", name: "Duronto Express", tone: "green" },
  ],
  buses: [
    { id: "rsrtc", name: "RSRTC Volvo", tone: "amber" },
    { id: "redbus", name: "RedBus Sleeper", tone: "red" },
    { id: "vrl", name: "VRL Travels", tone: "slate" },
  ],
  hotels: [
    { id: "taj", name: "Taj", stars: 5, tone: "amber" },
    { id: "marriott", name: "Marriott", stars: 5, tone: "red" },
    { id: "hyatt", name: "Hyatt", stars: 5, tone: "slate" },
    { id: "itc", name: "ITC", stars: 5, tone: "green" },
    { id: "holiday-inn", name: "Holiday Inn", stars: 4, tone: "teal" },
    { id: "radisson", name: "Radisson", stars: 4, tone: "blue" },
    { id: "heritage", name: "Heritage Haveli", stars: 3, tone: "indigo" },
    { id: "boutique", name: "Boutique Stay", stars: 3, tone: "purple" },
  ],
  transfers: [
    {
      id: "uber",
      name: "Uber",
      tone: "slate",
      vehicles: ["Uber Go", "Uber Sedan", "Uber XL"],
      factor: 1,
    },
    {
      id: "ola",
      name: "Ola",
      tone: "amber",
      vehicles: ["Ola Mini", "Ola Prime", "Ola Prime SUV"],
      factor: 0.94,
    },
    {
      id: "rapido",
      name: "Rapido",
      tone: "red",
      vehicles: ["Rapido Bike", "Rapido Auto"],
      factor: 0.68,
    },
    {
      id: "taxi",
      name: "Local Taxi",
      tone: "green",
      vehicles: ["Metered Sedan", "Innova Crysta"],
      factor: 1.35,
    },
    {
      id: "public",
      name: "Public transport",
      tone: "blue",
      vehicles: ["Metro / Bus"],
      factor: 0.16,
    },
  ],
  restaurants: [
    { id: "local-kitchen", name: "Local Kitchen", cuisine: "Regional", band: 2 },
    { id: "spice-route", name: "Spice Route", cuisine: "North Indian", band: 2 },
    { id: "terrace", name: "Rooftop Terrace", cuisine: "Continental", band: 3 },
    { id: "cafe", name: "Corner Cafe", cuisine: "Cafe", band: 1 },
    { id: "street", name: "Street Food Lane", cuisine: "Street Food", band: 1 },
    { id: "wok", name: "Wok House", cuisine: "Chinese", band: 2 },
    { id: "dosa", name: "Dosa Junction", cuisine: "South Indian", band: 1 },
    { id: "heritage-thali", name: "Heritage Thali", cuisine: "Thali", band: 2 },
  ],
  activities: [
    {
      kind: "Water Park",
      names: ["Splash Kingdom Water Park"],
      open: "10:00",
      close: "18:00",
      minutes: 300,
      perPerson: 1200,
    },
    {
      kind: "Snow Park",
      names: ["Snow World"],
      open: "10:00",
      close: "21:00",
      minutes: 120,
      perPerson: 900,
    },
    {
      kind: "National Park",
      names: ["Wildlife Safari Park"],
      open: "06:30",
      close: "18:00",
      minutes: 240,
      perPerson: 1500,
    },
    {
      kind: "Museum",
      names: ["City Museum", "Royal Collection Museum"],
      open: "09:30",
      close: "17:30",
      minutes: 120,
      perPerson: 400,
    },
    {
      kind: "Fort",
      names: ["Hill Fort", "Old Fort"],
      open: "08:00",
      close: "17:30",
      minutes: 180,
      perPerson: 600,
    },
    {
      kind: "Palace",
      names: ["City Palace", "Lake Palace"],
      open: "09:00",
      close: "17:00",
      minutes: 150,
      perPerson: 700,
    },
    {
      kind: "Shopping",
      names: ["Bazaar Walk", "Craft Market"],
      open: "10:00",
      close: "21:00",
      minutes: 120,
      perPerson: 0,
    },
    {
      kind: "Walking Tour",
      names: ["Old City Walking Tour"],
      open: "07:00",
      close: "19:00",
      minutes: 150,
      perPerson: 900,
    },
    {
      kind: "Beach",
      names: ["Sunset Beach"],
      open: "06:00",
      close: "22:00",
      minutes: 180,
      perPerson: 0,
    },
    {
      kind: "Garden",
      names: ["Botanical Garden"],
      open: "06:00",
      close: "19:00",
      minutes: 90,
      perPerson: 100,
    },
    {
      kind: "Temple",
      names: ["Hilltop Temple"],
      open: "05:30",
      close: "21:00",
      minutes: 90,
      perPerson: 0,
    },
    {
      kind: "Nightlife",
      names: ["Rooftop Lounge", "Live Music Bar"],
      open: "19:00",
      close: "01:00",
      minutes: 180,
      perPerson: 1400,
    },
    {
      kind: "Theme Park",
      names: ["Adventure Theme Park"],
      open: "10:00",
      close: "20:00",
      minutes: 330,
      perPerson: 1600,
    },
    {
      kind: "Adventure",
      names: ["Zip-line & Rappelling"],
      open: "08:00",
      close: "18:00",
      minutes: 180,
      perPerson: 2200,
    },
  ],
};

const operators = ["GetYourGuide", "Klook", "Local operator", "Waypoint picks"];

// Curated demonstration venues and attractions for the cities supported by
// the planner. Prices, ratings, opening hours, and distances remain simulated.
const cityRestaurants = {
  Mumbai: [
    { name: "Cafe Mondegar", cuisine: "Cafe", band: 2 },
    { name: "Mahesh Lunch Home", cuisine: "Seafood", band: 3 },
    { name: "Britannia & Co.", cuisine: "Parsi", band: 2 },
    { name: "Prakash Shakahari Upahaar Kendra", cuisine: "Gujarati", band: 1 },
    { name: "Leopold Cafe", cuisine: "Cafe", band: 2 },
  ],
  Jaipur: [
    { name: "Rawat Mishtan Bhandar", cuisine: "Rajasthani", band: 1 },
    { name: "Laxmi Misthan Bhandar", cuisine: "Rajasthani", band: 1 },
    { name: "Chokhi Dhani", cuisine: "Rajasthani", band: 3 },
    { name: "Lassiwala", cuisine: "Cafe", band: 1 },
    { name: "Spice Court", cuisine: "North Indian", band: 2 },
  ],
  Delhi: [
    { name: "Karim's", cuisine: "Mughlai", band: 2 },
    { name: "Saravana Bhavan", cuisine: "South Indian", band: 2 },
    { name: "Indian Accent", cuisine: "Modern Indian", band: 4 },
    { name: "Sita Ram Diwan Chand", cuisine: "Street Food", band: 1 },
    { name: "Moti Mahal", cuisine: "North Indian", band: 2 },
  ],
  Udaipur: [
    { name: "Ambrai", cuisine: "Rajasthani", band: 3 },
    { name: "Natraj Dining Hall", cuisine: "Thali", band: 1 },
    { name: "Khamma Ghani", cuisine: "Rajasthani", band: 2 },
    { name: "Jheel's Ginger Coffee Bar", cuisine: "Cafe", band: 2 },
    { name: "Millets of Mewar", cuisine: "Vegetarian", band: 2 },
  ],
  Goa: [
    { name: "Vinayak Family Restaurant", cuisine: "Goan", band: 2 },
    { name: "Gunpowder", cuisine: "South Indian", band: 3 },
    { name: "Fisherman's Wharf", cuisine: "Seafood", band: 3 },
    { name: "Ritz Classic", cuisine: "Goan", band: 2 },
    { name: "Mum's Kitchen", cuisine: "Goan", band: 2 },
  ],
  Bengaluru: [
    { name: "Mavalli Tiffin Rooms", cuisine: "South Indian", band: 1 },
    { name: "Vidyarthi Bhavan", cuisine: "South Indian", band: 1 },
    { name: "Nagarjuna", cuisine: "Andhra", band: 2 },
    { name: "Brahmin's Coffee Bar", cuisine: "Cafe", band: 1 },
    { name: "Koshy's", cuisine: "Cafe", band: 2 },
  ],
  Agra: [
    { name: "Deviram Sweets", cuisine: "Street Food", band: 1 },
    { name: "Pinch of Spice", cuisine: "North Indian", band: 2 },
    { name: "Peshawri", cuisine: "North Indian", band: 3 },
    { name: "Dasaprakash", cuisine: "South Indian", band: 2 },
    { name: "Mama Chicken Mama Franky", cuisine: "Mughlai", band: 1 },
  ],
  Varanasi: [
    { name: "Kashi Chaat Bhandar", cuisine: "Street Food", band: 1 },
    { name: "Baati Chokha", cuisine: "Bihari", band: 2 },
    { name: "Deena Chaat Bhandar", cuisine: "Street Food", band: 1 },
    { name: "Brown Bread Bakery", cuisine: "Cafe", band: 2 },
    { name: "Pizzeria Vaatika Cafe", cuisine: "Cafe", band: 2 },
  ],
};

const cityActivities = {
  Mumbai: [
    { name: "Gateway of India", kind: "Landmark", minutes: 90, perPerson: 0 },
    { name: "Elephanta Caves day trip", kind: "Adventure", minutes: 300, perPerson: 900 },
    { name: "Marine Drive heritage walk", kind: "Walking Tour", minutes: 120, perPerson: 350 },
    { name: "Chhatrapati Shivaji Maharaj Vastu Sangrahalaya", kind: "Museum", minutes: 150, perPerson: 350 },
    { name: "Sanjay Gandhi National Park", kind: "National Park", minutes: 240, perPerson: 85 },
    { name: "Juhu Beach sunset", kind: "Beach", minutes: 120, perPerson: 0 },
  ],
  Jaipur: [
    { name: "Amber Fort", kind: "Fort", minutes: 180, perPerson: 200 },
    { name: "Hawa Mahal", kind: "Palace", minutes: 90, perPerson: 50 },
    { name: "City Palace Jaipur", kind: "Palace", minutes: 150, perPerson: 300 },
    { name: "Jantar Mantar", kind: "Museum", minutes: 90, perPerson: 200 },
    { name: "Nahargarh Fort sunset", kind: "Fort", minutes: 150, perPerson: 100 },
    { name: "Jaipur old city walking tour", kind: "Walking Tour", minutes: 150, perPerson: 500 },
  ],
  Delhi: [
    { name: "Red Fort", kind: "Fort", minutes: 150, perPerson: 35 },
    { name: "Qutub Minar", kind: "Landmark", minutes: 120, perPerson: 40 },
    { name: "Humayun's Tomb", kind: "Landmark", minutes: 120, perPerson: 40 },
    { name: "India Gate heritage walk", kind: "Walking Tour", minutes: 120, perPerson: 0 },
    { name: "Akshardham Temple", kind: "Temple", minutes: 180, perPerson: 0 },
    { name: "Lodhi Garden", kind: "Garden", minutes: 90, perPerson: 0 },
  ],
  Udaipur: [
    { name: "City Palace Udaipur", kind: "Palace", minutes: 180, perPerson: 400 },
    { name: "Lake Pichola boat ride", kind: "Adventure", minutes: 90, perPerson: 500 },
    { name: "Bagore Ki Haveli", kind: "Museum", minutes: 120, perPerson: 100 },
    { name: "Sajjangarh Monsoon Palace", kind: "Palace", minutes: 150, perPerson: 100 },
    { name: "Saheliyon Ki Bari", kind: "Garden", minutes: 90, perPerson: 30 },
    { name: "Udaipur old city walk", kind: "Walking Tour", minutes: 120, perPerson: 400 },
  ],
  Goa: [
    { name: "Fort Aguada", kind: "Fort", minutes: 120, perPerson: 0 },
    { name: "Baga Beach", kind: "Beach", minutes: 180, perPerson: 0 },
    { name: "Basilica of Bom Jesus", kind: "Landmark", minutes: 90, perPerson: 0 },
    { name: "Fontainhas heritage walk", kind: "Walking Tour", minutes: 120, perPerson: 300 },
    { name: "Dudhsagar Falls day trip", kind: "Adventure", minutes: 360, perPerson: 1800 },
    { name: "Anjuna Flea Market", kind: "Shopping", minutes: 120, perPerson: 0 },
  ],
  Bengaluru: [
    { name: "Lalbagh Botanical Garden", kind: "Garden", minutes: 120, perPerson: 30 },
    { name: "Bangalore Palace", kind: "Palace", minutes: 120, perPerson: 240 },
    { name: "Cubbon Park", kind: "Garden", minutes: 90, perPerson: 0 },
    { name: "ISKCON Bengaluru", kind: "Temple", minutes: 120, perPerson: 0 },
    { name: "Vidhana Soudha city walk", kind: "Walking Tour", minutes: 90, perPerson: 250 },
    { name: "Bannerghatta Biological Park", kind: "National Park", minutes: 240, perPerson: 260 },
  ],
  Agra: [
    { name: "Taj Mahal", kind: "Landmark", minutes: 180, perPerson: 50 },
    { name: "Agra Fort", kind: "Fort", minutes: 150, perPerson: 50 },
    { name: "Mehtab Bagh", kind: "Garden", minutes: 90, perPerson: 30 },
    { name: "Itimad-ud-Daulah's Tomb", kind: "Landmark", minutes: 90, perPerson: 30 },
    { name: "Fatehpur Sikri day trip", kind: "Landmark", minutes: 300, perPerson: 50 },
    { name: "Agra heritage walk", kind: "Walking Tour", minutes: 120, perPerson: 350 },
  ],
  Varanasi: [
    { name: "Ganga Aarti at Dashashwamedh Ghat", kind: "Temple", minutes: 90, perPerson: 0 },
    { name: "Sunrise Ganges boat ride", kind: "Adventure", minutes: 90, perPerson: 500 },
    { name: "Kashi Vishwanath Corridor", kind: "Temple", minutes: 120, perPerson: 0 },
    { name: "Sarnath day visit", kind: "Landmark", minutes: 180, perPerson: 20 },
    { name: "Banaras Hindu University campus", kind: "Landmark", minutes: 90, perPerson: 0 },
    { name: "Varanasi old city walk", kind: "Walking Tour", minutes: 120, perPerson: 400 },
  ],
};

// --- deterministic helpers -------------------------------------------------

const hash = (text) => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

export const stableId = (prefix, signature) =>
  `${prefix}-${hash(signature).toString(36)}`;

const rng = (seed) => {
  let a = hash(seed);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const between = (r, lo, hi, step = 1) =>
  lo + Math.round((r() * (hi - lo)) / step) * step;
const pick = (r, list) => list[Math.floor(r() * list.length) % list.length];

const cityCode = (name) =>
  cities[name]?.code || String(name || "???").slice(0, 3).toUpperCase();

export function distanceKm(a, b) {
  const A = cities[a],
    B = cities[b];
  if (!A || !B) return 900;
  const toRad = (d) => (d * Math.PI) / 180,
    R = 6371;
  const dLat = toRad(B.lat - A.lat),
    dLon = toRad(B.lon - A.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(A.lat)) * Math.cos(toRad(B.lat)) * Math.sin(dLon / 2) ** 2;
  return Math.max(120, Math.round(2 * R * Math.asin(Math.sqrt(h))));
}

// Local travel inside a destination: realistic short hops.
const localKm = (r, lo = 0.4, hi = 22) =>
  Math.round((lo + r() * (hi - lo)) * 10) / 10;

const stamp = (date, minutes, baselineHour = 0, baselineMinute = 0) => {
  const total = baselineHour * 60 + baselineMinute + minutes;
  const day = Number(date.slice(8, 10)) + Math.floor(total / 1440);
  const hh = String(Math.floor((total % 1440) / 60)).padStart(2, "0"),
    mm = String(total % 60).padStart(2, "0");
  return `${date.slice(0, 8)}${String(day).padStart(2, "0")}T${hh}:${mm}:00+05:30`;
};

const hhmm = (text) => {
  const [h, m] = text.split(":").map(Number);
  return h * 60 + m;
};

// --- transport -------------------------------------------------------------

function transportOptions(kind, req, r) {
  const distance = distanceKm(req.origin, req.destination),
    list = providers[kind],
    base = Math.max(2400, Math.round(distance * 4.4)),
    count = kind === "flights" ? between(r, 12, 18) : between(r, 6, 9);
  const out = [];
  for (let i = 0; i < count; i++) {
    const carrier = list[i % list.length],
      departure = 6 * 60 + i * between(r, 55, 130, 5),
      duration =
        kind === "flights"
          ? Math.round(distance / 11) + between(r, 25, 45, 5)
          : Math.round(distance / 1.1) + between(r, 20, 60, 10),
      stops = kind === "flights" && r() < 0.35 ? 1 : 0;
    const totalMinutes = duration + stops * between(r, 55, 120, 15);
    const perPerson = Math.round(
      base *
        (kind === "buses" ? 0.42 : kind === "trains" ? 0.62 : 1) *
        (1 + (departure - 12 * 60) / 4200) *
        (stops ? 0.88 : 1) *
        (0.86 + r() * 0.3),
    );
    const code =
        kind === "flights"
          ? `${carrier.prefix} ${between(r, 100, 989)}`
          : `${carrier.name.split(" ")[0].slice(0, 3).toUpperCase()} ${between(r, 1000, 2999)}`,
      signature = [
        kind,
        carrier.id,
        code,
        req.origin,
        req.destination,
        req.date,
        departure,
      ].join("|");
    out.push({
      id: stableId(kind === "flights" ? "f" : kind === "trains" ? "t" : "b", signature),
      category: kind,
      kind,
      signature,
      source: carrier.name,
      tone: carrier.tone,
      code,
      origin: req.origin,
      destination: req.destination,
      originCode: cityCode(req.origin),
      destinationCode: cityCode(req.destination),
      departAt: stamp(req.date, departure),
      arriveAt: stamp(req.date, departure + totalMinutes),
      durationMinutes: totalMinutes,
      stops,
      perPerson,
      price: perPerson * req.travelers,
      travelers: req.travelers,
      currency: "INR",
      baggageKg: kind === "flights" ? pick(r, [15, 20, 25]) : 0,
      rating: Math.round((3.6 + r() * 1.3) * 10) / 10,
      availability:
        r() < 0.08 ? "limited" : r() < 0.03 ? "sold-out" : "available",
      refundable: r() < 0.55,
      cancellationPolicy: r() < 0.55 ? "Refundable before departure" : "Non-refundable",
      returnLeg: false,
      fidelity: fidelity.SIMULATED,
      providerId: carrier.id,
    });
  }
  return out;
}

function returnTransport(req, r) {
  if (!req.returnDate) return [];
  return transportOptions(r() < 0.7 ? "flights" : "trains", {
    ...req,
    origin: req.destination,
    destination: req.origin,
    date: req.returnDate,
  }, r).map((x) => ({
    ...x,
    id: x.id + "-ret",
    signature: x.signature + "|return",
    returnLeg: true,
  }));
}

// --- hotels ----------------------------------------------------------------

function hotelOptions(req, r) {
  const nights = Math.max(
    1,
    Math.round(
      (Date.parse(req.checkOut + "T00:00:00+05:30") -
        Date.parse(req.checkIn + "T00:00:00+05:30")) /
        86400000,
    ) || req.nights ||
      2,
  );
  const count = between(r, 22, 27);
  const perNightBase = { 3: 3400, 4: 5600, 5: 8800 };
  const roomTypes = ["Deluxe Room", "Premium Room", "Suite", "Garden View"];
  const out = [];
  for (let i = 0; i < count; i++) {
    const brand = providers.hotels[i % providers.hotels.length],
      room = roomTypes[Math.floor(i / providers.hotels.length) % roomTypes.length],
      perNight = Math.round(
        perNightBase[brand.stars] *
          (0.82 + r() * 0.5) *
          (room === "Suite" ? 1.55 : room === "Premium Room" ? 1.2 : 1),
      ),
      name = `${brand.name} ${req.destination}${room === "Deluxe Room" ? "" : " " + room}`,
      signature = ["hotel", brand.id, room, req.destination, req.checkIn].join("|");
    out.push({
      id: stableId("h", signature),
      category: "hotels",
      kind: "hotel",
      signature,
      source: brand.name,
      tone: brand.tone,
      name,
      stars: brand.stars,
      roomType: room,
      rating: Math.round((brand.stars - 0.6 + r() * 0.9) * 10) / 10,
      pricePerNight: perNight,
      nights,
      price: perNight * nights,
      travelers: req.travelers,
      currency: "INR",
      distanceFromAirportKm: localKm(r, 0.8, 19),
      distanceFromCentreKm: localKm(r, 0.3, 11),
      amenities: [
        "WiFi",
        ...(r() < 0.85 ? ["Breakfast"] : []),
        ...(r() < 0.6 ? ["Airport transfer"] : []),
        ...(r() < 0.5 ? ["Pool"] : []),
        ...(r() < 0.4 ? ["Spa"] : []),
        ...(brand.stars >= 4 ? ["Gym"] : []),
      ],
      checkInTime: "14:00",
      checkOutTime: "11:00",
      availability: r() < 0.1 ? "limited" : r() < 0.03 ? "sold-out" : "available",
      cancellationPolicy:
        r() < 0.5 ? "Free cancellation 48h before check-in" : "Non-refundable",
      fidelity: fidelity.SIMULATED,
      providerId: brand.id,
    });
  }
  return out;
}

// --- transfers -------------------------------------------------------------

function transferOptions(req, r, local = false) {
  // Airport → hotel and short local hops, never the long intercity distance.
  const distance = local ? localKm(r, 0.8, 22) : distanceKm(req.origin, req.destination),
    count = between(r, 7, 11),
    out = [];
  for (let i = 0; i < count; i++) {
    const brand = providers.transfers[i % providers.transfers.length],
      vehicle = pick(r, brand.vehicles),
      perPerson = Math.max(
        40,
        Math.round((distance * 24 + 55) * brand.factor * (0.9 + r() * 0.25)),
      );
    const signature = [
      local ? "local" : "transfer",
      brand.id,
      vehicle,
      req.origin,
      req.destination,
      req.date || "",
    ].join("|");
    out.push({
      id: stableId(local ? "lt" : "tr", `${signature}|${i}`),
      category: "transfers",
      kind: "transfer",
      signature,
      source: brand.name,
      tone: brand.tone,
      vehicle,
      from: req.origin,
      to: req.destination,
      local,
      distanceKm: distance,
      etaMinutes: Math.round((distance / (local ? 22 : 34)) * 60) + between(r, 3, 14),
      perPerson,
      price: perPerson * req.travelers,
      travelers: req.travelers,
      capacity: vehicle.includes("XL") || vehicle.includes("SUV") ? 6 : 4,
      currency: "INR",
      availability: r() < 0.12 ? "limited" : "available",
      fidelity: fidelity.ESTIMATED,
      providerId: brand.id,
    });
  }
  return out;
}

// --- restaurants -----------------------------------------------------------

function restaurantOptions(req, r) {
  const places = cityRestaurants[req.destination] || providers.restaurants.map((place) => ({ ...place, name: `${place.name} ${req.destination}` }));
  const out = [];
  for (let i = 0; i < places.length; i++) {
    const place = places[i],
      area = pick(r, ["Near the hotel", "Near the old city", "City centre", "Market area"]),
      avgPerPerson = place.band * 350 + between(r, 0, 220),
      open = between(r, 6, 11) * 60,
      close = between(r, 21, 25) * 60,
      signature = ["restaurant", place.name, area, req.destination].join("|");
    out.push({
      id: stableId("r", signature),
      category: "restaurants",
      kind: "restaurant",
      signature,
      source: "Local guide · demo",
      tone: "amber",
      name: `${place.name} · ${area}`,
      cuisine: place.cuisine,
      priceBand: "₹".repeat(place.band),
      avgPerPerson,
      price: avgPerPerson * req.travelers,
      travelers: req.travelers,
      currency: "INR",
      rating: Math.round((3.5 + r() * 1.4) * 10) / 10,
      distanceKm: localKm(r, 0.2, 6),
      openTime: `${String(Math.floor(open / 60)).padStart(2, "0")}:${String(open % 60).padStart(2, "0")}`,
      closeTime: `${String(Math.floor((close % 1440) / 60)).padStart(2, "0")}:${String(close % 60).padStart(2, "0")}`,
      closesAtMinutes: close,
      availability: "available",
      reservation: r() < 0.5,
      fidelity: fidelity.SIMULATED,
      providerId: `local-${place.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    });
  }
  return out;
}

// --- activities ------------------------------------------------------------

function activityOptions(req, r) {
  const places = cityActivities[req.destination] || providers.activities.slice(0, 6).map((tpl) => ({ name: `${tpl.names[0]} · ${req.destination}`, kind: tpl.kind, minutes: tpl.minutes, perPerson: tpl.perPerson, open: tpl.open, close: tpl.close }));
  const out = [];
  for (let i = 0; i < places.length; i++) {
    const place = places[i],
      operator = operators[i % operators.length],
      perPerson = Math.max(0, Math.round(place.perPerson * (0.95 + r() * 0.1))),
      open = place.open || "09:00",
      close = place.close || "18:00",
      signature = ["activity", place.kind, place.name, req.destination].join("|");
    out.push({
      id: stableId("a", signature),
      category: "activities",
      kind: "activity",
      signature,
      source: "Local guide · demo",
      tone: "green",
      name: place.name,
      activityKind: place.kind,
      priceBand: perPerson === 0 ? "Free" : perPerson > 1200 ? "₹₹₹" : "₹₹",
      perPerson,
      price: perPerson * req.travelers,
      travelers: req.travelers,
      currency: "INR",
      rating: Math.round((4.0 + r() * 0.8) * 10) / 10,
      durationMinutes: place.minutes,
      distanceKm: localKm(r, 0.5, 18),
      openTime: open,
      closeTime: close,
      openMinutes: hhmm(open),
      closeMinutes: hhmm(close) <= hhmm(open) ? hhmm(close) + 1440 : hhmm(close),
      availability: "estimated",
      fidelity: fidelity.SIMULATED,
      providerId: `local-${operator.toLowerCase().replaceAll(" ", "-")}`,
    });
  }
  return out;
}

// --- public API ------------------------------------------------------------

// A provider outage is simulated deterministically per query so the rest of
// the itinerary keeps working when one category "fails".
export function providerOutage(category, req) {
  const r = rng(`outage|${category}|${req.origin}|${req.destination}|${req.date}`);
  return r() < 0.04;
}

export function dedupe(list) {
  const seen = new Set();
  return list.filter((x) => {
    const key = `${x.category}|${x.source}|${x.name || x.code || x.vehicle}|${x.departAt || x.openTime || ""}|${x.price}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function search(category, req) {
  const r = rng(`${category}|${req.origin}|${req.destination}|${req.date}|${req.travelers}`);
  let options;
  if (category === "flights")
    options = [...transportOptions("flights", req, r), ...returnTransport(req, r)];
  else if (category === "hotels") options = hotelOptions(req, r);
  else if (category === "transfers")
    options = transferOptions(
      {
        ...req,
        origin: `${req.destination} Airport`,
        destination: req.destination,
      },
      r,
      true,
    );
  else if (category === "restaurants") options = restaurantOptions(req, r);
  else if (category === "activities") options = activityOptions(req, r);
  else return { category, options: [], fidelity: fidelity.SIMULATED };
  return {
    category,
    options: dedupe(options),
    fidelity: fidelity.SIMULATED,
    fetchedAt: new Date().toISOString(),
  };
}

export const providerLabel = (item) =>
  item.returnLeg ? `${item.source} (return)` : item.source;
