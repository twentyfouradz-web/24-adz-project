-- 24Adz.com: seed the exact 27 subcategories shown on the approved homepage.
-- Safe to re-run: target rows are upserted by their unique slug.
-- Existing ads and old category rows are never deleted. Obsolete subcategories are deactivated.

-- Normalize the two legacy job labels to the exact homepage labels before seeding.
UPDATE categories
SET name='Full-time Jobs', slug='full-time-jobs'
WHERE parent_id=(SELECT id FROM categories WHERE name='Jobs' AND parent_id IS NULL)
  AND LOWER(name)='full time jobs';

UPDATE categories
SET name='Part-time Jobs', slug='part-time-jobs'
WHERE parent_id=(SELECT id FROM categories WHERE name='Jobs' AND parent_id IS NULL)
  AND LOWER(name)='part time jobs';

-- Cars (4)
INSERT INTO categories(name,slug,parent_id,icon,sort_order,active,created_at)
VALUES
 ('New Cars','new-cars',(SELECT id FROM categories WHERE name='Cars' AND parent_id IS NULL),'🚘',1,1,datetime('now')),
 ('Used Cars','used-cars',(SELECT id FROM categories WHERE name='Cars' AND parent_id IS NULL),'🚗',2,1,datetime('now')),
 ('Car Rentals','car-rentals',(SELECT id FROM categories WHERE name='Cars' AND parent_id IS NULL),'🚕',3,1,datetime('now')),
 ('Car Services','car-services',(SELECT id FROM categories WHERE name='Cars' AND parent_id IS NULL),'🛠️',4,1,datetime('now'))
ON CONFLICT(slug) DO UPDATE SET name=excluded.name,parent_id=excluded.parent_id,icon=excluded.icon,sort_order=excluded.sort_order,active=1;

-- Bikes (3)
INSERT INTO categories(name,slug,parent_id,icon,sort_order,active,created_at)
VALUES
 ('New Bikes','new-bikes',(SELECT id FROM categories WHERE name='Bikes' AND parent_id IS NULL),'🏍️',1,1,datetime('now')),
 ('Used Bikes','used-bikes',(SELECT id FROM categories WHERE name='Bikes' AND parent_id IS NULL),'🏍️',2,1,datetime('now')),
 ('Bike Services','bike-services',(SELECT id FROM categories WHERE name='Bikes' AND parent_id IS NULL),'🔧',3,1,datetime('now'))
ON CONFLICT(slug) DO UPDATE SET name=excluded.name,parent_id=excluded.parent_id,icon=excluded.icon,sort_order=excluded.sort_order,active=1;

-- Mobiles (4)
INSERT INTO categories(name,slug,parent_id,icon,sort_order,active,created_at)
VALUES
 ('New Mobiles','new-mobiles',(SELECT id FROM categories WHERE name='Mobiles' AND parent_id IS NULL),'📱',1,1,datetime('now')),
 ('Used Mobiles','used-mobiles',(SELECT id FROM categories WHERE name='Mobiles' AND parent_id IS NULL),'📲',2,1,datetime('now')),
 ('Mobile Accessories','mobile-accessories',(SELECT id FROM categories WHERE name='Mobiles' AND parent_id IS NULL),'🎧',3,1,datetime('now')),
 ('Mobile Services','mobile-services',(SELECT id FROM categories WHERE name='Mobiles' AND parent_id IS NULL),'🛠️',4,1,datetime('now'))
ON CONFLICT(slug) DO UPDATE SET name=excluded.name,parent_id=excluded.parent_id,icon=excluded.icon,sort_order=excluded.sort_order,active=1;

-- Jobs (4)
INSERT INTO categories(name,slug,parent_id,icon,sort_order,active,created_at)
VALUES
 ('Full-time Jobs','full-time-jobs',(SELECT id FROM categories WHERE name='Jobs' AND parent_id IS NULL),'💼',1,1,datetime('now')),
 ('Part-time Jobs','part-time-jobs',(SELECT id FROM categories WHERE name='Jobs' AND parent_id IS NULL),'🕒',2,1,datetime('now')),
 ('Work from Home','work-from-home',(SELECT id FROM categories WHERE name='Jobs' AND parent_id IS NULL),'🏡',3,1,datetime('now')),
 ('Temporary Jobs','temporary-jobs',(SELECT id FROM categories WHERE name='Jobs' AND parent_id IS NULL),'📋',4,1,datetime('now'))
