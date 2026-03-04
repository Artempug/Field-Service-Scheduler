'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// Helper: wrap ipcRenderer.invoke and rethrow backend errors as JS errors
function invoke(channel, ...args) {
  return ipcRenderer.invoke(channel, ...args).then(result => {
    if (result && result.__error) {
      const err = new Error(result.__error.message);
      err.code = result.__error.code;
      throw err;
    }
    return result;
  });
}

// ── Exposed API (whitelisted) ────────────────────────────────────────────────
contextBridge.exposeInMainWorld('api', {

  records: {
    /** listRecords({ search, status, priority, zone_id, work_type_id }, sortCol, sortDir, page, pageSize) */
    list: (filters, sortCol, sortDir, page, pageSize) =>
      invoke('records:list', filters, sortCol, sortDir, page, pageSize),

    /** getRecord(id) */
    get: (id) => invoke('records:get', id),

    /** createRecord(data) */
    create: (data) => invoke('records:create', data),

    /** updateRecord(id, data) */
    update: (id, data) => invoke('records:update', id, data),

    /** deleteRecord(id) */
    delete: (id) => invoke('records:delete', id),

    /** restoreRecord(data) – re-inserts a previously deleted record */
    restore: (data) => invoke('records:restore', data),

    /** getDashboardStats() */
    stats: () => invoke('records:stats'),
  },

  audit: {
    /** listAuditLog(entity, action, actor, page, pageSize) */
    list: (entity, action, actor, page, pageSize) =>
      invoke('audit:list', entity, action, actor, page, pageSize),
  },

  refs: {
    zones:       ()            => invoke('refs:zones'),
    workTypes:   ()            => invoke('refs:workTypes'),
    customers:   ()            => invoke('refs:customers'),
    technicians: (activeOnly)  => invoke('refs:technicians', activeOnly),
  },

  export: {
    /** Opens native save dialog and writes CSV. Returns { success, path? } */
    csv: () => invoke('export:csv'),
  },
});
