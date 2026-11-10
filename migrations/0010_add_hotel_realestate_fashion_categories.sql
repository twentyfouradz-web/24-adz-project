-- 24Adz.com: add Hotel Rooms, Real Estate, and Fashion & Beauty main categories.
-- Safe to re-run: main categories and subcategories are upserted by unique slug.

INSERT INTO categories(name,slug,parent_id,icon,sort_order,active,created_at)
VALUES
 ('Hotel Rooms','hotel-rooms',NULL,'🏨',7,1,datetime('now')),
 ('Real Estate','real-estate',NULL,'🏡',8,1,datetime('now')),
 ('Fashion & Beauty','fashion-beauty',NULL,'💄',9,1,datetime('now'))
ON CONFLICT(slug) DO UPDATE SET name=excluded.name,parent_id=NULL,icon=excluded.icon,sort_order=excluded.sort_order,active=1;

-- Hotel Rooms
INSERT INTO categories(name,slug,parent_id,icon,sort_order,active,created_at)
VALUES
 ('Budget Hotel Rooms','budget-hotel-rooms',(SELECT id FROM categories WHERE slug='hotel-rooms'),'🛏️',1,1,datetime('now')),
 ('Luxury Hotel Rooms','luxury-hotel-rooms',(SELECT id FROM categories WHERE slug='hotel-rooms'),'🏨',2,1,datetime('now')),
 ('AC Rooms','hotel-ac-rooms',(SELECT id FROM categories WHERE slug='hotel-rooms'),'❄️',3,1,datetime('now')),
 ('Non-AC Rooms','hotel-non-ac-rooms',(SELECT id FROM categories WHERE slug='hotel-rooms'),'🛌',4,1,datetime('now')),
 ('Family Rooms','family-hotel-rooms',(SELECT id FROM categories WHERE slug='hotel-rooms'),'👨‍👩‍👧',5,1,datetime('now')),
 ('Lodges','lodges',(SELECT id FROM categories WHERE slug='hotel-rooms'),'🏩',6,1,datetime('now')),
 ('Service Apartments','service-apartments',(SELECT id FROM categories WHERE slug='hotel-rooms'),'🏢',7,1,datetime('now'))
ON CONFLICT(slug) DO UPDATE SET name=excluded.name,parent_id=excluded.parent_id,icon=excluded.icon,sort_order=excluded.sort_order,active=1;

-- Real Estate
INSERT INTO categories(name,slug,parent_id,icon,sort_order,active,created_at)
VALUES
 ('Residential Properties','residential-properties',(SELECT id FROM categories WHERE slug='real-estate'),'🏠',1,1,datetime('now')),
 ('Commercial Spaces','commercial-spaces',(SELECT id FROM categories WHERE slug='real-estate'),'🏬',2,1,datetime('now')),
 ('Houses for Sale','real-estate-houses-sale',(SELECT id FROM categories WHERE slug='real-estate'),'🏡',3,1,datetime('now')),
 ('Houses for Rent','real-estate-houses-rent',(SELECT id FROM categories WHERE slug='real-estate'),'🔑',4,1,datetime('now')),
 ('Apartments & Flats','apartments-flats',(SELECT id FROM categories WHERE slug='real-estate'),'🏢',5,1,datetime('now')),
 ('Land & Plots','real-estate-land-plots',(SELECT id FROM categories WHERE slug='real-estate'),'🌳',6,1,datetime('now')),
 ('PG & Hostels','pg-hostels',(SELECT id FROM categories WHERE slug='real-estate'),'🏘️',7,1,datetime('now'))
ON CONFLICT(slug) DO UPDATE SET name=excluded.name,parent_id=excluded.parent_id,icon=excluded.icon,sort_order=excluded.sort_order,active=1;

-- Fashion & Beauty
INSERT INTO categories(name,slug,parent_id,icon,sort_order,active,created_at)
VALUES
 ('Beauty Parlour Ads','beauty-parlour-ads',(SELECT id FROM categories WHERE slug='fashion-beauty'),'💇',1,1,datetime('now')),
 ('Dresses','dresses',(SELECT id FROM categories WHERE slug='fashion-beauty'),'👗',2,1,datetime('now')),
 ('Men''s Fashion','mens-fashion',(SELECT id FROM categories WHERE slug='fashion-beauty'),'👔',3,1,datetime('now')),
 ('Women''s Fashion','womens-fashion',(SELECT id FROM categories WHERE slug='fashion-beauty'),'👚',4,1,datetime('now')),
 ('Men''s & Women''s Clothing','mens-womens-clothing',(SELECT id FROM categories WHERE slug='fashion-beauty'),'👕',5,1,datetime('now')),
 ('Beauty Products','beauty-products',(SELECT id FROM categories WHERE slug='fashion-beauty'),'💄',6,1,datetime('now')),
 ('Makeup & Cosmetics','makeup-cosmetics',(SELECT id FROM categories WHERE slug='fashion-beauty'),'💅',7,1,datetime('now')),
 ('Accessories','fashion-accessories',(SELECT id FROM categories WHERE slug='fashion-beauty'),'👜',8,1,datetime('now'))
ON CONFLICT(slug) DO UPDATE SET name=excluded.name,parent_id=excluded.parent_id,icon=excluded.icon,sort_order=excluded.sort_order,active=1;
