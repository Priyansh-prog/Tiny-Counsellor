# PROMPT_SUMMARY — TinyCounsellor working journal

> One-day prototype: JEE Main rank → illustrative NIT/IIIT option list.
> Stack: npm workspaces (`client/` React 19 + TS + Vite 7, `server/` Express 5 + better-sqlite3), shared types in `shared/types.ts`.
> RECONSTRUCTION NOTICE (2026-10-22): Tasks 1–7 are a faithful reconstruction from session history; this file had never been written to disk before Task 8 ("everything marked" discipline restored here).

## Task 1 — Project skeleton
- Repo initialized (git, main branch); `package.json` with workspaces `client`, `server`; typecheck script runs both `tsc --noEmit`.
- Server: Express 5, better-sqlite3 (prebuilt SQLite file in `server/data/tiny-counsellor.db`), `tsx` dev runner, `vitest` tests, `server/.env` pending (M4a).
- Client: Vite 7 + react-ts, dev server on :5173 with proxy `/api` → `http://localhost:4000`.

## Task 2 — Shared contract + domain data
- `shared/types.ts`: `PlanRequest`/`PlanResponse`, `Tier` ("Safe" | "Target" | "Reach"), `GOAL_IDS`, `GOALS` (computer-science / electronics / core-engineering / undecided), `QUOTA_LABELS` (OS → "Other State", AI → "All India").
- Pools fixed for the demo: NITs → OS, IIITs → AI.
- Tier thresholds (explicitly UNVALIDATED vs official JoSAA semantics): Safe ≥ round(1.43 × rank), Target ≥ round(0.91 × rank), Reach ≥ round(0.71 × rank).

## Task 3 — Server domain logic
- `server/src/migrations/001_init.sql` (schema v1) + `002_rank_type.sql` (v2): institutions, branches, sources, cutoffs, goal mappings; migration version tracked in `server/src/db.ts` (`npm run db:migrate -w server` → `migration version: 2`).
- `server/src/lib/`: `validate.ts` (rank 1..2,000,000 integer, quota, goalId, includeTypes, maxSize 1..50), `scoring.ts` (tier bands above), `planner.ts` (pool = NIT→OS / IIIT→AI; ordered draft of ≤ maxSize options; every option carries a `why` line: rank vs cutoff, form category "OPEN", quota label), `data.ts` (DB reads).
- `server/src/seed/seed.ts`: ILLUSTRATIVE seed — NIT Trichy CSE (OR 1500, CR 2800, published 2025 round 1), NIT Trichy ECE, IIIT Allahabad IT (no cutoffs, 60 seats); seed immutability enforced via sources table (`illustrative://tiny-counsellor/seed-v1`).
- API: `GET /api/health` → `{ok: true, db: {ready, migrationVersion}}`; `POST /api/plan` — valid JSON in/out; any handler error → `{ok:false, errors:[...]}`.
- Tests: `server/tests/{validate,scoring,planner}.test.ts` — 36 tests incl. exact threshold boundaries, pool routing, draft counts, ILLUSTRATIVE line presence.

