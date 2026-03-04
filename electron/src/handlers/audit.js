'use strict';

function registerAuditHandlers(ipcMain, dbModule) {
  const db = dbModule.getDb();

  // ── audit:list ───────────────────────────────────────────────────────────────
  ipcMain.handle('audit:list', (_evt, entity = '', action = '', actor = '', page = 0, pageSize = 20) => {
    try {
      const where  = [];
      const params = [];

      if (entity) { where.push('entity = ?'); params.push(entity); }
      if (action) { where.push('action = ?'); params.push(action); }
      if (actor)  { where.push('actor LIKE ?'); params.push(`%${actor}%`); }

      const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

      const total  = db.prepare(`SELECT COUNT(*) AS n FROM audit_log ${whereClause}`).get(...params).n;
      const offset = page * pageSize;
      const items  = db.prepare(
        `SELECT * FROM audit_log ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      ).all(...params, pageSize, offset);

      return { items, total, page, pageSize };
    } catch (err) {
      return { __error: { code: 'DB_ERROR', message: err.message } };
    }
  });
}

module.exports = { registerAuditHandlers };
