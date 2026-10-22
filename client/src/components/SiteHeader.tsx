import type { ApiHealthState } from "../api";

type Props = {
  health: ApiHealthState;
  left: { label: string; href: string } | null;
};

function StatusPill({ health }: { health: ApiHealthState }) {
  const cls = health.api === "ok" ? "is-ok" : health.api === "down" ? "is-down" : "";
  const label =
    health.api === "checking"
      ? "Checking API"
      : health.api === "ok"
        ? `API connected${health.db ? ` · schema v${health.db.migrationVersion}` : ""}`
        : "API offline";
  return (
    <span className={`status-pill ${cls}`}>
      <span className="dot" aria-hidden="true" />
      {label}
    </span>
  );
}

export default function SiteHeader({ health, left }: Props) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        {left && (
          <a className="icon-link" href={left.href} aria-label={left.label}>
            ←
          </a>
        )}
        <div className="logo-tile" aria-hidden="true">
          TC
        </div>
        <div>
          <div className="brand-name">TinyCounsellor</div>
          <div className="brand-sub">JEE Main → JoSAA choice planner</div>
        </div>
      </div>
      <div className="topbar-right">
        <StatusPill health={health} />
      </div>
    </header>
  );
}
