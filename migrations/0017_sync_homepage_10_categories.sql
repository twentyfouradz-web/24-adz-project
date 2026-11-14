-- 24Adz.com: synchronize the database category tree with the existing homepage.
-- The homepage is the source of truth. This migration changes database category
-- rows only; it does not modify homepage files or delete ads/category history.
-- Safe to re-run: every category is upserted by its unique slug.

-- Ensure the exact ten homepage main categories exist and are active, in homepage order.
INSERT INTO categories(name,slug,parent_id,icon,sort_order,active,created_at) VALUES
 ('Cars','cars',NULL,'🚗',1,1,datetime('now')),
 ('Bikes','bikes',NULL,'🏍️',2,1,datetime('now')),
 ('Mobiles','mobiles',NULL,'📱',3,1,datetime('now')),
 ('Jobs','jobs',NULL,'💼',4,1,datetime('now')),
 ('Real Estate','real-estate',NULL,'🏘️',5,1,datetime('now')),
 ('Hotel Rooms','hotel-rooms',NULL,'🏨',6,1,datetime('now')),
 ('Fashion & Beauty','fashion-beauty',NULL,'💄',7,1,datetime('now')),
 ('Personals','personals',NULL,'❤️',8,1,datetime('now')),
 ('Vehicles & Rentals','vehicles-rentals',NULL,'🚐',9,1,datetime('now')),
 ('Cars Rentals','cars-rentals',NULL,'🚘',10,1,datetime('now'))
ON CONFLICT(slug) DO UPDATE SET
 name=excluded.name,parent_id=NULL,icon=excluded.icon,
 sort_order=excluded.sort_order,active=1;

-- Deactivate legacy main categories not present on the homepage. Keep their rows.
UPDATE categories
SET active=0
WHERE parent_id IS NULL
  AND slug NOT IN ('cars','bikes','mobiles','jobs','real-estate','hotel-rooms',
                   'fashion-beauty','personals','vehicles-rentals','cars-rentals');

-- Cars (3)
INSERT INTO categories(name,slug,parent_id,icon,sort_order,active,created_at) VALUES
 ('New Cars','new-cars',(SELECT id FROM categories WHERE slug='cars' AND parent_id IS NULL),'🚘',1,1,datetime('now')),
 ('Used Cars','used-cars',(SELECT id FROM categories WHERE slug='cars' AND parent_id IS NULL),'🚗',2,1,datetime('now')),
 ('Car Services','car-services',(SELECT id FROM categories WHERE slug='cars' AND parent_id IS NULL),'🛠️',3,1,datetime('now'))
ON CONFLICT(slug) DO UPDATE SET name=excluded.name,parent_id=excluded.parent_id,icon=excluded.icon,sort_order=excluded.sort_order,active=1;

-- Bikes (3)
INSERT INTO categories(name,slug,parent_id,icon,sort_order,active,created_at) VALUES
 ('New Bikes','new-bikes',(SELECT id FROM categories WHERE slug='bikes' AND parent_id IS NULL),'🏍️',1,1,datetime('now')),
 ('Used Bikes','used-bikes',(SELECT id FROM categories WHERE slug='bikes' AND parent_id IS NULL),'🏍️',2,1,datetime('now')),
 ('Bike Services','bike-services',(SELECT id FROM categories WHERE slug='bikes' AND parent_id IS NULL),'🔧',3,1,datetime('now'))
ON CONFLICT(slug) DO UPDATE SET name=excluded.name,parent_id=excluded.parent_id,icon=excluded.icon,sort_order=excluded.sort_order,active=1;

