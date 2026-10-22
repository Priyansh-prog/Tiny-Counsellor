import { useEffect, useState } from "react";
import { getHealth, type ApiHealthState } from "./api";
import LandingPage from "./components/LandingPage";
import PlannerPage from "./components/PlannerPage";
import SiteHeader from "./components/SiteHeader";

function readRoute(): string {
  return window.location.hash.replace(/^#/, "").split("?")[0] || "/";
}

function useHashRoute(): string {
  const [route, setRoute] = useState(readRoute);
  useEffect(() => {
    const onHashChange = () => {
      setRoute(readRoute());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);
  return route;
}

export default function App() {
  const route = useHashRoute();
  const [health, setHealth] = useState<ApiHealthState>({ api: "checking" });

  useEffect(() => {
    getHealth()
      .then((h) => setHealth({ api: "ok", db: h.db }))
      .catch(() => setHealth({ api: "down" }));
  }, []);

  const onPlanner = route.startsWith("/planner");

  return (
    <div className="shell">
      <SiteHeader health={health} left={onPlanner ? { label: "Back to home", href: "#/" } : null} />
      {onPlanner ? <PlannerPage /> : <LandingPage health={health} />}
      <footer className="site-footer">
        Privacy: no accounts · no tracking
        <span className="foot-sep">·</span>
        Not affiliated with JoSAA or NTA
        <span className="foot-sep">·</span>
        © 2026 TinyCounsellor
      </footer>
    </div>
  );
}
