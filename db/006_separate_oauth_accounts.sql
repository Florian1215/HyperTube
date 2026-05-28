ALTER TABLE users
    DROP CONSTRAINT IF EXISTS users_email_key;

DROP INDEX IF EXISTS users_email_key;

CREATE UNIQUE INDEX IF NOT EXISTS users_password_email_key
    ON users (email)
    WHERE COALESCE(password_hash, '') <> '';
