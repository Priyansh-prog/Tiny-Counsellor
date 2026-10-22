import { useState } from "react";
import { postPlan, type ClientError } from "../api";
import type { PlanOption, PlanRequest, PlanResponse } from "../../../shared/types.js";
import PlanForm from "./PlanForm";
import PlanResults from "./PlanResults";

export default function PlannerPage() {
  const [result, setResult] = useState<PlanResponse | null>(null);
  const [list, setList] = useState<PlanOption[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const generate = (req: PlanRequest) => {
    if (busy) return;
    setBusy(true);
    setErrors([]);
    postPlan(req)
      .then((r) => {
        setResult(r);
        setList(r.options);
      })
      .catch((e: unknown) => {
        const ce = e as Partial<ClientError>;
        if (Array.isArray(ce.errors)) setErrors(ce.errors);
        else if (e instanceof Error)
          setErrors(["Cannot reach the TinyCounsellor API. Is the backend running?", e.message]);
        else setErrors([String(e)]);
      })
      .finally(() => setBusy(false));
  };

  const move = (i: number, dir: -1 | 1) => {
    setList((cur) => {
      const j = i + dir;
      if (j < 0 || j >= cur.length) return cur;
      const next = [...cur];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const remove = (i: number) => setList((cur) => cur.filter((_, j) => j !== i));

  const showEmptyIntro = !result && !busy && errors.length === 0;
  const resultReturnedButEmpty = result !== null && result.options.length === 0;
  const draftCleared = result !== null && result.options.length > 0 && list.length === 0;

  return (
    <main className="page">
      <div className="planner-head">
        <span className="eyebrow">
          <span className="dot" aria-hidden="true" />
          CHOICE PLANNER
        </span>
        <h2>Build your choice plan</h2>
        <p className="sub">
          1 — Enter your details. 2 — Generate the plan. 3 — Review every cutoff with its source. 4 — Draft your
          shortlist locally. You always lock and submit your own choices in the official JoSAA portal.
        </p>
      </div>

      <div className="layout">
        <div className="col-form">
          <div className="card card-pad">
            <h3 className="card-title">
              <span className="mini-number" aria-hidden="true">
                1
              </span>
              Your details
            </h3>
            <PlanForm busy={busy} onGenerate={generate} />
          </div>
        </div>

        <div className="col-results stack">
          {errors.length > 0 && (
            <div className="banner error" role="alert">
              {errors.map((e, i) => (
                <div key={i}>{e}</div>
              ))}
            </div>
          )}

          {busy && (
            <p className="loading-note">
              <span className="spin" aria-hidden="true" />
              Building your plan…
            </p>
          )}

          {resultReturnedButEmpty && (
            <div className="empty">
              <span className="empty-icon" aria-hidden="true">
                ∅
              </span>
              The dataset returned no options for this input. The current seed covers a small set of illustrative
              branches — try different branch preferences, or check back once official data is ingested.
            </div>
          )}

          {draftCleared && (
            <div className="empty">
              <span className="empty-icon" aria-hidden="true">
                ⟳
              </span>
              Draft emptied — every item was removed. Nothing was saved anywhere; generate again to rebuild the list
              from your last result.
            </div>
          )}

          {showEmptyIntro && (
            <div className="empty">
              <span className="empty-icon" aria-hidden="true">
                ▤
              </span>
              Your generated plan will appear here — every option with its tier, OR/CR ranks, seats and a source link.
              Tiers decide what is included; your goal decides the order. "No data" states are shown honestly, never
              filled in.
            </div>
          )}

          {result && result.options.length > 0 && (
            <PlanResults result={result} list={list} onMove={move} onRemove={remove} />
          )}
        </div>
      </div>
    </main>
  );
}
