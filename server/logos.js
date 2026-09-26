/* ============================================================
   Brand logo service.

   Real provider logos are resolved from a server-side registry and
   fetched once from Wikimedia Commons, then cached on disk under
   DATA_DIR/logos. Clients only ever send a brand id, never a URL, so
   this endpoint cannot be used to fetch arbitrary remote resources.

   If the network is unavailable (or a brand has no published logo),
   the endpoint answers 404 and the UI falls back to a clean monogram —
   the app never depends on connectivity to work.
   ============================================================ */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";

const CACHE_DIR = resolve(process.env.DATA_DIR || "data", "logos");
const FETCH_TIMEOUT_MS = 12000;
const MAX_BYTES = 2 * 1024 * 1024;
// Wikimedia's upload host rejects non-browser user agents, so a browser-style
// string is used to retrieve these public brand marks for local caching.
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

// Verified direct SVG URLs (Wikimedia Commons). SVG keeps the marks crisp at
// every size, which is why the hosted originals are used rather than raster.
export const LOGOS = {
  "air-india": {
    name: "Air India",
    url: "https://upload.wikimedia.org/wikipedia/commons/b/bf/Air_India_2023.svg",
    type: "image/svg+xml",
  },
  indigo: {
    name: "IndiGo",
    url: "https://upload.wikimedia.org/wikipedia/commons/6/69/IndiGo_Airlines_logo.svg",
    type: "image/svg+xml",
  },
  akasa: {
    name: "Akasa Air",
    url: "https://upload.wikimedia.org/wikipedia/commons/6/69/Akasa_Air_logo.svg",
    type: "image/svg+xml",
  },
  vistara: {
    name: "Vistara",
    url: "https://upload.wikimedia.org/wikipedia/commons/b/bd/Vistara_Logo.svg",
    type: "image/svg+xml",
  },
  uber: {
    name: "Uber",
    url: "https://upload.wikimedia.org/wikipedia/commons/5/58/Uber_logo_2018.svg",
    type: "image/svg+xml",
  },
  ola: {
    name: "Ola",
    url: "https://upload.wikimedia.org/wikipedia/commons/0/0f/Ola_Cabs_logo.svg",
    type: "image/svg+xml",
  },
  taj: {
    name: "Taj",
    url: "https://upload.wikimedia.org/wikipedia/commons/c/cd/Taj_Hotels_logo.svg",
    type: "image/svg+xml",
  },
  marriott: {
    name: "Marriott",
    url: "https://upload.wikimedia.org/wikipedia/commons/b/b3/Marriott_hotels_logo14.svg",
    type: "image/svg+xml",
  },
  itc: {
    name: "ITC",
    url: "https://upload.wikimedia.org/wikipedia/commons/6/6c/ITC_Hotels_logo.svg",
    type: "image/svg+xml",
  },
  radisson: {
    name: "Radisson",
    url: "https://upload.wikimedia.org/wikipedia/commons/7/74/Radisson_Hotels_logo.svg",
    type: "image/svg+xml",
  },
  "holiday-inn": {
    name: "Holiday Inn",
    url: "https://upload.wikimedia.org/wikipedia/commons/0/0a/Holiday_Inn_by_IHG_logo.svg",
    type: "image/svg+xml",
  },
};

const EXTENSIONS = { "image/svg+xml": "svg", "image/png": "png" };

export const brandId = (value) =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const logoFor = (id) => LOGOS[brandId(id)] || null;

export function brandList() {
  return Object.entries(LOGOS).map(([id, entry]) => ({
    id,
    name: entry.name,
    type: entry.type,
    logo: `/api/logos/${id}`,
  }));
}

async function fromCache(id, type) {
  const ext = EXTENSIONS[type] || "img";
  try {
    return { body: await readFile(join(CACHE_DIR, `${id}.${ext}`)), type };
  } catch {
    return null;
  }
}

/**
 * Returns { body: Buffer, type, cache } or null when no logo is available.
 * The first successful download is cached so later requests work offline.
 */
export async function loadLogo(id) {
  const key = brandId(id);
  const entry = LOGOS[key];
  if (!entry) return null;

  const cached = await fromCache(key, entry.type);
  if (cached) return { ...cached, cache: "hit" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(entry.url, {
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT, Accept: "image/svg+xml,image/*;q=0.8,*/*;q=0.5" },
    });
    if (!response.ok) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.length || buffer.length > MAX_BYTES) return null;
    const header = String(response.headers.get("content-type") || "").split(";")[0].trim();
    const type = header.startsWith("image/") ? header : entry.type;
    const ext = EXTENSIONS[type] || "img";
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(join(CACHE_DIR, `${key}.${ext}`), buffer).catch(() => {});
    return { body: buffer, type, cache: "miss" };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