## Task 4 — UI planning (reference-image redesign)
- Planned the redesigned per visual reference: centered topbar card (logo tile, brand + subtitle, Live-data status pill, GitHub icon-link), dark gradient dataset card, split hero (left title/CTA, right card rail), 3-step "How it works", sample results card with tier chips + numbered option rows, planner two-column layout with sticky form column, responsive/mobile-first, reduced-motion respected.
- Task 4b — journal reconstruction note (same pattern as this file's reconstruction).

## Task 5 — Phase 1 E2E verification (bounded HTTP probes; NO browser)
- Verified via real `:5173` Vite proxy: modules 200, `/api/health` 200 `{"ok":true,"db":{"ready":true,"migrationVersion":2}}`, `POST /api/plan` (rank 3000, OS, CS) → 200 3 explained options; `rank: 0` → 400 `{"ok":false,"errors":["rank must be an integer between 1 and 2000000."]}`.
- Checks run: `npm run typecheck` ✓, `npm test` → 36/36 ✓, `npm run build -w client` ✓.
- Unverified items logged: tier-band semantics, visual/browser behavior, seed provenance URLs (M4a).

## Task 6 — Planner UI build
- `PlannerPage` (numbered card stack: rank+category+quota form → goal/family/type/size → generate → results), `PlanForm` (numeric rank input, quota select, tier pills, ILLUSTRATIVE banner), `PlanResults` (options with tier chips, `why` text, draft actions row + copy/clear icon-buttons, counts row Safe/Target/Reach/No-data), paste-plan block, desktop sticky form column.
- Live composite verified through proxy at the time: UI renders options list + counts; validation surfaces the API's error array verbatim.

## Task 7 — Visual redesign implemented (no browser available)
- Rewrote `client/src/index.css` as a design system: `:root` tokens, topbar/status-pill, dataset card (`dc-*`), hero (`hero-wrap` split), steps grid, sample card, planner `.layout` (400px sticky column at ≥980px), options list counters, buttons/pills, media 480/640/900/980 + reduced-motion.
- Components restyled: `SiteHeader` (status pill wired to `/api/health`), `LandingPage`, `PlannerPage`, `PlanForm`, `PlanResults` (`SiteFooter` states one-day-demo limits).
- Desktop hero ordering improvement landed in Task 8 restore: explicit `grid-template-areas` ("hero rail") so hero is left / rail right at ≥900px (previous version relied on DOM order and put the rail left).
- Verification remained HTTP/typecheck/test/build only; visual check deferred (no browser tool available).

## Task 8 — Comment removal + HTTP 500 diagnosis (2026-10-22, actual results)
- **Comment strip**: manifest-driven script (temp dir, not repo) over 15 files — removed full-line `//`, `/*…*/`, `--` comments + truncated trailing ` // …` comments + collapsed doubled blank lines. TOTAL: 91 full-line + 3 trailing (all trailing were earlier code lines in `planner.test.ts`; assertions kept). Files: server src (index, seed, lib/*, scripts/db{Reset,Verify}), migrations SQL headers (001: lines 1–3, 002: lines 1–4), client App/PlanResults/index.css, tests scoring/planner.
  - INCIDENT + FIX: the `--` prefix rule also matched CSS custom properties (`--token:`) and deleted ~26 token lines (all of `:root` in `client/src/index.css`). Restored the file verbatim (functional-only change kept: desktop hero grid `grid-template-areas`). Post-restore grep confirms NO comments remain project-wide; counts in all other files matched expectations exactly.
  - URL-string safety held: no line containing `illustrative://…` or `https://www.nitt.edu/` was modified.
- **HTTP 500 root cause (proven live)**: planner's exact string "Planning failed with HTTP status 500" appears ONLY when the response is a 5xx WITHOUT the JSON `{ok:false}` contract. Reproduced: killing only the Express server while Vite stayed up → `POST :5173/api/plan` → HTTP 500, `content-type: text/plain`, empty body (Vite proxy ECONNREFUSED mapping). In-process backend never produced 500 for the user's payload.
  - Trigger mechanism: dev runs `tsx watch`; every server-file save restarts Express (1–2s outage) — the comment-strip saved 8 server backend files → a submit inside such a window latched the sticky error even after recovery. Variant: sustained outage on boot failure (port conflict).
  - Exact screenshot payload verified healthy THROUGH the proxy: `{"rank":12000,"category":"OPEN","quota":"OS","goalId":"computer-science","preferredFamilies":["cse"],"maxSize":30}` → 200 with plan; `rank:0` → 400 JSON contract intact.
- **Fixes (minimal, behavior-preserving)**:
  - `client/src/api.ts`: non-JSON 5xx fallback now reads "Planning failed with HTTP status NNN. The backend may have been restarting or is offline — press 'Generate plan' again in a few seconds." (JSON error contract unchanged).
  - `server/src/index.ts`: `app.listen` now error-aware — EADDRINUSE prints an actionable port-in-use message; other listen errors logged; process exits so tsx watch shows the crash.
- **Verification**: `typecheck` ✓, 36/36 tests ✓, `build -w client` ✓; live via proxy after fixes: health 200 v2, valid payload 200, rank 0 → 400 `{"ok":false,...}`; stale-string grep → only the new message remains.
- **Not verified / residual risk**: no browser-based check of the new fallback message or redesigned visuals; the 1–2s restart-window race was inferred + bounded by the kill experiment, not a timed reproduction; everything remains UNCOMMITTED (git: zero commits, all untracked) — commit only on explicit request.
- **Still pending**: M4a awaits user approval (sources.kind Option A widen-CHECK vs Option B "manual"; allowlist URL confirmation); `server/.env` not yet created.
