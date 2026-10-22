import Database from "better-sqlite3";
import { mkdirSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const dataDir = fileURLToPath(new URL("../data/", import.meta.url));
mkdirSync(dataDir, { recursive: true });

export const db = new Database(join(dataDir, "tiny-counsellor.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

export function applyMigrations(): number {
  const migrationsDir = fileURLToPath(new URL("./migrations/", import.meta.url));
  const files = readdirSync(migrationsDir)
    .filter((f) => /^\d+_.+\.sql$/.test(f))
    .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

  let current = db.pragma("user_version", { simple: true }) as number;
  for (const file of files) {
    const version = parseInt(file, 10);
    if (version <= current) continue;
    db.transaction(() => {
      db.exec(readFileSync(join(migrationsDir, file), "utf8"));
      db.pragma(`user_version = ${version}`);
    })();
    current = version;
  }
  return current;
}

export const migrationVersion: number = applyMigrations();
