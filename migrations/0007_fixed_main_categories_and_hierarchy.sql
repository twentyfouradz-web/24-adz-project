-- 24Adz has exactly six fixed main categories. Existing valid subcategories are retained.
UPDATE categories SET slug='legacy-' || id || '-' || slug WHERE parent_id IS NULL AND name NOT IN ('Cars','Bikes','Houses','Mobiles','Jobs','Personals');
UPDATE categories SET active=0
WHERE parent_id IS NULL AND name NOT IN ('Cars','Bikes','Houses','Mobiles','Jobs','Personals');
UPDATE categories SET active=0
WHERE parent_id IN (SELECT id FROM categories WHERE parent_id IS NULL AND name NOT IN ('Cars','Bikes','Houses','Mobiles','Jobs','Personals'));
INSERT OR IGNORE INTO categories(name,slug,parent_id,icon,sort_order,active,created_at) VALUES
 ('Cars','cars',NULL,'🚗',1,1,datetime('now')),
 ('Bikes','bikes',NULL,'🏍️',2,1,datetime('now')),
 ('Houses','houses',NULL,'🏠',3,1,datetime('now')),
 ('Mobiles','mobiles',NULL,'📱',4,1,datetime('now')),
 ('Jobs','jobs',NULL,'💼',5,1,datetime('now')),
 ('Personals','personals',NULL,'👤',6,1,datetime('now'));
UPDATE categories SET active=1,sort_order=CASE name WHEN 'Cars' THEN 1 WHEN 'Bikes' THEN 2 WHEN 'Houses' THEN 3 WHEN 'Mobiles' THEN 4 WHEN 'Jobs' THEN 5 WHEN 'Personals' THEN 6 ELSE sort_order END
WHERE parent_id IS NULL AND name IN ('Cars','Bikes','Houses','Mobiles','Jobs','Personals');
