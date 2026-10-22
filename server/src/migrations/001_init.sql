CREATE TABLE IF NOT EXISTS sources (
  id          INTEGER PRIMARY KEY,
  url         TEXT    NOT NULL UNIQUE,
  publisher   TEXT    NOT NULL,
  data_year   INTEGER NOT NULL CHECK (data_year BETWEEN 2000 AND 2100),
  kind        TEXT    NOT NULL CHECK (kind IN ('josaa', 'institute', 'manual', 'illustrative')),
  fetched_at  TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS snapshots (
  id              INTEGER PRIMARY KEY,
  source_id       INTEGER NOT NULL REFERENCES sources(id) ON DELETE RESTRICT,
  year            INTEGER NOT NULL CHECK (year BETWEEN 2000 AND 2100),
  round           TEXT    NOT NULL CHECK (round IN ('1', '2', '3', '4', '5', '6', 'final')),
  ingested_at     TEXT    NOT NULL,
  is_illustrative INTEGER NOT NULL DEFAULT 0 CHECK (is_illustrative IN (0, 1)),
  note            TEXT,
  UNIQUE (source_id, year, round)
);

CREATE TABLE IF NOT EXISTS institutes (
  id             INTEGER PRIMARY KEY,
  name           TEXT NOT NULL UNIQUE,
  short_name     TEXT,
  institute_type TEXT NOT NULL CHECK (institute_type IN ('IIT', 'NIT', 'IIIT', 'GFTI')),
  city           TEXT,
  state          TEXT,
  website_url    TEXT
);

CREATE TABLE IF NOT EXISTS branches (
  id             INTEGER PRIMARY KEY,
  institute_id   INTEGER NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  degree         TEXT NOT NULL,
  duration_years INTEGER CHECK (duration_years IS NULL OR duration_years BETWEEN 1 AND 6),
  branch_family  TEXT NOT NULL,
  UNIQUE (institute_id, name)
);

CREATE TABLE IF NOT EXISTS seats (
  id          INTEGER PRIMARY KEY,
  branch_id   INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  snapshot_id INTEGER NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
  quota       TEXT NOT NULL CHECK (quota IN ('OS', 'AI')),
  category    TEXT NOT NULL CHECK (category IN ('OPEN')),
  total_seats INTEGER CHECK (total_seats IS NULL OR total_seats > 0),
  UNIQUE (branch_id, snapshot_id, quota, category)
);

CREATE TABLE IF NOT EXISTS cutoffs (
  id           INTEGER PRIMARY KEY,
  branch_id    INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  snapshot_id  INTEGER NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
  quota        TEXT NOT NULL CHECK (quota IN ('OS', 'AI')),
  category     TEXT NOT NULL CHECK (category IN ('OPEN')),
  round        TEXT NOT NULL CHECK (round IN ('1', '2', '3', '4', '5', '6', 'final')),
  opening_rank INTEGER CHECK (opening_rank IS NULL OR opening_rank BETWEEN 1 AND 2000000),
  closing_rank INTEGER CHECK (closing_rank IS NULL OR closing_rank BETWEEN 1 AND 2000000),
  UNIQUE (branch_id, snapshot_id, quota, category, round),
  CHECK (opening_rank IS NULL OR closing_rank IS NULL OR closing_rank >= opening_rank)
);

CREATE INDEX idx_cutoffs_branch   ON cutoffs(branch_id);
CREATE INDEX idx_cutoffs_snapshot ON cutoffs(snapshot_id);
CREATE INDEX idx_seats_snapshot   ON seats(snapshot_id);
CREATE INDEX idx_branches_family  ON branches(branch_family);
CREATE INDEX idx_snapshots_source ON snapshots(source_id);
