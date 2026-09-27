import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { Compass } from "lucide-react";
import { api, go } from "./api";
import { Landing, AuthPage } from "./Public";
import {
  TravelerShell,
  TripList,
  Account,
  Notifications,
  Support,
  Admin,
} from "./Workspace";
import Dashboard from "./Dashboard";
import { Overview } from "./Overview";
import { Builder } from "./Builder";
import "./styles.css";
import "./platform.css";
import "./landing3d.css";
import "./theme.css";
import "./builder.css";
import "./builder-visual.css";
import "./traveler-sidebar.css";
import "./waypoint-sidebar.css";
import "./build-screens.css";
import "./inbox.css";
import "./support.css";
import "./profile.css";
import "./recovery-center.css";
import "./admin-trips.css";
import "./results-view.css";
import {
  currentPath,
  installNavigation,
  migrateLegacyRoute,
} from "./navigation";
migrateLegacyRoute();
class ErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    return this.state.error ? (
      <div className="empty">
        <h2>We hit a bump in the road.</h2>
        <p>{this.state.error.message}</p>
        <button className="button" onClick={() => location.reload()}>
          Reload application
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
function App() {
  const [user, setUser] = useState(null),
    [loading, setLoading] = useState(true),
    [path, setPath] = useState(currentPath()),
    [error, setError] = useState("");
  const refresh = async () => {
    const r = await api("auth/me");
    setUser(r.user);
    return r.user;
  };
  useEffect(() => {
    refresh()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

    return installNavigation(setPath);
  }, []);
  const page = path.split("/")[0].split("?")[0];
  useEffect(() => {
    if (
      !loading &&
      !user &&
      !["", "login", "signup", "forgot", "reset", "verify"].includes(page)
    )
      go("login?next=" + encodeURIComponent("/" + path));
  }, [loading, user, page]);
  if (loading)
    return (
      <div className="loading">
        <Compass size={40} />
        <p>Finding your bearings…</p>
      </div>
    );
  if (error)
    return (
      <div className="empty">
        <h2>Unable to reach Waypoint.</h2>
        <p>{error}</p>
        <button className="button" onClick={() => location.reload()}>
          Try again
        </button>
      </div>
    );
  if (!page) return <Landing user={user} />;
  if (["login", "signup", "forgot", "reset", "verify"].includes(page))
    return <AuthPage key={path} mode={page} onAuth={refresh} />;
  if (!user) return null;
  const logout = async () => {
    await api("auth/logout", {});
    setUser(null);
    go("");
  };
  if (page === "trip")
    return (
      <Dashboard
        key={path.split("/")[1]}
        tripId={path.split("/")[1]}
        logout={logout}
        section={path.split("/")[2]?.split("?")[0] || "overview"}
        user={user}
      />
    );
  if (page === "admin" && user.role === "admin")
    return (
      <Admin
        user={user}
        logout={logout}
        section={path.split("/")[1]?.split("?")[0] || "overview"}
      />
    );
  return (
    <TravelerShell user={user} logout={logout} page={page}>
      {page === "dashboard" ? (
        <Overview user={user} />
      ) : page === "build" ? (
        <Builder key={path} user={user} id={path.split("/")[1]?.split("?")[0] || ""} />
      ) : page === "trips" ? (
        <TripList user={user} />
      ) : page === "account" ? (
        <Account user={user} refresh={refresh} />
      ) : page === "notifications" ? (
        <Notifications />
      ) : page === "support" ? (
        <Support />
      ) : (
        <div className="empty">
          <h2>This page isn’t available.</h2>
          <a className="button" href="/trips">
            Back to my trips
          </a>
        </div>
      )}
    </TravelerShell>
  );
}
createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
