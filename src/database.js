'use strict';

const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');
const { app }  = require('electron');

let db = null;

// ── Schema ───────────────────────────────────────────────────────────────────
function runSchema() {
  const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  db.exec(schema);
}

// ── Seed (runs only when the DB is freshly created) ──────────────────────────
function seedIfEmpty() {
  const count = db.prepare('SELECT COUNT(*) AS n FROM zones').get().n;
  if (count > 0) return;

  db.transaction(() => {
    // Zones
    const insZone = db.prepare('INSERT INTO zones(name) VALUES (?)');
    const zones = ['North', 'South', 'East', 'West'];
    zones.forEach(n => insZone.run(n));

    // Work types
    const insWt = db.prepare(
      'INSERT INTO work_types(name, default_duration_min) VALUES (?, ?)',
    );
    insWt.run('Installation', 120);
    insWt.run('Repair',       60);
    insWt.run('Maintenance',  90);
    insWt.run('Inspection',   30);

    // Technicians
    const insTech = db.prepare(
      'INSERT INTO technicians(full_name, phone, zone_id, is_active, created_at) VALUES (?, ?, ?, ?, ?)',
    );
    insTech.run('John Smith',      '+1-555-0101', 1, 1, '2024-01-15T10:00:00');
    insTech.run('Maria Garcia',    '+1-555-0102', 2, 1, '2024-01-16T10:00:00');
    insTech.run('Robert Johnson',  '+1-555-0103', 3, 1, '2024-02-01T10:00:00');
    insTech.run('Emily Davis',     null,          4, 0, '2024-02-10T10:00:00');
    insTech.run('Carlos Ruiz',     '+1-555-0105', 1, 1, '2024-03-01T10:00:00');
    insTech.run('Anna Kowalski',   '+1-555-0106', 2, 1, '2024-03-05T10:00:00');

    // Customers
    const insCust = db.prepare(
      'INSERT INTO customers(full_name, phone, address, zone_id, created_at) VALUES (?, ?, ?, ?, ?)',
    );
    insCust.run('Acme Corporation',  '+1-555-1001', '123 Main St, Springfield',       1, '2024-01-20T10:00:00');
    insCust.run('Tech Solutions LLC','+1-555-1002', '456 Oak Ave, Shelbyville',        2, '2024-01-22T10:00:00');
    insCust.run('Global Industries', '+1-555-1003', '789 Pine Rd, Capitol City',       1, '2024-02-05T10:00:00');
    insCust.run('MegaCorp Inc.',      null,         '321 Elm St, Ogdenville',          3, '2024-02-15T10:00:00');
    insCust.run('StartUp Co.',       '+1-555-1005', null,                              4, '2024-03-01T10:00:00');
    insCust.run('Metro Services',    '+1-555-1006', '555 Riverside Dr, Springfield',   2, '2024-03-10T10:00:00');

    // Requests (disable updated_at trigger temporarily by setting both cols)
    const insReq = db.prepare(`
      INSERT INTO requests
        (id, title, description, customer_id, zone_id, work_type_id, priority, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const reqs = [
      [1,  'HVAC Unit Installation',      'Full installation of industrial HVAC unit. Requires crane access.', 1, 1, 1, 2, 'scheduled',   '2024-04-01T09:00:00', '2024-04-02T14:00:00'],
      [2,  'Electrical Panel Repair',      null, 2, 2, 2, 1, 'in_progress', '2024-04-02T09:00:00', '2024-04-03T08:00:00'],
      [3,  'Plumbing Inspection',          'Annual plumbing check for leaks and pressure test.', 3, 1, 4, 4, 'done',        '2024-03-15T09:00:00', '2024-03-20T16:00:00'],
      [4,  'Security System Setup',        null, 4, 3, 1, 3, 'new',         '2024-04-05T09:00:00', '2024-04-05T09:00:00'],
      [5,  'Network Infrastructure',       'Replace aging network switches and re-run Cat6 cabling throughout building.', 1, 1, 1, 2, 'scheduled',   '2024-04-03T09:00:00', '2024-04-04T09:00:00'],
      [6,  'Generator Maintenance',        null, 2, 2, 3, 3, 'done',        '2024-03-10T09:00:00', '2024-03-18T15:00:00'],
      [7,  'Solar Panel Installation',     'Rooftop installation of 48 solar panels.', 5, 4, 1, 3, 'en_route',    '2024-04-06T09:00:00', '2024-04-07T08:00:00'],
      [8,  'Fire Alarm Testing',           null, 3, 1, 4, 2, 'cancelled',   '2024-03-20T09:00:00', '2024-03-25T09:00:00'],
      [9,  'Elevator Maintenance',         'Quarterly maintenance and safety check.', 4, 3, 3, 2, 'scheduled',   '2024-04-04T09:00:00', '2024-04-04T09:00:00'],
      [10, 'Roof Assessment',              null, 6, 2, 4, 4, 'new',         '2024-04-07T09:00:00', '2024-04-07T09:00:00'],
      [11, 'Server Room Cooling Repair',   'Critical cooling failure in main server room.', 1, 1, 2, 1, 'done',        '2024-03-05T09:00:00', '2024-03-06T18:00:00'],
      [12, 'Parking Lot Lighting',         null, 5, 4, 1, 5, 'new',         '2024-04-08T09:00:00', '2024-04-08T09:00:00'],
      [13, 'Emergency Generator Repair',   'Generator failed during last power outage.', 2, 2, 2, 1, 'in_progress', '2024-04-08T09:00:00', '2024-04-08T11:00:00'],
      [14, 'Water Heater Replacement',     null, 3, 1, 1, 3, 'scheduled',   '2024-04-05T09:00:00', '2024-04-06T09:00:00'],
      [15, 'AC System Tune-up',            'Seasonal maintenance before summer.', 6, 2, 3, 4, 'done',        '2024-03-25T09:00:00', '2024-04-01T17:00:00'],
      [16, 'Office Rewiring',              null, 4, 3, 1, 3, 'cancelled',   '2024-03-28T09:00:00', '2024-04-02T09:00:00'],
      [17, 'Backup Power Install',         'Install UPS systems for critical equipment.', 1, 1, 1, 2, 'new',         '2024-04-09T09:00:00', '2024-04-09T09:00:00'],
      [18, 'Camera System Upgrade',        null, 5, 4, 1, 4, 'scheduled',   '2024-04-07T09:00:00', '2024-04-08T09:00:00'],
      [19, 'Boiler Inspection',            'Annual safety inspection required by regulation.', 6, 2, 4, 2, 'done',        '2024-03-18T09:00:00', '2024-03-22T14:00:00'],
      [20, 'Telecom Line Repair',          null, 4, 3, 2, 3, 'en_route',    '2024-04-09T09:00:00', '2024-04-09T09:00:00'],
    ];
    reqs.forEach(r => insReq.run(...r));

    // Assignments
    const insAsgn = db.prepare(`
      INSERT INTO assignments(id, request_id, technician_id, starts_at, ends_at, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const asgns = [
      [1, 1,  1, '2024-04-10T09:00:00', '2024-04-10T11:00:00', 'Bring ladder and safety harness',      '2024-04-02T09:00:00'],
      [2, 2,  2, '2024-04-03T08:00:00', '2024-04-03T10:00:00', null,                                    '2024-04-02T09:00:00'],
      [3, 5,  5, '2024-04-12T10:00:00', '2024-04-12T14:00:00', 'Customer will provide floor plans',     '2024-04-04T09:00:00'],
      [4, 7,  3, '2024-04-07T08:00:00', '2024-04-07T16:00:00', null,                                    '2024-04-06T09:00:00'],
      [5, 9,  1, '2024-04-11T14:00:00', '2024-04-11T16:00:00', 'Elevator out of service notice sent',   '2024-04-04T09:00:00'],
      [6, 13, 2, '2024-04-08T11:00:00', '2024-04-08T13:00:00', null,                                    '2024-04-08T09:00:00'],
      [7, 14, 6, '2024-04-15T09:00:00', '2024-04-15T11:00:00', null,                                    '2024-04-06T09:00:00'],
      [8, 18, 3, '2024-04-13T10:00:00', '2024-04-13T14:00:00', 'Old cameras to be disposed of',         '2024-04-08T09:00:00'],
      [9, 20, 5, '2024-04-09T09:00:00', '2024-04-09T11:00:00', null,                                    '2024-04-09T09:00:00'],
    ];
    asgns.forEach(a => insAsgn.run(...a));

    // Audit log seed
    const insAudit = db.prepare(`
      INSERT INTO audit_log(entity, entity_id, action, actor, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const audits = [
      ['request',    1,  'create', 'admin',   'Request created',               '2024-04-01T09:00:00'],
      ['request',    1,  'update', 'admin',   'status: new → scheduled',       '2024-04-02T14:00:00'],
      ['assignment', 1,  'create', 'admin',   'Assigned to John Smith',        '2024-04-02T14:00:00'],
      ['request',    2,  'create', 'manager', 'Request created',               '2024-04-02T09:00:00'],
      ['request',    2,  'update', 'manager', 'status: new → in_progress',     '2024-04-03T08:00:00'],
      ['request',    3,  'create', 'admin',   'Request created',               '2024-03-15T10:00:00'],
      ['request',    3,  'update', 'admin',   'status: in_progress → done',    '2024-03-20T16:00:00'],
      ['technician', 5,  'create', 'admin',   'New technician added',          '2024-03-01T10:00:00'],
      ['request',    8,  'update', 'manager', 'status: scheduled → cancelled', '2024-03-25T11:00:00'],
      ['request',    11, 'update', 'admin',   'status: in_progress → done',    '2024-03-06T18:00:00'],
      ['customer',   6,  'create', 'admin',   'Customer Metro Services added', '2024-03-10T09:00:00'],
      ['request',    13, 'create', 'manager', 'Emergency request created',     '2024-04-08T07:00:00'],
      ['assignment', 6,  'create', 'manager', 'Assigned to Maria Garcia',      '2024-04-08T07:00:00'],
      ['request',    16, 'update', 'manager', 'status: scheduled → cancelled', '2024-04-02T10:00:00'],
      ['request',    6,  'update', 'tech1',   'status: in_progress → done',    '2024-03-18T15:00:00'],
      ['request',    7,  'update', 'tech3',   'status: scheduled → en_route',  '2024-04-07T08:00:00'],
      ['request',    20, 'update', 'tech5',   'status: scheduled → en_route',  '2024-04-09T09:00:00'],
      ['request',    15, 'update', 'tech2',   'status: in_progress → done',    '2024-04-01T17:00:00'],
      ['request',    19, 'update', 'admin',   'status: in_progress → done',    '2024-03-22T14:00:00'],
      ['request',    17, 'create', 'admin',   'Request created',               '2024-04-09T09:00:00'],
    ];
    audits.forEach(a => insAudit.run(...a));
  })();
}

// ── Public API ────────────────────────────────────────────────────────────────
function initialize() {
  const userDataPath = app.getPath('userData');
  const dbPath       = path.join(userDataPath, 'fss.db');

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  runSchema();
  seedIfEmpty();

  return db;
}

function getDb() {
  return db;
}

function close() {
  if (db) db.close();
}

module.exports = { initialize, getDb, close };