-- Mobiles (4)
INSERT INTO categories(name,slug,parent_id,icon,sort_order,active,created_at) VALUES
 ('New Mobiles','new-mobiles',(SELECT id FROM categories WHERE slug='mobiles' AND parent_id IS NULL),'📱',1,1,datetime('now')),
 ('Used Mobiles','used-mobiles',(SELECT id FROM categories WHERE slug='mobiles' AND parent_id IS NULL),'📲',2,1,datetime('now')),
 ('Mobile Accessories','mobile-accessories',(SELECT id FROM categories WHERE slug='mobiles' AND parent_id IS NULL),'🎧',3,1,datetime('now')),
 ('Mobile Services','mobile-services',(SELECT id FROM categories WHERE slug='mobiles' AND parent_id IS NULL),'🛠️',4,1,datetime('now'))
ON CONFLICT(slug) DO UPDATE SET name=excluded.name,parent_id=excluded.parent_id,icon=excluded.icon,sort_order=excluded.sort_order,active=1;

-- Jobs (4)
INSERT INTO categories(name,slug,parent_id,icon,sort_order,active,created_at) VALUES
 ('Full-time Jobs','full-time-jobs',(SELECT id FROM categories WHERE slug='jobs' AND parent_id IS NULL),'💼',1,1,datetime('now')),
 ('Part-time Jobs','part-time-jobs',(SELECT id FROM categories WHERE slug='jobs' AND parent_id IS NULL),'🕒',2,1,datetime('now')),
 ('Work from Home','work-from-home',(SELECT id FROM categories WHERE slug='jobs' AND parent_id IS NULL),'🏡',3,1,datetime('now')),
 ('Temporary Jobs','temporary-jobs',(SELECT id FROM categories WHERE slug='jobs' AND parent_id IS NULL),'📋',4,1,datetime('now'))
ON CONFLICT(slug) DO UPDATE SET name=excluded.name,parent_id=excluded.parent_id,icon=excluded.icon,sort_order=excluded.sort_order,active=1;

-- Real Estate (7)
INSERT INTO categories(name,slug,parent_id,icon,sort_order,active,created_at) VALUES
 ('Residential Properties','residential-properties',(SELECT id FROM categories WHERE slug='real-estate' AND parent_id IS NULL),'🏠',1,1,datetime('now')),
 ('Commercial Spaces','commercial-spaces',(SELECT id FROM categories WHERE slug='real-estate' AND parent_id IS NULL),'🏬',2,1,datetime('now')),
 ('Houses for Sale','real-estate-houses-sale',(SELECT id FROM categories WHERE slug='real-estate' AND parent_id IS NULL),'🏡',3,1,datetime('now')),
 ('Houses for Rent','real-estate-houses-rent',(SELECT id FROM categories WHERE slug='real-estate' AND parent_id IS NULL),'🔑',4,1,datetime('now')),
 ('Apartments & Flats','apartments-flats',(SELECT id FROM categories WHERE slug='real-estate' AND parent_id IS NULL),'🏢',5,1,datetime('now')),
 ('Land & Plots','real-estate-land-plots',(SELECT id FROM categories WHERE slug='real-estate' AND parent_id IS NULL),'🌳',6,1,datetime('now')),
 ('PG & Hostels','pg-hostels',(SELECT id FROM categories WHERE slug='real-estate' AND parent_id IS NULL),'🏘️',7,1,datetime('now'))
ON CONFLICT(slug) DO UPDATE SET name=excluded.name,parent_id=excluded.parent_id,icon=excluded.icon,sort_order=excluded.sort_order,active=1;

