import type { PlanOption, PlanResponse } from "../../../shared/types.js";

type Props = {
  result: PlanResponse;
  list: PlanOption[];
  onMove: (index: number, dir: -1 | 1) => void;
  onRemove: (index: number) => void;
};

function TierChip({ tier }: { tier: PlanOption["tier"] }) {
  if (tier === null) return <span className="chip tier-none">No data</span>;
  return <span className={`chip tier-${tier.toLowerCase()}`}>{tier}</span>;
}

function Source({ source }: { source: PlanOption["source"] }) {
  if (!source) return null;
  if (/^https?:/i.test(source.url)) {
    return (
      <>
        {" · "}
        <a href={source.url} target="_blank" rel="noreferrer">
          {source.dataYear} source ({source.kind})
        </a>
      </>
    );
  }
  return (
    <>
      {" · "}
      <span>
        {source.dataYear} data ({source.kind}: {source.url})
      </span>
    </>
  );
}

function countsRow(result: PlanResponse) {
  const rows: { label: string; n: number; cls: string }[] = [
    { label: "Safe", n: result.counts.safe, cls: "tier-safe" },
    { label: "Target", n: result.counts.target, cls: "tier-target" },
    { label: "Reach", n: result.counts.reach, cls: "tier-reach" },
    { label: "No data", n: result.counts.noData, cls: "tier-none" },
  ];
  return rows.filter((r) => r.n > 0);
}

export default function PlanResults({ result, list, onMove, onRemove }: Props) {
  const { basedOn, warnings } = result;
  return (
    <section className="stack">
      {basedOn?.isIllustrative && (
        <div className="banner">
          <b>Illustrative data.</b> The numbers below are made-up seed samples, NOT official JoSAA cutoffs.
        </div>
      )}

      {basedOn && (
        <div className="card card-pad meta-card">
          <b>Data snapshot</b> — {basedOn.rankType} ranks, year {basedOn.year}, round {basedOn.round} · ingested{" "}
          {new Date(basedOn.ingestedAt).toLocaleString()}
          <div className="opt-source">
            <Source source={{ url: basedOn.sourceUrl, dataYear: basedOn.dataYear, kind: "snapshot" }} />
          </div>
        </div>
      )}

      {warnings.length > 0 && (
        <ul className="warnings">
          {warnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      )}

      <div className="counts-row">
        {countsRow(result).map((c) => (
          <span key={c.label} className={`chip ${c.cls}`}>
            {c.label} · {c.n}
          </span>
        ))}
      </div>

      <ol className="options-list options-list-spaced">
        {list.map((o, i) => (
          <li key={`${o.institute.name}|${o.branch.name}`} className="option">
            <div className="option-top">
              <span className="inst-tile" aria-hidden="true">
                {o.institute.type}
              </span>
              <div className="opt-stack">
                <strong>{o.institute.shortName ?? o.institute.name}</strong>
                <div className="opt-sub">
                  {o.branch.name} · {o.branch.degree} · {o.branch.family}
                </div>
              </div>
              <div className="opt-right">
                <TierChip tier={o.tier} />
                <span className="opt-draft">
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => onMove(i, -1)}
                    disabled={i === 0}
                    aria-label="Move up in draft"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => onMove(i, 1)}
                    disabled={i === list.length - 1}
                    aria-label="Move down in draft"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => onRemove(i)}
                    aria-label="Remove from draft"
                  >
                    ✕
                  </button>
                </span>
              </div>
            </div>
            <div className="opt-meta">
              {o.cutoff ? (
                <>
                  <span>
                    OR: <strong>{o.cutoff.openingRank}</strong>
                  </span>
                  <span>
                    CR: <strong>{o.cutoff.closingRank}</strong> · {o.cutoff.year}, round {o.cutoff.round}
                  </span>
                </>
              ) : (
                <span>No cutoff data</span>
              )}
              <span>
                Seats: <strong>{o.seats ?? "no data"}</strong>
              </span>
              <span className="opt-src">
                <Source source={o.source} />
              </span>
            </div>
            <p className="opt-why">{o.explanation}</p>
          </li>
        ))}
      </ol>

      <p className="sample-note">
        <span aria-hidden="true">ⓘ</span>
        Historical cutoffs and Safe/Target/Reach bands describe where last year's ranks fell. They are guidance, not
        admission guarantees.
      </p>
      <p className="sample-note">
        <span aria-hidden="true">✎</span>
        ↑ / ↓ / ✕ edits stay in this browser only — nothing is saved or submitted anywhere. You always lock and submit
        your own choices in the official JoSAA portal.
      </p>
    </section>
  );
}
