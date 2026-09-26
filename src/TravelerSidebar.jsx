import React, { useEffect, useState } from "react";
import { Compass, LayoutDashboard, Route, Sparkles, Bot, Bell, Heart, MessageCircle, Settings, ShieldCheck, LogOut, X, Plane, ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "./api";

export const travelerSections = [
  { slug: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/dashboard", group: "TRAVEL" },
  { slug: "trips", label: "My trips", icon: Route, href: "/trips", group: "TRAVEL" },
  { slug: "build", label: "Build My Trip", icon: Sparkles, href: "/build", group: "TRAVEL" },
  { slug: "recovery", label: "AI Recovery", icon: Bot, href: "/build?mode=auto", group: "TRAVEL" },
  { slug: "explore", label: "Explore", icon: Compass, href: "/dashboard#explore", group: "TRAVEL" },
  { slug: "notifications", label: "Inbox", icon: Bell, href: "/notifications", group: "TRAVEL" },
  { slug: "saved", label: "Saved Places", icon: Heart, href: "/dashboard#saved", group: "TOOLS" },
  { slug: "support", label: "Support", icon: MessageCircle, href: "/support", group: "TOOLS" },
  { slug: "account", label: "Account", icon: Settings, href: "/account", group: "TOOLS" },
];
const initials = (name = "Waypoint") => name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();

export function TravelerSidebar({ user, page, onClose, logout, onError }) {
  const [expanded, setExpanded] = useState(false);
  const [recoveryPage, setRecoveryPage] = useState(false);
  useEffect(() => { const update = (event) => setRecoveryPage(Boolean(event.detail)); window.addEventListener("waypoint:recovery-mode", update); return () => window.removeEventListener("waypoint:recovery-mode", update); }, []);
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const load = () => Promise.resolve().then(() => api("notifications")).then((items) => { if (!cancelled && Array.isArray(items)) setUnread(items.filter((item) => !item.read).length); }).catch(() => {});
    load();
    const timer = setInterval(load, 15000);
    return () => { cancelled = true; clearInterval(timer); };
  }, []);
  const activePage = page === "build" && (recoveryPage || new URLSearchParams(window.location.search).get("mode") === "auto") ? "recovery" : page;
  return <aside className={`admin-sidebar traveler-sidebar wp-side ${expanded ? "is-expanded" : ""}`} aria-label="Travel sidebar" onMouseEnter={() => setExpanded(true)} onMouseLeave={() => setExpanded(false)}>
    <div className="admin-brand wp-brand">
      <a href="/dashboard" aria-label="Waypoint dashboard">
        <span className="admin-logo wp-logo"><Plane size={22} fill="currentColor" strokeWidth={1.4} /></span>
      <span className="sidebar-brand-text wp-brand-text">waypoint<b>TRAVEL CONSOLE</b></span>
      </a>
      <button className="wp-collapse" aria-label={expanded ? "Collapse navigation" : "Expand navigation"} aria-expanded={expanded} onClick={() => setExpanded(!expanded)}><ChevronLeft size={15} /></button><button className="admin-mobile-close" aria-label="Close navigation" onClick={onClose}><X size={19} /></button>
    </div>
    <nav className="admin-nav" aria-label="Traveler navigation">
      {travelerSections.map((item, i) => { const Icon = item.icon; return <React.Fragment key={item.slug}>{(i === 0 || item.group !== travelerSections[i - 1].group) && <div className="admin-nav-group">{item.group === "TOOLS" ? "TOOLS" : "TRIP"}</div>}<a href={item.href} aria-label={item.label} title={item.label} className={activePage === item.slug ? "selected" : ""} aria-current={activePage === item.slug ? "page" : undefined} onClick={onClose}><Icon size={18} /><span>{item.label}</span>{item.slug === "notifications" && unread > 0 && <b className="admin-nav-badge">{unread}</b>}<ChevronRight className="wp-nav-chevron" size={13} /></a></React.Fragment>; })}
      {user.role === "admin" && <a href="/admin" aria-label="Admin console" title="Admin console" onClick={onClose}><ShieldCheck size={18} /><span>Admin console</span></a>}
    </nav>
    <div className="admin-sidebar-footer"><div className="admin-user"><a href="/account" className="admin-avatar" aria-label="Your account" title="Account">{initials(user.name)}</a>{logout && <button aria-label="Log out" title="Log out" onClick={async () => { try { await logout(); } catch (error) { onError?.(error.message); } }}><LogOut size={17} /></button>}</div></div>
  </aside>;
}
