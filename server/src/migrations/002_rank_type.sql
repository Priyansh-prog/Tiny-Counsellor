ALTER TABLE snapshots ADD COLUMN rank_type TEXT NOT NULL DEFAULT 'CRL' CHECK (rank_type IN ('CRL'));
