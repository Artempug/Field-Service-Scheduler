'use strict';

// ── SQL fragments ─────────────────────────────────────────────────────────────
const BASE_SELECT = `
  SELECT
    r.id, r.title, r.description, r.customer_id, r.zone_id, r.work_type_id,
    r.priority, r.status, r.created_at, r.updated_at,
    c.full_name  AS cust_name,  c.phone AS cust_phone,
    c.address    AS cust_addr,  c.zone_id AS cust_zone_id,
    c.created_at AS cust_created_at,
    z.name AS zone_name,
    wt.name AS wt_name, wt.default_duration_min AS wt_duration,
    a.id          AS asgn_id,       a.technician_id AS asgn_tech_id,
    a.starts_at   AS asgn_starts,   a.ends_at       AS asgn_ends,
    a.notes       AS asgn_notes,    a.created_at    AS asgn_created_at,
    t.full_name   AS tech_name,     t.phone         AS tech_phone,
    t.zone_id     AS tech_zone_id,  t.is_active     AS tech_is_active,
    t.created_at  AS tech_created_at
  FROM requests r
  JOIN customers c  ON r.customer_id  = c.id
  LEFT JOIN zones z ON r.zone_id      = z.id
  JOIN work_types wt ON r.work_type_id = wt.id
  LEFT JOIN assignments a ON r.id     = a.request_id
  LEFT JOIN technicians t ON a.technician_id = t.id
`;

// Allowed sort columns mapped to SQL expressions
const SORT_MAP = {
  id:         'r.id',
  title:      'r.title',
  customer:   'c.full_name',
  zone:       'COALESCE(z.name, "")',
  priority:   'r.priority',
  status:     'r.status',
  updated_at: 'r.updated_at',
};

// ── Row mapper ────────────────────────────────────────────────────────────────
function mapRow(row) {
  const req = {
    id:           row.id,
    title:        row.title,
    description:  row.description,
    customer_id:  row.customer_id,
    customer: {
      id:         row.customer_id,
      full_name:  row.cust_name,
      phone:      row.cust_phone,
      address:    row.cust_addr,
      zone_id:    row.cust_zone_id,
      created_at: row.cust_created_at,
    },
    zone_id:      row.zone_id,
    zone:         row.zone_id ? { id: row.zone_id, name: row.zone_name } : null,
    work_type_id: row.work_type_id,
    work_type: {
      id:                   row.work_type_id,
      name:                 row.wt_name,
      default_duration_min: row.wt_duration,
    },
    priority:    row.priority,
    status:      row.status,
    created_at:  row.created_at,
    updated_at:  row.updated_at,
  };

  if (row.asgn_id) {
    req.assignment = {
      id:           row.asgn_id,
      request_id:   row.id,
      technician_id: row.asgn_tech_id,
      technician: row.asgn_tech_id ? {
        id:         row.asgn_tech_id,
        full_name:  row.tech_name,
        phone:      row.tech_phone,
        zone_id:    row.tech_zone_id,
        is_active:  row.tech_is_active === 1,
        created_at: row.tech_created_at,
      } : null,
      starts_at:  row.asgn_starts,
      ends_at:    row.asgn_ends,
      notes:      row.asgn_notes,
      created_at: row.asgn_created_at,
    };
  }

  return req;
}

// ── Audit helper ──────────────────────────────────────────────────────────────
function writeAudit(db, entity, entityId, action, actor, details) {
  db.prepare(`
    INSERT INTO audit_log(entity, entity_id, action, actor, details)
    VALUES (?, ?, ?, ?, ?)
  `).run(entity, entityId, action, actor, details);
}

// ── Validation ────────────────────────────────────────────────────────────────
const VALID_STATUSES = new Set(['new', 'scheduled', 'en_route', 'in_progress', 'done', 'cancelled']);