-- Hotel Rooms (7)
INSERT INTO categories(name,slug,parent_id,icon,sort_order,active,created_at) VALUES
 ('Budget Hotel Rooms','budget-hotel-rooms',(SELECT id FROM categories WHERE slug='hotel-rooms' AND parent_id IS NULL),'🛏️',1,1,datetime('now')),
 ('Luxury Hotel Rooms','luxury-hotel-rooms',(SELECT id FROM categories WHERE slug='hotel-rooms' AND parent_id IS NULL),'🏨',2,1,datetime('now')),
 ('AC Rooms','hotel-ac-rooms',(SELECT id FROM categories WHERE slug='hotel-rooms' AND parent_id IS NULL),'❄️',3,1,datetime('now')),
 ('Non-AC Rooms','hotel-non-ac-rooms',(SELECT id FROM categories WHERE slug='hotel-rooms' AND parent_id IS NULL),'🛌',4,1,datetime('now')),
 ('Family Rooms','family-hotel-rooms',(SELECT id FROM categories WHERE slug='hotel-rooms' AND parent_id IS NULL),'👨‍👩‍👧',5,1,datetime('now')),
 ('Lodges','lodges',(SELECT id FROM categories WHERE slug='hotel-rooms' AND parent_id IS NULL),'🏩',6,1,datetime('now')),
 ('Service Apartments','service-apartments',(SELECT id FROM categories WHERE slug='hotel-rooms' AND parent_id IS NULL),'🏢',7,1,datetime('now'))
ON CONFLICT(slug) DO UPDATE SET name=excluded.name,parent_id=excluded.parent_id,icon=excluded.icon,sort_order=excluded.sort_order,active=1;

-- Fashion & Beauty (8)
INSERT INTO categories(name,slug,parent_id,icon,sort_order,active,created_at) VALUES
 ('Beauty Parlour Ads','beauty-parlour-ads',(SELECT id FROM categories WHERE slug='fashion-beauty' AND parent_id IS NULL),'💇',1,1,datetime('now')),
 ('Dresses','dresses',(SELECT id FROM categories WHERE slug='fashion-beauty' AND parent_id IS NULL),'👗',2,1,datetime('now')),
 ('Men''s Fashion','mens-fashion',(SELECT id FROM categories WHERE slug='fashion-beauty' AND parent_id IS NULL),'👔',3,1,datetime('now')),
 ('Women''s Fashion','womens-fashion',(SELECT id FROM categories WHERE slug='fashion-beauty' AND parent_id IS NULL),'👚',4,1,datetime('now')),
 ('Men''s & Women''s Clothing','mens-womens-clothing',(SELECT id FROM categories WHERE slug='fashion-beauty' AND parent_id IS NULL),'👕',5,1,datetime('now')),
 ('Beauty Products','beauty-products',(SELECT id FROM categories WHERE slug='fashion-beauty' AND parent_id IS NULL),'💄',6,1,datetime('now')),
 ('Makeup & Cosmetics','makeup-cosmetics',(SELECT id FROM categories WHERE slug='fashion-beauty' AND parent_id IS NULL),'💅',7,1,datetime('now')),
 ('Accessories','fashion-accessories',(SELECT id FROM categories WHERE slug='fashion-beauty' AND parent_id IS NULL),'👜',8,1,datetime('now'))
ON CONFLICT(slug) DO UPDATE SET name=excluded.name,parent_id=excluded.parent_id,icon=excluded.icon,sort_order=excluded.sort_order,active=1;

-- Personals (7)
INSERT INTO categories(name,slug,parent_id,icon,sort_order,active,created_at) VALUES
 ('Massage & Spa','massage-spa',(SELECT id FROM categories WHERE slug='personals' AND parent_id IS NULL),'💆',1,1,datetime('now')),
 ('Full Body Massage','full-body-massage',(SELECT id FROM categories WHERE slug='personals' AND parent_id IS NULL),'🧖',2,1,datetime('now')),
 ('Head Massage','head-massage',(SELECT id FROM categories WHERE slug='personals' AND parent_id IS NULL),'💆‍♀️',3,1,datetime('now')),
 ('Foot Massage','foot-massage',(SELECT id FROM categories WHERE slug='personals' AND parent_id IS NULL),'🦶',4,1,datetime('now')),
 ('Spa & Wellness','spa-wellness',(SELECT id FROM categories WHERE slug='personals' AND parent_id IS NULL),'🌿',5,1,datetime('now')),
 ('Beauty & Wellness','beauty-wellness',(SELECT id FROM categories WHERE slug='personals' AND parent_id IS NULL),'✨',6,1,datetime('now')),
 ('Other Services','other-services',(SELECT id FROM categories WHERE slug='personals' AND parent_id IS NULL),'⭐',7,1,datetime('now'))
