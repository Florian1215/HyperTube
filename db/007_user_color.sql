ALTER TABLE users
    ADD COLUMN IF NOT EXISTS color TEXT;

UPDATE users
SET color = 'purple'
WHERE color IS NULL OR color = '';

ALTER TABLE users
    ALTER COLUMN color SET NOT NULL;

ALTER TABLE users
    DROP CONSTRAINT IF EXISTS users_color_check;

ALTER TABLE users
    ADD CONSTRAINT users_color_check
    CHECK (color IN ('yellow', 'pink', 'green', 'purple', 'blue', 'red'));

ALTER TABLE users
    ALTER COLUMN color SET DEFAULT 'purple';
