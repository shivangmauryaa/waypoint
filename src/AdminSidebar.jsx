import React, { useState } from "react";
import {
  Compass,
  ChevronLeft,
  ChevronRight,
  X,
  LogOut,
  ExternalLink,
} from "lucide-react";
import { adminSections } from "./AdminOperations";

const initials = (name = "Admin") =>
  name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();

// Mirrors the traveler sidebar design so the admin console shares one UI.
export function AdminSidebar({ user, section = "overview", onClose, onNavigate, logout, onError, badges = {} }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <aside
      className={`admin-sidebar traveler-sidebar wp-side ${expanded ? "is-expanded" : ""}`}
      aria-label="Admin sidebar"
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      <div className="admin-brand wp-brand">
        <a href="/admin" aria-label="Waypoint operations">
          <span className="admin-logo wp-logo"><Compass size={22} /></span>
          <span className="sidebar-brand-text wp-brand-text">waypoint<b>OPERATIONS</b></span>
        </a>
        <button className="wp-collapse" aria-label={expanded ? "Collapse navigation" : "Expand navigation"} aria-expanded={expanded} onClick={() => setExpanded(!expanded)}><ChevronLeft size={15} /></button>
        <button className="admin-mobile-close" aria-label="Close navigation" onClick={onClose}><X size={19} /></button>
      </div>
      <nav className="admin-nav" aria-label="Admin navigation">
        {adminSections.map((item, i) => {
          const Icon = item.icon;
          const badge = badges[item.slug] || 0;
          return (
            <React.Fragment key={item.slug}>
              {(i === 0 || item.group !== adminSections[i - 1].group) && (
                <div className="admin-nav-group">{item.group}</div>
              )}
              <a
                href={item.slug === "overview" ? "/admin" : "/admin/" + item.slug}
                aria-label={item.label}
                title={item.label}
                className={section === item.slug ? "selected" : ""}
                aria-current={section === item.slug ? "page" : undefined}
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                  e.preventDefault();
                  onClose?.();
                  onNavigate?.(item.slug);
                }}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {badge > 0 && <b className="admin-nav-badge">{badge}</b>}
                <ChevronRight className="wp-nav-chevron" size={13} />
              </a>
            </React.Fragment>
          );
        })}
        <a href="/trips" aria-label="Traveler workspace" title="Traveler workspace" onClick={onClose}>
          <ExternalLink size={18} />
          <span>Traveler workspace</span>
        </a>
      </nav>
      <div className="admin-sidebar-footer">
        <div className="admin-user">
          <a href="/account" className="admin-avatar" aria-label="Your account" title={user.name}>{initials(user.name)}</a>
          {logout && (
            <button
              aria-label="Log out"
              title="Log out"
              onClick={async () => {
                try { await logout(); } catch (error) { onError?.(error.message); }
              }}
            >
              <LogOut size={17} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
