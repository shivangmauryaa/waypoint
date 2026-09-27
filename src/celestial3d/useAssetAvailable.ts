import { useEffect, useState } from "react";

export type AssetStatus = "probing" | "available" | "missing";

/**
 * Probe a public asset (e.g. `/models/aircraft.glb`).
 *
 * Real GLB models are optional; when they are absent we render a procedural
 * fallback instead of pretending a model exists. A 404 (or an HTML error page
 * returned by a dev server) resolves to `missing`.
 */
export function useAssetAvailable(url: string): AssetStatus {
  const [status, setStatus] = useState<AssetStatus>("probing");

  useEffect(() => {
    let alive = true;
    setStatus("probing");

    fetch(url, { method: "HEAD" })
      .then((response) => {
        if (!alive) return;
        const type = response.headers.get("content-type") ?? "";
        const looksLikeModel = !type.includes("text/html");
        setStatus(response.ok && looksLikeModel ? "available" : "missing");
      })
      .catch(() => {
        if (alive) setStatus("missing");
      });

    return () => {
      alive = false;
    };
  }, [url]);

  return status;
}
