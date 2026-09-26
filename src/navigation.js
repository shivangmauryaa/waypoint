export const currentPath = () =>
  location.pathname.replace(/^\/+|\/+$/g, "") + location.search;
export function navigate(path, { replace = false } = {}) {
  const url = new URL(
    path.startsWith("/") ? path : "/" + path,
    location.origin,
  );
  if (url.origin !== location.origin)
    throw Error("Navigation must stay on this site");
  history[replace ? "replaceState" : "pushState"](
    {},
    "",
    url.pathname + url.search + url.hash,
  );
  window.dispatchEvent(new PopStateEvent("popstate"));
}
export function migrateLegacyRoute() {
  if (location.hash.startsWith("#/"))
    history.replaceState({}, "", location.hash.slice(1));
}
export function installNavigation(onChange) {
  const pop = () => onChange(currentPath());
  const click = (e) => {
    if (
      e.defaultPrevented ||
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey
    )
      return;
    const a = e.target.closest?.("a[href]");
    if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download"))
      return;
    const raw = a.getAttribute("href");
    if (raw.startsWith("#")) return;
    const url = new URL(a.href, location.href);
    if (
      url.origin !== location.origin ||
      url.pathname.startsWith("/api/") ||
      url.hash
    )
      return;
    e.preventDefault();
    navigate(url.pathname + url.search);
  };
  window.addEventListener("popstate", pop);
  document.addEventListener("click", click);
  return () => {
    window.removeEventListener("popstate", pop);
    document.removeEventListener("click", click);
  };
}
