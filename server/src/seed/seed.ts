import { db } from "../db.js";
import { pathToFileURL } from "node:url";

const SOURCE = {
  url: "illustrative://tiny-counsellor/seed-v1",
  publisher: "TinyCounsellor illustrative seed - NOT official JoSAA data",
  dataYear: 2025,
};

const INSTITUTES = [
  { name: "National Institute of Technology, Tiruchirappalli", shortName: "NIT Trichy", type: "NIT", city: "Tiruchirappalli", state: "Tamil Nadu", website: "https://www.nitt.edu/" },
  { name: "Indian Institute of Information Technology, Allahabad", shortName: "IIIT Allahabad", type: "IIIT", city: "Prayagraj", state: "Uttar Pradesh", website: "https://www.iiita.ac.in/" },
];

const BRANCHES = [
  { institute: "National Institute of Technology, Tiruchirappalli", name: "Computer Science and Engineering", degree: "B.Tech", years: 4, family: "CSE" },
  { institute: "National Institute of Technology, Tiruchirappalli", name: "Electronics and Communication Engineering", degree: "B.Tech", years: 4, family: "ECE" },
  { institute: "Indian Institute of Information Technology, Allahabad", name: "Information Technology", degree: "B.Tech", years: 4, family: "IT" },
];

const SEATS = [
  { institute: "National Institute of Technology, Tiruchirappalli", branch: "Computer Science and Engineering", quota: "OS", total: 30 },
  { institute: "National Institute of Technology, Tiruchirappalli", branch: "Electronics and Communication Engineering", quota: "OS", total: 40 },
  { institute: "Indian Institute of Information Technology, Allahabad", branch: "Information Technology", quota: "AI", total: 60 },
];

const CUTOFFS = [
  { institute: "National Institute of Technology, Tiruchirappalli", branch: "Computer Science and Engineering", round: "1", opening: 1500, closing: 2800 },
  { institute: "National Institute of Technology, Tiruchirappalli", branch: "Electronics and Communication Engineering", round: "1", opening: 4200, closing: 6100 },
];

const insertSource = db.prepare(
  "INSERT OR IGNORE INTO sources (url, publisher, data_year, kind, fetched_at) VALUES (?, ?, ?, 'illustrative', ?)"
);
const selectSourceId = db.prepare("SELECT id FROM sources WHERE url = ?");
const insertSnapshot = db.prepare(
  "INSERT OR IGNORE INTO snapshots (source_id, year, round, ingested_at, is_illustrative, note) VALUES (?, ?, ?, ?, 1, ?)"
);
const selectSnapshotId = db.prepare(
  "SELECT id FROM snapshots WHERE source_id = ? AND year = ? AND round = ?"
);
const insertInstitute = db.prepare(
  "INSERT OR IGNORE INTO institutes (name, short_name, institute_type, city, state, website_url) VALUES (?, ?, ?, ?, ?, ?)"
);
const selectInstituteId = db.prepare("SELECT id FROM institutes WHERE name = ?");
const insertBranch = db.prepare(
  "INSERT OR IGNORE INTO branches (institute_id, name, degree, duration_years, branch_family) VALUES (?, ?, ?, ?, ?)"
);
const selectBranchId = db.prepare(
  "SELECT id FROM branches WHERE institute_id = ? AND name = ?"
);
const insertSeat = db.prepare(
  "INSERT OR IGNORE INTO seats (branch_id, snapshot_id, quota, category, total_seats) VALUES (?, ?, ?, 'OPEN', ?)"
);
const insertCutoff = db.prepare(
  "INSERT OR IGNORE INTO cutoffs (branch_id, snapshot_id, quota, category, round, opening_rank, closing_rank) VALUES (?, ?, ?, 'OPEN', ?, ?, ?)"
);

export function runSeed(): void {
  const now = new Date().toISOString();
  db.transaction(() => {
    insertSource.run(SOURCE.url, SOURCE.publisher, SOURCE.dataYear, now);
    const sourceId = (selectSourceId.get(SOURCE.url) as { id: number }).id;

    insertSnapshot.run(sourceId, 2025, "1", now, "Illustrative seed - all ranks and seat counts are MADE UP, NOT official JoSAA data.");
    const snapshotId = (selectSnapshotId.get(sourceId, 2025, "1") as { id: number }).id;

    const instituteIds = new Map<string, number>();
    for (const i of INSTITUTES) {
      insertInstitute.run(i.name, i.shortName, i.type, i.city, i.state, i.website);
      instituteIds.set(i.name, (selectInstituteId.get(i.name) as { id: number }).id);
    }

    const branchIds = new Map<string, number>();
    for (const b of BRANCHES) {
      const instituteId = instituteIds.get(b.institute)!;
      insertBranch.run(instituteId, b.name, b.degree, b.years, b.family);
      branchIds.set(`${b.institute}|${b.name}`, (selectBranchId.get(instituteId, b.name) as { id: number }).id);
    }

    for (const s of SEATS) {
      insertSeat.run(branchIds.get(`${s.institute}|${s.branch}`)!, snapshotId, s.quota, s.total);
    }

    for (const c of CUTOFFS) {
      insertCutoff.run(branchIds.get(`${c.institute}|${c.branch}`)!, snapshotId, "OS", c.round, c.opening, c.closing);
    }
  })();
}

function runIfInvokedDirectly(): void {
  if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
    runSeed();
    console.log("Seed complete. Rows in DB:");
    for (const t of ["sources", "snapshots", "institutes", "branches", "seats", "cutoffs"]) {
      const n = (db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get() as { n: number }).n;
      console.log(`  ${t}: ${n}`);
    }
    console.log("All seeded facts are labelled illustrative - never treated as official JoSAA data.");
  }
}

runIfInvokedDirectly();