ON CONFLICT(slug) DO UPDATE SET name=excluded.name,parent_id=excluded.parent_id,icon=excluded.icon,sort_order=excluded.sort_order,active=1;

-- Vehicles & Rentals (19)
INSERT INTO categories(name,slug,parent_id,icon,sort_order,active,created_at) VALUES
 ('Passenger Auto','passenger-auto',(SELECT id FROM categories WHERE slug='vehicles-rentals' AND parent_id IS NULL),'🛺',1,1,datetime('now')),
 ('Goods Auto','goods-auto',(SELECT id FROM categories WHERE slug='vehicles-rentals' AND parent_id IS NULL),'🚚',2,1,datetime('now')),
 ('Passenger Van','passenger-van',(SELECT id FROM categories WHERE slug='vehicles-rentals' AND parent_id IS NULL),'🚐',3,1,datetime('now')),
 ('Goods Van','goods-van',(SELECT id FROM categories WHERE slug='vehicles-rentals' AND parent_id IS NULL),'🚚',4,1,datetime('now')),
 ('12 Seater','tempo-12-seater',(SELECT id FROM categories WHERE slug='vehicles-rentals' AND parent_id IS NULL),'🚐',5,1,datetime('now')),
 ('14 Seater','tempo-14-seater',(SELECT id FROM categories WHERE slug='vehicles-rentals' AND parent_id IS NULL),'🚐',6,1,datetime('now')),
 ('17 Seater','tempo-17-seater',(SELECT id FROM categories WHERE slug='vehicles-rentals' AND parent_id IS NULL),'🚐',7,1,datetime('now')),
 ('20 Seater','tempo-20-seater',(SELECT id FROM categories WHERE slug='vehicles-rentals' AND parent_id IS NULL),'🚌',8,1,datetime('now')),
 ('Local Travels','local-travels',(SELECT id FROM categories WHERE slug='vehicles-rentals' AND parent_id IS NULL),'📍',9,1,datetime('now')),
 ('Outstation Travels','outstation-travels',(SELECT id FROM categories WHERE slug='vehicles-rentals' AND parent_id IS NULL),'🛣️',10,1,datetime('now')),
 ('Airport Pickup & Drop','airport-pickup-drop',(SELECT id FROM categories WHERE slug='vehicles-rentals' AND parent_id IS NULL),'✈️',11,1,datetime('now')),
 ('Bike Rental','bike-rental',(SELECT id FROM categories WHERE slug='vehicles-rentals' AND parent_id IS NULL),'🏍️',12,1,datetime('now')),
 ('Auto Rental','auto-rental',(SELECT id FROM categories WHERE slug='vehicles-rentals' AND parent_id IS NULL),'🛺',13,1,datetime('now')),
 ('Van Rental','van-rental',(SELECT id FROM categories WHERE slug='vehicles-rentals' AND parent_id IS NULL),'🚐',14,1,datetime('now')),
 ('Tempo Traveller Rental','tempo-traveller-rental',(SELECT id FROM categories WHERE slug='vehicles-rentals' AND parent_id IS NULL),'🚍',15,1,datetime('now')),
 ('Self Drive Rental','self-drive-rental',(SELECT id FROM categories WHERE slug='vehicles-rentals' AND parent_id IS NULL),'🔑',16,1,datetime('now')),
 ('With Driver Rental','with-driver-rental',(SELECT id FROM categories WHERE slug='vehicles-rentals' AND parent_id IS NULL),'🧑‍✈️',17,1,datetime('now')),
 ('Daily Rental','daily-rental',(SELECT id FROM categories WHERE slug='vehicles-rentals' AND parent_id IS NULL),'📅',18,1,datetime('now')),
 ('Monthly Rental','monthly-rental',(SELECT id FROM categories WHERE slug='vehicles-rentals' AND parent_id IS NULL),'🗓️',19,1,datetime('now'))
