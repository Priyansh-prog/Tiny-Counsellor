import { db } from "../db.js";

const removeCutoffs = db.prepare(
  "DELETE FROM cutoffs WHERE snapshot_id IN (SELECT id FROM snapshots WHERE is_illustrative = 1)"
);
const removeSeats = db.prepare(
  "DELETE FROM seats WHERE snapshot_id IN (SELECT id FROM snapshots WHERE is_illustrative = 1)"
);
const removeSnapshots = db.prepare("DELETE FROM snapshots WHERE is_illustrative = 1");
const removeSources = db.prepare("DELETE FROM sources WHERE kind = 'illustrative'");

const deleted: Record<string, number> = {};
db.transaction(() => {
  deleted.cutoffs = removeCutoffs.run().changes;
  deleted.seats = removeSeats.run().changes;
  deleted.snapshots = removeSnapshots.run().changes;
  deleted.sources = removeSources.run().changes;
})();

console.log("Reset illustrative data:", JSON.stringify(deleted));
console.log("Kept: institutes/branches (catalogue) and any non-illustrative (official) data.");