ON CONFLICT(slug) DO UPDATE SET name=excluded.name,parent_id=excluded.parent_id,icon=excluded.icon,sort_order=excluded.sort_order,active=1;

-- Houses (5)
INSERT INTO categories(name,slug,parent_id,icon,sort_order,active,created_at)
VALUES
 ('Houses for Rent','houses-for-rent',(SELECT id FROM categories WHERE name='Houses' AND parent_id IS NULL),'🏠',1,1,datetime('now')),
 ('Houses for Sale','houses-for-sale',(SELECT id FROM categories WHERE name='Houses' AND parent_id IS NULL),'🏡',2,1,datetime('now')),
 ('PG & Shared Accommodation','pg-shared-accommodation',(SELECT id FROM categories WHERE name='Houses' AND parent_id IS NULL),'🏘️',3,1,datetime('now')),
 ('Commercial Properties','commercial-properties',(SELECT id FROM categories WHERE name='Houses' AND parent_id IS NULL),'🏢',4,1,datetime('now')),
 ('Land & Plots','land-plots',(SELECT id FROM categories WHERE name='Houses' AND parent_id IS NULL),'🌳',5,1,datetime('now'))
ON CONFLICT(slug) DO UPDATE SET name=excluded.name,parent_id=excluded.parent_id,icon=excluded.icon,sort_order=excluded.sort_order,active=1;

-- Personals (7)
INSERT INTO categories(name,slug,parent_id,icon,sort_order,active,created_at)
VALUES
 ('Massage & Spa','massage-spa',(SELECT id FROM categories WHERE name='Personals' AND parent_id IS NULL),'💆',1,1,datetime('now')),
 ('Full Body Massage','full-body-massage',(SELECT id FROM categories WHERE name='Personals' AND parent_id IS NULL),'🧖',2,1,datetime('now')),
 ('Head Massage','head-massage',(SELECT id FROM categories WHERE name='Personals' AND parent_id IS NULL),'💆‍♀️',3,1,datetime('now')),
 ('Foot Massage','foot-massage',(SELECT id FROM categories WHERE name='Personals' AND parent_id IS NULL),'🦶',4,1,datetime('now')),
 ('Spa & Wellness','spa-wellness',(SELECT id FROM categories WHERE name='Personals' AND parent_id IS NULL),'🌿',5,1,datetime('now')),
 ('Beauty & Wellness','beauty-wellness',(SELECT id FROM categories WHERE name='Personals' AND parent_id IS NULL),'✨',6,1,datetime('now')),
 ('Other Services','other-services',(SELECT id FROM categories WHERE name='Personals' AND parent_id IS NULL),'⭐',7,1,datetime('now'))
ON CONFLICT(slug) DO UPDATE SET name=excluded.name,parent_id=excluded.parent_id,icon=excluded.icon,sort_order=excluded.sort_order,active=1;

-- Show only the approved homepage subcategories in active category lists.
-- Rows are retained (not deleted), so old ad/category history is not destroyed.
UPDATE categories
SET active=0
WHERE parent_id IN (
  SELECT id FROM categories
  WHERE parent_id IS NULL
    AND name IN ('Cars','Bikes','Houses','Mobiles','Jobs','Personals')
)
AND LOWER(name) NOT IN (
  'new cars','used cars','car rentals','car services',
  'new bikes','used bikes','bike services',
  'new mobiles','used mobiles','mobile accessories','mobile services',
  'full-time jobs','part-time jobs','work from home','temporary jobs',
  'houses for rent','houses for sale','pg & shared accommodation','commercial properties','land & plots',
  'massage & spa','full body massage','head massage','foot massage','spa & wellness','beauty & wellness','other services'
);
