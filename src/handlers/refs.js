'use strict';

function registerRefHandlers(ipcMain, dbModule) {
  const db = dbModule.getDb();

  ipcMain.handle('refs:zones', () => {
    try {
      return db.prepare('SELECT * FROM zones ORDER BY name').all();
    } catch (err) {
      return { __error: { code: 'DB_ERROR', message: err.message } };
    }
  });

  ipcMain.handle('refs:workTypes', () => {
    try {
      return db.prepare('SELECT * FROM work_types ORDER BY name').all();
    } catch (err) {
      return { __error: { code: 'DB_ERROR', message: err.message } };
    }
  });

  ipcMain.handle('refs:customers', () => {
    try {
      return db.prepare(`
        SELECT c.*, z.name AS zone_name
        FROM customers c
        LEFT JOIN zones z ON c.zone_id = z.id
        ORDER BY c.full_name
      `).all().map(row => ({
        id:         row.id,
        full_name:  row.full_name,
        phone:      row.phone,
        address:    row.address,
        zone_id:    row.zone_id,
        zone:       row.zone_id ? { id: row.zone_id, name: row.zone_name } : null,
        created_at: row.created_at,
      }));
    } catch (err) {
      return { __error: { code: 'DB_ERROR', message: err.message } };
    }
  });

  ipcMain.handle('refs:technicians', (_evt, activeOnly = false) => {
    try {
      const sql = activeOnly
        ? 'SELECT t.*, z.name AS zone_name FROM technicians t LEFT JOIN zones z ON t.zone_id = z.id WHERE t.is_active = 1 ORDER BY t.full_name'
        : 'SELECT t.*, z.name AS zone_name FROM technicians t LEFT JOIN zones z ON t.zone_id = z.id ORDER BY t.full_name';
      return db.prepare(sql).all().map(row => ({
        id:         row.id,
        full_name:  row.full_name,
        phone:      row.phone,
        zone_id:    row.zone_id,
        zone:       row.zone_id ? { id: row.zone_id, name: row.zone_name } : null,
        is_active:  row.is_active === 1,
        created_at: row.created_at,
      }));
    } catch (err) {
      return { __error: { code: 'DB_ERROR', message: err.message } };
    }
  });
}

module.exports = { registerRefHandlers };
