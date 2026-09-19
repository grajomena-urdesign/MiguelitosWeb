CREATE UNIQUE INDEX IF NOT EXISTS members_username_unique
ON members(username COLLATE NOCASE)
WHERE username IS NOT NULL;
