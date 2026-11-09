-- Additive category-specific listing fields; existing ads and settings are preserved.
ALTER TABLE ads ADD COLUMN details_json TEXT NOT NULL DEFAULT '{}';