function validateRequest(data, requireAll = true) {
  const errors = [];

  if (requireAll || data.title !== undefined) {
    if (!data.title || typeof data.title !== 'string' || data.title.trim().length < 3 || data.title.trim().length > 120)
      errors.push('title must be 3–120 characters');
  }
  if (requireAll || data.customer_id !== undefined) {
    if (!data.customer_id || !Number.isInteger(Number(data.customer_id)))
      errors.push('customer_id is required and must be an integer');
  }
  if (requireAll || data.work_type_id !== undefined) {
    if (!data.work_type_id || !Number.isInteger(Number(data.work_type_id)))
      errors.push('work_type_id is required and must be an integer');
  }
  if (requireAll || data.priority !== undefined) {
    const p = Number(data.priority);
    if (!Number.isInteger(p) || p < 1 || p > 5)
      errors.push('priority must be 1–5');
  }
  if (data.status !== undefined && !VALID_STATUSES.has(data.status))
    errors.push(`status must be one of: ${[...VALID_STATUSES].join(', ')}`);

  return errors;
}

// ── Handler registration ──────────────────────────────────────────────────────
function registerRequestHandlers(ipcMain, dbModule) {
  const db = dbModule.getDb();

  // ── records:list ────────────────────────────────────────────────────────────
  ipcMain.handle('records:list', (_evt, filters = {}, sortCol = 'id', sortDir = 'desc', page = 0, pageSize = 10) => {
    try {
      const where  = [];
      const params = [];

      if (filters.search) {
        const q = `%${filters.search}%`;
        where.push('(r.title LIKE ? OR c.full_name LIKE ? OR CAST(r.id AS TEXT) = ?)');
        params.push(q, q, String(filters.search).trim());
      }
      if (filters.status)       { where.push('r.status = ?');       params.push(filters.status); }
      if (filters.priority)     { where.push('r.priority = ?');     params.push(Number(filters.priority)); }
      if (filters.zone_id)      { where.push('r.zone_id = ?');      params.push(Number(filters.zone_id)); }
      if (filters.work_type_id) { where.push('r.work_type_id = ?'); params.push(Number(filters.work_type_id)); }

      const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

      // COUNT
      const countSql = `
        SELECT COUNT(*) AS n
        FROM requests r
        JOIN customers c  ON r.customer_id  = c.id
        LEFT JOIN zones z ON r.zone_id      = z.id
        JOIN work_types wt ON r.work_type_id = wt.id
        ${whereClause}
      `;
      const total = db.prepare(countSql).get(...params).n;

      // ROWS
      const col     = SORT_MAP[sortCol] || 'r.id';
      const dir     = sortDir === 'asc' ? 'ASC' : 'DESC';
      const offset  = page * pageSize;
      const rowsSql = `${BASE_SELECT} ${whereClause} ORDER BY ${col} ${dir} LIMIT ? OFFSET ?`;
      const rows    = db.prepare(rowsSql).all(...params, pageSize, offset);

      return { items: rows.map(mapRow), total, page, pageSize };
    } catch (err) {
      return { __error: { code: 'DB_ERROR', message: err.message } };
    }
  });

  // ── records:get ─────────────────────────────────────────────────────────────
  ipcMain.handle('records:get', (_evt, id) => {
    try {
      const row = db.prepare(`${BASE_SELECT} WHERE r.id = ?`).get(id);
      if (!row) return { __error: { code: 'NOT_FOUND', message: `Request #${id} not found` } };
      return mapRow(row);
    } catch (err) {
      return { __error: { code: 'DB_ERROR', message: err.message } };
    }
  });

  // ── records:create ──────────────────────────────────────────────────────────
  ipcMain.handle('records:create', (_evt, data) => {
    try {
      const errs = validateRequest(data, true);
      if (errs.length) return { __error: { code: 'VALIDATION', message: errs.join('; ') } };

      const info = db.prepare(`
        INSERT INTO requests(title, description, customer_id, zone_id, work_type_id, priority, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        data.title.trim(),
        data.description || null,
        Number(data.customer_id),
        data.zone_id ? Number(data.zone_id) : null,
        Number(data.work_type_id),
        Number(data.priority),
        data.status || 'new',
      );

      writeAudit(db, 'request', info.lastInsertRowid, 'create', 'admin', 'Request created');

      const row = db.prepare(`${BASE_SELECT} WHERE r.id = ?`).get(info.lastInsertRowid);
      return mapRow(row);
    } catch (err) {
      return { __error: { code: 'DB_ERROR', message: err.message } };
    }
  });

  // ── records:update ──────────────────────────────────────────────────────────
  ipcMain.handle('records:update', (_evt, id, data) => {
    try {
      const existing = db.prepare('SELECT * FROM requests WHERE id = ?').get(id);
      if (!existing) return { __error: { code: 'NOT_FOUND', message: `Request #${id} not found` } };

      const errs = validateRequest(data, false);
      if (errs.length) return { __error: { code: 'VALIDATION', message: errs.join('; ') } };

      // Build SET clause from provided fields only
      const allowed = ['title', 'description', 'customer_id', 'zone_id', 'work_type_id', 'priority', 'status'];
      const sets    = [];
      const vals    = [];

      for (const key of allowed) {
        if (data[key] !== undefined) {
          sets.push(`${key} = ?`);
          vals.push(data[key] === '' ? null : data[key]);
        }
      }

      if (sets.length === 0) return { __error: { code: 'VALIDATION', message: 'No fields to update' } };

      db.prepare(`UPDATE requests SET ${sets.join(', ')} WHERE id = ?`).run(...vals, id);

      const detail = data.status && data.status !== existing.status
        ? `status: ${existing.status} → ${data.status}`
        : 'Request updated';
      writeAudit(db, 'request', id, 'update', 'admin', detail);

      const row = db.prepare(`${BASE_SELECT} WHERE r.id = ?`).get(id);
      return mapRow(row);
    } catch (err) {
      return { __error: { code: 'DB_ERROR', message: err.message } };
    }
  });

  // ── records:delete ──────────────────────────────────────────────────────────
  ipcMain.handle('records:delete', (_evt, id) => {
    try {
      const existing = db.prepare('SELECT id, title FROM requests WHERE id = ?').get(id);
      if (!existing) return { __error: { code: 'NOT_FOUND', message: `Request #${id} not found` } };

      db.prepare('DELETE FROM requests WHERE id = ?').run(id);
      writeAudit(db, 'request', id, 'delete', 'admin', `Request "${existing.title}" deleted`);

      return { success: true };
    } catch (err) {
      return { __error: { code: 'DB_ERROR', message: err.message } };
    }
  });

  // ── records:restore ─────────────────────────────────────────────────────────
  ipcMain.handle('records:restore', (_evt, req) => {
    try {
      const info = db.prepare(`
        INSERT INTO requests(title, description, customer_id, zone_id, work_type_id, priority, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        req.title,
        req.description || null,
        req.customer_id,
        req.zone_id || null,
        req.work_type_id,
        req.priority,
        req.status,
      );
      writeAudit(db, 'request', info.lastInsertRowid, 'create', 'admin', 'Request restored after undo');
      return { success: true, id: info.lastInsertRowid };
    } catch (err) {
      return { __error: { code: 'DB_ERROR', message: err.message } };
    }
  });

  // ── records:stats ────────────────────────────────────────────────────────────
  ipcMain.handle('records:stats', () => {
    try {
      const all      = db.prepare('SELECT status, priority FROM requests').all();
      const recent   = db.prepare(`${BASE_SELECT} ORDER BY r.updated_at DESC LIMIT 5`).all().map(mapRow);

      const byStatus   = { new: 0, scheduled: 0, en_route: 0, in_progress: 0, done: 0, cancelled: 0 };
      const byPriority = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

      for (const r of all) {
        byStatus[r.status]     = (byStatus[r.status]     || 0) + 1;
        byPriority[r.priority] = (byPriority[r.priority] || 0) + 1;
      }

      const active =
        (byStatus.new || 0) + (byStatus.scheduled || 0) +
        (byStatus.en_route || 0) + (byStatus.in_progress || 0);

      return {
        total:          all.length,
        active,
        done:           byStatus.done      || 0,
        cancelled:      byStatus.cancelled || 0,
        byStatus,
        byPriority,
        recentRequests: recent,
      };
    } catch (err) {
      return { __error: { code: 'DB_ERROR', message: err.message } };
    }
  });
}

module.exports = { registerRequestHandlers };
