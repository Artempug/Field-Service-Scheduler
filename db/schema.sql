PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS zones (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS work_types (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  default_duration_min INTEGER NOT NULL DEFAULT 60 CHECK (default_duration_min > 0)
);

CREATE TABLE IF NOT EXISTS technicians (
  id INTEGER PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT,
  zone_id INTEGER,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  zone_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS requests (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  customer_id INTEGER NOT NULL,
  zone_id INTEGER,
  work_type_id INTEGER NOT NULL,
  priority INTEGER NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','scheduled','en_route','in_progress','done','cancelled')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
  FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE SET NULL,
  FOREIGN KEY (work_type_id) REFERENCES work_types(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS assignments (
  id INTEGER PRIMARY KEY,
  request_id INTEGER NOT NULL UNIQUE,
  technician_id INTEGER NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (datetime(ends_at) > datetime(starts_at)),
  FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE,
  FOREIGN KEY (technician_id) REFERENCES technicians(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS request_status_history (
  id INTEGER PRIMARY KEY,
  request_id INTEGER NOT NULL,
  old_status TEXT,
  new_status TEXT NOT NULL
    CHECK (new_status IN ('new','scheduled','en_route','in_progress','done','cancelled')),
  changed_by TEXT,
  changed_at TEXT NOT NULL DEFAULT (datetime('now')),
  note TEXT,
  FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY,
  entity TEXT NOT NULL,
  entity_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  actor TEXT,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_zone ON requests(zone_id);
CREATE INDEX IF NOT EXISTS idx_assignments_tech_time ON assignments(technician_id, starts_at, ends_at);

CREATE TRIGGER IF NOT EXISTS trg_requests_updated_at
AFTER UPDATE ON requests
FOR EACH ROW
BEGIN
  UPDATE requests SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_requests_status_history
AFTER UPDATE OF status ON requests
FOR EACH ROW
WHEN OLD.status <> NEW.status
BEGIN
  INSERT INTO request_status_history(request_id, old_status, new_status, changed_by, note)
  VALUES (NEW.id, OLD.status, NEW.status, NULL, NULL);

  INSERT INTO audit_log(entity, entity_id, action, actor, details)
  VALUES ('request', NEW.id, 'STATUS_CHANGE', NULL,
          'status: ' || OLD.status || ' -> ' || NEW.status);
END;

CREATE TRIGGER IF NOT EXISTS trg_assignments_no_overlap
BEFORE INSERT ON assignments
FOR EACH ROW
BEGIN
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM assignments a
    WHERE a.technician_id = NEW.technician_id
      AND datetime(NEW.starts_at) < datetime(a.ends_at)
      AND datetime(NEW.ends_at)   > datetime(a.starts_at)
  )
  THEN RAISE(ABORT, 'Time conflict: technician already has an assignment in this interval')
  END;
END;