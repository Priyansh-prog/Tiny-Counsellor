import type { ApiHealthState } from "../api";

type Props = { health: ApiHealthState };

function DatasetCard({ health }: Props) {
  const live = health.api === "ok" && (health.db?.ready ?? false);
  return (
    <section className="dataset-card">
      <div className="dc-row">
        <span className="dc-pill">◈ CURRENT DATASET</span>
        <span className={`dc-live ${live ? "is-live" : ""}`}>
          <span className="dot" aria-hidden="true" />
          {health.api === "checking" ? "checking…" : live ? "SQLite · ready" : "offline"}
        </span>
      </div>
      <h2 className="dc-title">JEE Main → JoSAA (CRL)</h2>
      <p className="dc-sub">
        OPEN category · Other-State (OS) &amp; All-India (AI) pools
        {health.db ? ` · schema v${health.db.migrationVersion}` : ""} · data year 2025, round 1
      </p>
      {live ? (
        <p className="dc-note">
          ✓ Illustrative seed loaded — the numbers are made-up samples, not official JoSAA data. Official ingestion is
          the next milestone.
        </p>
      ) : (
        <p className="dc-note warn">
          {health.api === "down"
            ? "⚠ Backend offline — start it with 'npm run dev'. This page reconnects on reload; the planner works once connected."
            : "Contacting the backend…"}
        </p>
      )}
    </section>
  );
}

function SampleCard() {
  return (
    <section className="sample">
      <div className="sample-head">
        <span className="mini-check" aria-hidden="true">
          ✓
        </span>
        <b>Sample result card</b>
        <span className="badge-soft">Illustrative seed</span>
      </div>
      <div className="sample-card">
        <article className="option">
          <div className="option-top">
            <span className="inst-tile" aria-hidden="true">
              NIT
            </span>
            <div className="opt-stack">
              <strong>NIT Tiruchirappalli</strong>
              <div className="opt-sub">Computer Science &amp; Engineering · B.Tech (4 yr)</div>
            </div>
            <span className="chip tier-target">Target</span>
          </div>
          <div className="opt-meta">
            <span>
              OR: <strong>1,500</strong>
            </span>
            <span>
              Your sample rank: <strong>3,000</strong>
            </span>
            <span>
              CR: <strong>2,800</strong> · 2025, round 1
            </span>
          </div>
          <div className="opt-foot">
            <span className="foot-ok">✓ Tier computed by the planner's own (unvalidated) heuristic</span>
            <span className="foot-right">Not official data</span>
          </div>
        </article>
        <p className="sample-note">
          <span aria-hidden="true">✎</span>
          Values are the illustrative seed numbers (made up, clearly labelled). Your real plan renders this same card
          from your rank — with source links and honest "No data" rows where the dataset has gaps.
        </p>
      </div>
    </section>
  );
}

const STEPS: { title: string; text: string }[] = [
  {
    title: "Enter your details",
    text: "JEE Main CRL rank, seat pool (OS or AI) and your career goal — or your own branch-family preference order.",
  },
  {
    title: "Get a sourced order",
    text: "Options ranked by your goal first, with OR/CR ranks, seats and a source link for every cutoff. Tiers decide inclusion only.",
  },
  {
    title: "Draft locally",
    text: "Reorder or remove items in a browser-only draft. Locking and submission always happen in the official JoSAA portal — by you.",
  },
];

export default function LandingPage({ health }: Props) {
  const scrollToHow = () => {
    document.getElementById("how-steps")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <main className="landing page">
      <div className="hero-wrap">
        <div className="rail">
          <DatasetCard health={health} />
        </div>

        <section className="hero">
          <span className="eyebrow">
            <span className="dot" aria-hidden="true" />
            SOURCE-FIRST COUNSELLING PLANNER
          </span>
          <h1 className="hero-title">
            Don't just see what you can get.
            <br />
            <span className="accent">Decide what you should choose.</span>
          </h1>
          <p className="lede">
            A structured choice-list planner for JEE Main → JoSAA. Your career goal sets the order; historical
            OPEN-category cutoffs carry their source and data year; missing data is shown as "No data" — never
            invented.
          </p>
          <div className="cta-row">
            <a className="btn-primary" href="#/planner">
              Build My Choice Order <span className="btn-arrow" aria-hidden="true">→</span>
            </a>
            <button type="button" className="ghost-link" onClick={scrollToHow}>
              <span aria-hidden="true">✦</span> How it works
            </button>
            <p className="assure">
              <span className="tick" aria-hidden="true">
                ✓
              </span>
              Free · no sign-up · nothing leaves your browser
            </p>
          </div>
        </section>
      </div>

      <section className="how" id="how-steps">
        <span className="eyebrow">
          <span className="dot" aria-hidden="true" />
          THE PROCESS
        </span>
        <div className="how-grid">
          {STEPS.map((s, i) => (
            <div className="step" key={s.title}>
              <span className="step-num">{i + 1}</span>
              <b>{s.title}</b>
              <p>{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <SampleCard />
    </main>
  );
}
