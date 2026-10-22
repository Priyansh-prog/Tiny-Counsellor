import type Database from "better-sqlite3";
import type { Quota } from "../../../shared/types.js";

export type CatalogueItem = {
  branchId: number;
  branchName: string;
  family: string;
  degree: string;
  instituteId: number;
  instituteName: string;
  instituteShort: string | null;
  instituteCity: string | null;
  instituteType: string;
};

export type CutoffRow = {
  branchId: number;
  snapshotId: number;
  round: string;
  snapRound: string;
  quota: Quota;
  category: string;
  openingRank: number | null;
  closingRank: number | null;
  year: number;
  ingestedAt: string;
  isIllustrative: boolean;
  rankType: string;
  source: { url: string; dataYear: number; kind: string; publisher: string };
};

export type SeatRow = { branchId: number; snapshotId: number; totalSeats: number | null };

export type PlannerData = {
  catalogue: CatalogueItem[];
  rows: CutoffRow[];
  seats: SeatRow[];
};

type CatalogueRaw = {
  branchId: number;
  branchName: string;
  family: string;
  degree: string;
  instituteId: number;
  instituteName: string;
  instituteShort: string | null;
  instituteCity: string | null;
  instituteType: string;
};

type RowRaw = {
  branchId: number;
  snapshotId: number;
  round: string;
  snapRound: string;
  quota: string;
  category: string;
  openingRank: number | null;
  closingRank: number | null;
  year: number;
  ingestedAt: string;
  isIllustrativeRaw: number;
  rankType: string;
  srcUrl: string;
  srcDataYear: number;
  srcKind: string;
  srcPublisher: string;
};

type SeatRaw = { branchId: number; snapshotId: number; totalSeats: number | null };

export function loadPlannerData(db: Database.Database): PlannerData {
  const catalogue = db
    .prepare(
      `SELECT b.id AS branchId, b.name AS branchName, b.branch_family AS family, b.degree AS degree,
              i.id AS instituteId, i.name AS instituteName, i.short_name AS instituteShort,
              i.city AS instituteCity, i.institute_type AS instituteType
       FROM branches b
       JOIN institutes i ON i.id = b.institute_id
       ORDER BY b.id`
    )
    .all() as unknown as CatalogueRaw[];

  const rawRows = db
    .prepare(
      `SELECT c.branch_id AS branchId, c.snapshot_id AS snapshotId, c.round AS round,
              s.round AS snapRound, c.quota AS quota, c.category AS category,
              c.opening_rank AS openingRank, c.closing_rank AS closingRank,
              s.year AS year, s.ingested_at AS ingestedAt, s.is_illustrative AS isIllustrativeRaw,
              s.rank_type AS rankType, src.url AS srcUrl, src.data_year AS srcDataYear,
              src.kind AS srcKind, src.publisher AS srcPublisher
       FROM cutoffs c
       JOIN snapshots s ON s.id = c.snapshot_id
       JOIN sources src ON src.id = s.source_id
       ORDER BY s.ingested_at, s.id, c.id`
    )
    .all() as unknown as RowRaw[];

  const rows: CutoffRow[] = rawRows.map((r) => ({
    branchId: r.branchId,
    snapshotId: r.snapshotId,
    round: r.round,
    snapRound: r.snapRound,
    quota: r.quota as Quota,
    category: r.category,
    openingRank: r.openingRank,
    closingRank: r.closingRank,
    year: r.year,
    ingestedAt: r.ingestedAt,
    isIllustrative: r.isIllustrativeRaw === 1,
    rankType: r.rankType,
    source: { url: r.srcUrl, dataYear: r.srcDataYear, kind: r.srcKind, publisher: r.srcPublisher },
  }));

  const seats = db
    .prepare(
      `SELECT st.branch_id AS branchId, st.snapshot_id AS snapshotId, st.total_seats AS totalSeats
       FROM seats st`
    )
    .all() as unknown as SeatRaw[];

  return { catalogue, rows, seats };
}