ON CONFLICT(slug) DO UPDATE SET name=excluded.name,parent_id=excluded.parent_id,icon=excluded.icon,sort_order=excluded.sort_order,active=1;

-- Cars Rentals (7)
INSERT INTO categories(name,slug,parent_id,icon,sort_order,active,created_at) VALUES
 ('Self Drive Car Rental','self-drive-car-rental',(SELECT id FROM categories WHERE slug='cars-rentals' AND parent_id IS NULL),'🔑',1,1,datetime('now')),
 ('With Driver Car Rental','with-driver-car-rental',(SELECT id FROM categories WHERE slug='cars-rentals' AND parent_id IS NULL),'🧑‍✈️',2,1,datetime('now')),
 ('Daily Car Rental','daily-car-rental',(SELECT id FROM categories WHERE slug='cars-rentals' AND parent_id IS NULL),'📅',3,1,datetime('now')),
 ('Weekly Car Rental','weekly-car-rental',(SELECT id FROM categories WHERE slug='cars-rentals' AND parent_id IS NULL),'🗓️',4,1,datetime('now')),
 ('Monthly Car Rental','monthly-car-rental',(SELECT id FROM categories WHERE slug='cars-rentals' AND parent_id IS NULL),'📆',5,1,datetime('now')),
 ('Outstation Car Rental','outstation-car-rental',(SELECT id FROM categories WHERE slug='cars-rentals' AND parent_id IS NULL),'🛣️',6,1,datetime('now')),
 ('Airport Pickup & Drop','cars-airport-pickup-drop',(SELECT id FROM categories WHERE slug='cars-rentals' AND parent_id IS NULL),'✈️',7,1,datetime('now'))
ON CONFLICT(slug) DO UPDATE SET name=excluded.name,parent_id=excluded.parent_id,icon=excluded.icon,sort_order=excluded.sort_order,active=1;

-- Deactivate stale subcategories beneath the ten homepage roots; retain rows/history.
-- Only the explicitly seeded homepage subcategory slugs remain active.
UPDATE categories
SET active=0
WHERE parent_id IN (SELECT id FROM categories WHERE parent_id IS NULL AND slug IN
 ('cars','bikes','mobiles','jobs','real-estate','hotel-rooms','fashion-beauty',
  'personals','vehicles-rentals','cars-rentals'))
AND slug NOT IN (
 'new-cars','used-cars','car-services',
 'new-bikes','used-bikes','bike-services',
 'new-mobiles','used-mobiles','mobile-accessories','mobile-services',
 'full-time-jobs','part-time-jobs','work-from-home','temporary-jobs',
 'residential-properties','commercial-spaces','real-estate-houses-sale','real-estate-houses-rent','apartments-flats','real-estate-land-plots','pg-hostels',
 'budget-hotel-rooms','luxury-hotel-rooms','hotel-ac-rooms','hotel-non-ac-rooms','family-hotel-rooms','lodges','service-apartments',
 'beauty-parlour-ads','dresses','mens-fashion','womens-fashion','mens-womens-clothing','beauty-products','makeup-cosmetics','fashion-accessories',
 'massage-spa','full-body-massage','head-massage','foot-massage','spa-wellness','beauty-wellness','other-services',
 'passenger-auto','goods-auto','passenger-van','goods-van','tempo-12-seater','tempo-14-seater','tempo-17-seater','tempo-20-seater','local-travels','outstation-travels','airport-pickup-drop','bike-rental','auto-rental','van-rental','tempo-traveller-rental','self-drive-rental','with-driver-rental','daily-rental','monthly-rental',
 'self-drive-car-rental','with-driver-car-rental','daily-car-rental','weekly-car-rental','monthly-car-rental','outstation-car-rental','cars-airport-pickup-drop'
);
