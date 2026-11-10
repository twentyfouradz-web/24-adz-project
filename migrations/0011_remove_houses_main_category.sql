-- 24Adz.com: remove legacy Houses as a main category; keep property ads under Real Estate.
-- Safe to re-run. Existing Houses ads are preserved and reclassified as Real Estate.
UPDATE ads SET category='Real Estate' WHERE category='Houses';
UPDATE categories SET active=0 WHERE parent_id IS NULL AND slug='houses';
UPDATE categories SET active=0 WHERE parent_id=(SELECT id FROM categories WHERE slug='houses');
UPDATE categories SET active=1, sort_order=8 WHERE parent_id IS NULL AND slug='real-estate';
