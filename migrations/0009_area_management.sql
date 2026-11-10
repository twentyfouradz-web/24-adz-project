-- Additive support for Admin-managed local areas. Existing areas tables are left untouched.
CREATE TABLE IF NOT EXISTS areas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  district_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(district_id, name)
);
CREATE INDEX IF NOT EXISTS idx_areas_district_name ON areas(district_id, name);
