const centers = {
  Mumbai: [19.076, 72.8777],
  Jaipur: [26.9124, 75.7873],
  Delhi: [28.6139, 77.209],
  Udaipur: [24.5854, 73.7125],
  Goa: [15.4909, 73.8278],
  Bengaluru: [12.9716, 77.5946],
  Agra: [27.1767, 78.0081],
  Varanasi: [25.3176, 82.9739],
};

const cache = new Map();
const CACHE_MS = 10 * 60 * 1000;
const RADIUS_METERS = 20000;
const RESULT_LIMIT = 100;
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

const clean = (value) => (typeof value === "string" ? value.trim() : "");

export function normalizePlace(element, category, center) {
  const tags = element.tags || {};
  const point = element.center || element;
  const lat = Number(point.lat);
  const lon = Number(point.lon);
  const [centerLat, centerLon] = center;
  const rad = (n) => (n * Math.PI) / 180;
  const distanceKm =
    6371 *
    2 *
    Math.asin(
      Math.sqrt(
        Math.sin(rad(lat - centerLat) / 2) ** 2 +
          Math.cos(rad(centerLat)) *
            Math.cos(rad(lat)) *
            Math.sin(rad(lon - centerLon) / 2) ** 2,
      ),
    );
  const address = [tags["addr:housenumber"], tags["addr:street"], tags["addr:suburb"], tags["addr:city"]]
    .map(clean)
    .filter(Boolean)
    .join(", ");
  const commons = clean(tags.wikimedia_commons).replace(/^File:/i, "");
  const taggedImage = clean(tags.image);
  const photoUrl =
    taggedImage.startsWith("https://")
      ? taggedImage
      : commons
        ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(commons)}`
        : "";

  return {
    id: `osm-${element.type}-${element.id}`,
    osmType: element.type,
    osmId: element.id,
    category,
    name: clean(tags.name) || clean(tags.brand) || "Unnamed place",
    kind:
      category === "restaurants"
        ? clean(tags.cuisine) || clean(tags.amenity) || "Restaurant"
        : clean(tags.tourism) || clean(tags.historic) || clean(tags.amenity) || "Attraction",
    address,
    distanceKm: Math.round(distanceKm * 10) / 10,
    openingHours: clean(tags.opening_hours),
    cuisine: clean(tags.cuisine),
    phone: clean(tags.phone || tags["contact:phone"]),
    website: clean(tags.website || tags["contact:website"]),
    photoUrl,
    mapUrl: `https://www.openstreetmap.org/${element.type}/${element.id}`,
    source: "OpenStreetMap contributors",
  };
}

function queryFor(category, [lat, lon]) {
  const filter =
    category === "restaurants"
      ? 'nwr["amenity"~"^(restaurant|cafe|fast_food|food_court|pub|bar)$"]'
      : 'nwr["tourism"~"^(attraction|museum|theme_park|zoo|viewpoint|gallery|artwork)$"];nwr["historic"~"^(monument|castle|archaeological_site|fort|memorial|ruins)$"]';
  const statements = filter
    .split(";")
    .filter(Boolean)
    .map((selector) => `${selector}(around:${RADIUS_METERS},${lat},${lon});`)
    .join("\n");
  return `[out:json][timeout:20];(${statements});out center tags ${RESULT_LIMIT};`;
}

async function fetchCategory(category, city, center) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 24000);
  try {
    const response = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "User-Agent": "WaypointTravelPlanner/1.0 (OpenStreetMap place search)",
      },
      body: new URLSearchParams({ data: queryFor(category, center) }),
      signal: controller.signal,
    });
    if (!response.ok) throw Error(`OpenStreetMap search returned ${response.status}`);
    const body = await response.json();
    const seen = new Set();
    return (body.elements || [])
      .map((element) => normalizePlace(element, category, center))
      .filter((place) => {
        if (!place.name || place.name === "Unnamed place" || seen.has(place.id)) return false;
        seen.add(place.id);
        return true;
      })
      .sort((a, b) => a.distanceKm - b.distanceKm || a.name.localeCompare(b.name))
      .slice(0, RESULT_LIMIT)
      .map((place) => ({ ...place, city }));
  } finally {
    clearTimeout(timer);
  }
}

export async function searchPlaces(city) {
  const canonicalCity = Object.keys(centers).find((name) => name.toLowerCase() === String(city).toLowerCase());
  if (!canonicalCity) throw Object.assign(Error("Choose one of the supported destinations to search local places."), { status: 400 });
  const cached = cache.get(canonicalCity);
  if (cached?.promise) return cached.promise;
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const center = centers[canonicalCity];
  const promise = Promise.all([
    fetchCategory("restaurants", canonicalCity, center),
    fetchCategory("activities", canonicalCity, center),
  ])
    .then(([restaurants, activities]) => {
      const value = {
        destination: canonicalCity,
        source: "OpenStreetMap contributors",
        attributionUrl: "https://www.openstreetmap.org/copyright",
        fetchedAt: new Date().toISOString(),
        restaurants,
        activities,
      };
      cache.set(canonicalCity, { value, expiresAt: Date.now() + CACHE_MS });
      return value;
    })
    .catch((error) => {
      cache.delete(canonicalCity);
      throw error;
    });
  cache.set(canonicalCity, { promise, expiresAt: Date.now() + CACHE_MS });
  return promise;
}
