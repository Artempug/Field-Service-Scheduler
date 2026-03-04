'use strict';

const { dialog } = require('electron');
const fs         = require('fs');

function registerExportHandlers(ipcMain, dbModule, getWindow) {
  const db = dbModule.getDb();

  ipcMain.handle('export:csv', async () => {
    try {
      // Query all requests with joined data
      const rows = db.prepare(`
        SELECT
          r.id, r.title, r.status, r.priority,
          c.full_name AS customer,
          COALESCE(z.name, '') AS zone,
          wt.name AS work_type,
          r.created_at, r.updated_at
        FROM requests r
        JOIN customers c   ON r.customer_id  = c.id
        LEFT JOIN zones z  ON r.zone_id      = z.id
        JOIN work_types wt ON r.work_type_id = wt.id
        ORDER BY r.id
      `).all();

      // Build CSV
      const escape = (v) => {
        const s = v == null ? '' : String(v);
        return s.includes(',') || s.includes('"') || s.includes('\n')
          ? `"${s.replace(/"/g, '""')}"`
          : s;
      };

      const header = ['ID', 'Title', 'Status', 'Priority', 'Customer', 'Zone', 'Work Type', 'Created At', 'Updated At'];
      const csvLines = [
        header.join(','),
        ...rows.map(r =>
          [r.id, r.title, r.status, r.priority, r.customer, r.zone, r.work_type, r.created_at, r.updated_at]
            .map(escape)
            .join(','),
        ),
      ];
      const csv = csvLines.join('\r\n');

      // Native save dialog
      const win       = getWindow();
      const timestamp = new Date().toISOString().slice(0, 10);
      const { canceled, filePath } = await dialog.showSaveDialog(win, {
        title:       'Export Requests as CSV',
        defaultPath: `fss-export-${timestamp}.csv`,
        filters: [
          { name: 'CSV Files', extensions: ['csv'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      if (canceled || !filePath) return { success: false };

      fs.writeFileSync(filePath, csv, 'utf-8');

      // Audit
      db.prepare(
        "INSERT INTO audit_log(entity, entity_id, action, actor, details) VALUES ('export', 0, 'export', 'admin', ?)",
      ).run(`CSV exported to ${filePath} (${rows.length} records)`);

      return { success: true, path: filePath };
    } catch (err) {
      return { __error: { code: 'EXPORT_ERROR', message: err.message } };
    }
  });
}

module.exports = { registerExportHandlers };
