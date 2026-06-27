ALTER TABLE watch_history
    ADD COLUMN IF NOT EXISTS progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0);

ALTER TABLE watch_history
    ADD COLUMN IF NOT EXISTS complete BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE watch_history
SET progress = 0
WHERE progress IS NULL;

UPDATE watch_history
SET complete = FALSE
WHERE complete IS NULL;

ALTER TABLE watch_history
    ALTER COLUMN progress SET DEFAULT 0,
    ALTER COLUMN progress SET NOT NULL,
    ALTER COLUMN complete SET DEFAULT FALSE,
    ALTER COLUMN complete SET NOT NULL;

WITH ranked AS (
    SELECT id,
           ROW_NUMBER() OVER (
               PARTITION BY user_id, imdbid
               ORDER BY watched_at DESC, id DESC
           ) AS rn
    FROM watch_history
)
DELETE FROM watch_history h
USING ranked r
WHERE h.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS watch_history_user_id_imdbid_key
    ON watch_history (user_id, imdbid);
