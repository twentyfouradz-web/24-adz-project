-- 24Adz.com: Vehicles & Rentals and Cars Rentals category structure.
-- All selectable options are direct children so the existing ad form/filter can use them.
-- Idempotent: safe to apply more than once. Existing ads/category rows are retained.
UPDATE categories SET active=0
WHERE slug='car-rentals'
AND parent_id=(SELECT id FROM categories WHERE slug='cars' AND parent_id IS NULL);

INSERT INTO categories(name,slug,parent_id,icon,sort_order,active,created_at)
VALUES ('Vehicles & Rentals','vehicles-rentals',NULL,'🚐',9,1,datetime('now')),
       ('Cars Rentals','cars-rentals',NULL,'🚘',10,1,datetime('now'))
ON CONFLICT(slug) DO UPDATE SET name=excluded.name,parent_id=NULL,icon=excluded.icon,sort_order=excluded.sort_order,active=1;

-- Vehicles & Rentals subcategories. Cars / Used Cars / New Cars are intentionally excluded.
INSERT INTO categories(name,slug,parent_id,icon,sort_order,active,created_at) VALUES
('Passenger Auto','passenger-auto',(SELECT id FROM categories WHERE slug='vehicles-rentals'),'🛺',1,1,datetime('now')),
('Goods Auto','goods-auto',(SELECT id FROM categories WHERE slug='vehicles-rentals'),'🚚',2,1,datetime('now')),
('Passenger Van','passenger-van',(SELECT id FROM categories WHERE slug='vehicles-rentals'),'🚐',3,1,datetime('now')),
('Goods Van','goods-van',(SELECT id FROM categories WHERE slug='vehicles-rentals'),'🚚',4,1,datetime('now')),
('12 Seater','tempo-12-seater',(SELECT id FROM categories WHERE slug='vehicles-rentals'),'🚐',5,1,datetime('now')),
('14 Seater','tempo-14-seater',(SELECT id FROM categories WHERE slug='vehicles-rentals'),'🚐',6,1,datetime('now')),
('17 Seater','tempo-17-seater',(SELECT id FROM categories WHERE slug='vehicles-rentals'),'🚐',7,1,datetime('now')),
('20 Seater','tempo-20-seater',(SELECT id FROM categories WHERE slug='vehicles-rentals'),'🚌',8,1,datetime('now')),
('Local Travels','local-travels',(SELECT id FROM categories WHERE slug='vehicles-rentals'),'📍',9,1,datetime('now')),
('Outstation Travels','outstation-travels',(SELECT id FROM categories WHERE slug='vehicles-rentals'),'🛣️',10,1,datetime('now')),
('Airport Pickup & Drop','airport-pickup-drop',(SELECT id FROM categories WHERE slug='vehicles-rentals'),'✈️',11,1,datetime('now')),
('Bike Rental','bike-rental',(SELECT id FROM categories WHERE slug='vehicles-rentals'),'🏍️',12,1,datetime('now')),
('Auto Rental','auto-rental',(SELECT id FROM categories WHERE slug='vehicles-rentals'),'🛺',13,1,datetime('now')),
('Van Rental','van-rental',(SELECT id FROM categories WHERE slug='vehicles-rentals'),'🚐',14,1,datetime('now')),
('Tempo Traveller Rental','tempo-traveller-rental',(SELECT id FROM categories WHERE slug='vehicles-rentals'),'🚍',15,1,datetime('now')),
('Self Drive Rental','self-drive-rental',(SELECT id FROM categories WHERE slug='vehicles-rentals'),'🔑',16,1,datetime('now')),
('With Driver Rental','with-driver-rental',(SELECT id FROM categories WHERE slug='vehicles-rentals'),'🧑‍✈️',17,1,datetime('now')),
('Daily Rental','daily-rental',(SELECT id FROM categories WHERE slug='vehicles-rentals'),'📅',18,1,datetime('now')),
('Monthly Rental','monthly-rental',(SELECT id FROM categories WHERE slug='vehicles-rentals'),'🗓️',19,1,datetime('now'))
ON CONFLICT(slug) DO UPDATE SET name=excluded.name,parent_id=excluded.parent_id,icon=excluded.icon,sort_order=excluded.sort_order,active=1;

-- Cars Rentals main category and its dedicated subcategories.
INSERT INTO categories(name,slug,parent_id,icon,sort_order,active,created_at) VALUES
('Self Drive Car Rental','self-drive-car-rental',(SELECT id FROM categories WHERE slug='cars-rentals'),'🔑',1,1,datetime('now')),
('With Driver Car Rental','with-driver-car-rental',(SELECT id FROM categories WHERE slug='cars-rentals'),'🧑‍✈️',2,1,datetime('now')),
('Daily Car Rental','daily-car-rental',(SELECT id FROM categories WHERE slug='cars-rentals'),'📅',3,1,datetime('now')),
('Weekly Car Rental','weekly-car-rental',(SELECT id FROM categories WHERE slug='cars-rentals'),'🗓️',4,1,datetime('now')),
('Monthly Car Rental','monthly-car-rental',(SELECT id FROM categories WHERE slug='cars-rentals'),'📆',5,1,datetime('now')),
('Outstation Car Rental','outstation-car-rental',(SELECT id FROM categories WHERE slug='cars-rentals'),'🛣️',6,1,datetime('now')),
('Airport Pickup & Drop','cars-airport-pickup-drop',(SELECT id FROM categories WHERE slug='cars-rentals'),'✈️',7,1,datetime('now'))
ON CONFLICT(slug) DO UPDATE SET name=excluded.name,parent_id=excluded.parent_id,icon=excluded.icon,sort_order=excluded.sort_order,active=1;

-- Disable temporary grouping rows from an earlier draft if this migration is updated/re-run.
UPDATE categories SET active=0
WHERE slug IN ('vehicles-autos','vehicles-vans','tempo-traveller','vehicles-travels','vehicles-rentals-group');
