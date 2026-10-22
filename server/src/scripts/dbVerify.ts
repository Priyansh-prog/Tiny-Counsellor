import assert from "node:assert/strict";
import { db, migrationVersion } from "../db.js";
import { runSeed } from "../seed/seed.js";

let failed = false;
try {
  const tables = (
    db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").all() as { name: string }[]
  )
    .map((r) => r.name)
    .sort();
  assert.deepEqual(
    tables,
    ["branches", "cutoffs", "institutes", "seats", "snapshots", "sources"],
    "schema must contain exactly the six tables"
  );
  assert.ok(migrationVersion >= 1, "at least one migration must be applied");

  assert.equal(db.pragma("foreign_keys", { simple: true }), 1, "foreign_keys must be ON");

  runSeed();
  const tableNames = ["sources", "snapshots", "institutes", "branches", "seats", "cutoffs"];
  const count = (t: string) => (db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get() as { n: number }).n;
  const first = tableNames.map((t) => [t, count(t)] as [string, number]);
  runSeed();
  const second = tableNames.map((t) => [t, count(t)] as [string, number]);
  assert.deepEqual(second, first, "seed must be idempotent");

  let fkBlocked = false;
  try {
    db.prepare(
      "INSERT INTO cutoffs (branch_id, snapshot_id, quota, category, round, opening_rank, closing_rank) VALUES (999999, 1, 'OS', 'OPEN', '1', 100, 200)"
    ).run();
  } catch (err) {
    fkBlocked = String(err).includes("FOREIGN KEY");
  }
  db.prepare("DELETE FROM cutoffs WHERE branch_id = 999999").run();
  assert.ok(fkBlocked, "foreign-key violation must be rejected");

  assert.ok((first.find(([t]) => t === "cutoffs")![1]) > 0, "seed must contain cutoffs");
  const traced = (
    db.prepare(
      `SELECT COUNT(*) AS n
       FROM cutoffs c
       JOIN snapshots s ON s.id = c.snapshot_id
       JOIN sources src ON src.id = s.source_id
       WHERE s.is_illustrative = 1 AND src.kind = 'illustrative'`
    ).get() as { n: number }
  ).n;
  assert.equal(traced, count("cutoffs"), "every cutoff must trace to an illustrative snapshot+source");

  const itCutoffs = (
    db.prepare(
      "SELECT COUNT(*) AS n FROM cutoffs c JOIN branches b ON b.id = c.branch_id WHERE b.branch_family = 'IT'"
    ).get() as { n: number }
  ).n;
  assert.equal(itCutoffs, 0, "IT branch must have no cutoff rows (no-data case)");

  const badRanks = (
    db.prepare(
      "SELECT COUNT(*) AS n FROM cutoffs WHERE opening_rank < 1 OR closing_rank > 2000000 OR closing_rank < opening_rank"
    ).get() as { n: number }
  ).n;
  assert.equal(badRanks, 0, "ranks must be plausible and closing >= opening");

  const official = (
    db.prepare("SELECT COUNT(*) AS n FROM sources WHERE kind != 'illustrative'").get() as { n: number }
  ).n;
  assert.equal(official, 0, "M1 must contain only illustrative sources");

  console.log(
    "db:verify PASSED. Table counts:",
    JSON.stringify(Object.fromEntries(second))
  );
  console.log("Every seeded cutoff traces to an illustrative snapshot + source URL; FKs enforced; seed repeatable.");
} catch (err) {
  failed = true;
  console.error("db:verify FAILED:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
}
