import { useState } from "react";
import type { FormEvent } from "react";
import {
  GOAL_IDS,
  GOALS,
  QUOTA_LABELS,
  SUPPORTED_QUOTAS,
  SUPPORTED_TIERS,
  type PlanRequest,
  type Quota,
  type Tier,
} from "../../../shared/types.js";

type Props = { busy: boolean; onGenerate: (req: PlanRequest) => void };

const RANK_MAX = 2_000_000;
const SIZE_MAX = 50;

export default function PlanForm({ busy, onGenerate }: Props) {
  const [rank, setRank] = useState("12000");
  const [quota, setQuota] = useState<Quota>("OS");
  const [goalId, setGoalId] = useState<(typeof GOAL_IDS)[number]>("computer-science");
  const [families, setFamilies] = useState("");
  const [tiers, setTiers] = useState<Tier[]>([...SUPPORTED_TIERS]);
  const [maxSize, setMaxSize] = useState("30");
  const [formError, setFormError] = useState<string | null>(null);

  const toggleTier = (t: Tier) =>
    setTiers((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const rankNum = Number(rank);
    if (!Number.isInteger(rankNum) || rankNum < 1 || rankNum > RANK_MAX) {
      setFormError(`Rank must be a whole number between 1 and ${RANK_MAX.toLocaleString()}.`);
      return;
    }
    let size: number | undefined;
    if (maxSize !== "") {
      size = Number(maxSize);
      if (!Number.isInteger(size) || size < 1 || size > SIZE_MAX) {
        setFormError(`Max shortlist size must be a whole number between 1 and ${SIZE_MAX}.`);
        return;
      }
    }
    if (tiers.length === 0) {
      setFormError("Include at least one tier (Safe, Target or Reach) — there is nothing to plan otherwise.");
      return;
    }

    const preferredFamilies = families
      .split(",")
      .map((f) => f.trim())
      .filter((f) => f.length > 0);

    onGenerate({
      rank: rankNum,
      category: "OPEN",
      quota,
      goalId,
      preferredFamilies: preferredFamilies.length > 0 ? preferredFamilies : undefined,
      includeTypes: [...tiers],
      maxSize: size,
    });
  };

  return (
    <form onSubmit={submit} noValidate>
      <div className="fgroup">
        <span>
          JEE Main rank (CRL) <span className="hint">— compared against last year's closing ranks</span>
        </span>
        <input
          className="field"
          type="number"
          inputMode="numeric"
          min={1}
          max={RANK_MAX}
          value={rank}
          onChange={(e) => setRank(e.target.value)}
          required
        />
      </div>

      <div className="grid2">
        <div className="fgroup">
          <span>
            Seat pool (quota) <span className="hint">— your comparison pool</span>
          </span>
          <select className="select" value={quota} onChange={(e) => setQuota(e.target.value as Quota)}>
            {SUPPORTED_QUOTAS.map((q) => (
              <option key={q} value={q}>
                {q} — {QUOTA_LABELS[q]}
              </option>
            ))}
          </select>
        </div>
        <div className="fgroup">
          <span>
            Career goal <span className="hint">— sets the order</span>
          </span>
          <select
            className="select"
            value={goalId}
            onChange={(e) => setGoalId(e.target.value as (typeof GOAL_IDS)[number])}
          >
            {GOAL_IDS.map((id) => (
              <option key={id} value={id}>
                {GOALS[id].label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid2">
        <div className="fgroup">
          <span>Category</span>
          <select className="select" value="OPEN" disabled aria-label="Category">
            <option value="OPEN">OPEN — only category in the MVP</option>
          </select>
          <span className="hint">Widening needs a DB migration, not just a UI change.</span>
        </div>
        <div className="fgroup">
          <span>
            Max shortlist size <span className="hint">— default 30</span>
          </span>
          <input
            className="field"
            type="number"
            inputMode="numeric"
            min={1}
            max={SIZE_MAX}
            value={maxSize}
            onChange={(e) => setMaxSize(e.target.value)}
          />
        </div>
      </div>

      <div className="fgroup">
        <span>
          Preferred branch families <span className="hint">— optional, overrides the goal order</span>
        </span>
        <input
          className="field"
          value={families}
          onChange={(e) => setFamilies(e.target.value)}
          placeholder="e.g. CSE, ECE"
        />
        <span className="hint">Comma-separated codes. Unknown codes are kept, warned about, and match nothing — never invented.</span>
      </div>

      <div className="fgroup">
        <span>
          Tiers to include <span className="hint">— tiers decide what is included; the goal still decides the order</span>
        </span>
        <div className="tier-set">
          {SUPPORTED_TIERS.map((t) => (
            <label key={t} className="tier-pill">
              <input type="checkbox" checked={tiers.includes(t)} onChange={() => toggleTier(t)} />
              {t}
            </label>
          ))}
        </div>
      </div>

      {formError && (
        <p className="form-error" role="alert">
          {formError}
        </p>
      )}

      <button type="submit" className="btn-primary btn-block" disabled={busy}>
        {busy ? "Planning…" : "Generate plan"}
      </button>
    </form>
  );
}
