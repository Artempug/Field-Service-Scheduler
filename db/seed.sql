INSERT OR IGNORE INTO zones(name) VALUES ('Center'), ('North');

INSERT OR IGNORE INTO work_types(name, default_duration_min)
VALUES ('Repair', 90), ('Install', 120);

INSERT OR IGNORE INTO technicians(full_name, phone, zone_id) VALUES
('Ivan Petrenko', '+380...', 1),
('Oksana Shevchenko', '+380...', 2);

INSERT OR IGNORE INTO customers(full_name, phone, address, zone_id) VALUES
('Client A', '+380...', 'Kyiv, Street 1', 1);

INSERT OR IGNORE INTO requests(id, title, description, customer_id, zone_id, work_type_id, priority, status)
VALUES (1, 'Fix router', 'No internet', 1, 1, 1, 4, 'new');