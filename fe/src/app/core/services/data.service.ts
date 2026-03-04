import { Injectable } from '@angular/core';
import { BehaviorSubject, from, Observable, of } from 'rxjs';
import { delay, map, switchMap, take } from 'rxjs/operators';
import {
  AuditLog,
  Assignment,
  Customer,
  DashboardStats,
  PagedResult,
  Priority,
  RequestFilters,
  RequestStatus,
  ServiceRequest,
  Technician,
  WorkType,
  Zone,
} from '../models';

// ── Electron IPC helpers ──────────────────────────────────────────────────────

function isElectron(): boolean {
  return !!window.api;
}

function unwrap<T>(value: T): T {
  const v = value as unknown as { __error?: { code: string; message: string } };
  if (v?.__error) {
    const err = new Error(v.__error.message);
    (err as Error & { code: string }).code = v.__error.code;
    throw err;
  }
  return value;
}

function fromApi<T>(promise: Promise<T>): Observable<T> {
  return from(promise.then(unwrap));
}

// ── Browser mock data (used when window.api is not available) ─────────────────

const ZONES: Zone[] = [
  { id: 1, name: 'North' },
  { id: 2, name: 'South' },
  { id: 3, name: 'East' },
  { id: 4, name: 'West' },
];

const WORK_TYPES: WorkType[] = [
  { id: 1, name: 'Installation', default_duration_min: 120 },
  { id: 2, name: 'Repair',       default_duration_min: 60  },
  { id: 3, name: 'Maintenance',  default_duration_min: 90  },
  { id: 4, name: 'Inspection',   default_duration_min: 30  },
];

const TECHNICIANS: Technician[] = [
  { id: 1, full_name: 'John Smith',     phone: '+1-555-0101', zone_id: 1, zone: ZONES[0], is_active: true,  created_at: '2024-01-15T10:00:00' },
  { id: 2, full_name: 'Maria Garcia',   phone: '+1-555-0102', zone_id: 2, zone: ZONES[1], is_active: true,  created_at: '2024-01-16T10:00:00' },
  { id: 3, full_name: 'Robert Johnson', phone: '+1-555-0103', zone_id: 3, zone: ZONES[2], is_active: true,  created_at: '2024-02-01T10:00:00' },
  { id: 4, full_name: 'Emily Davis',    phone: null,          zone_id: 4, zone: ZONES[3], is_active: false, created_at: '2024-02-10T10:00:00' },
  { id: 5, full_name: 'Carlos Ruiz',    phone: '+1-555-0105', zone_id: 1, zone: ZONES[0], is_active: true,  created_at: '2024-03-01T10:00:00' },
  { id: 6, full_name: 'Anna Kowalski',  phone: '+1-555-0106', zone_id: 2, zone: ZONES[1], is_active: true,  created_at: '2024-03-05T10:00:00' },
];

const CUSTOMERS: Customer[] = [
  { id: 1, full_name: 'Acme Corporation',   phone: '+1-555-1001', address: '123 Main St, Springfield',     zone_id: 1, zone: ZONES[0], created_at: '2024-01-20T10:00:00' },
  { id: 2, full_name: 'Tech Solutions LLC', phone: '+1-555-1002', address: '456 Oak Ave, Shelbyville',     zone_id: 2, zone: ZONES[1], created_at: '2024-01-22T10:00:00' },
  { id: 3, full_name: 'Global Industries',  phone: '+1-555-1003', address: '789 Pine Rd, Capitol City',    zone_id: 1, zone: ZONES[0], created_at: '2024-02-05T10:00:00' },
  { id: 4, full_name: 'MegaCorp Inc.',       phone: null,         address: '321 Elm St, Ogdenville',       zone_id: 3, zone: ZONES[2], created_at: '2024-02-15T10:00:00' },
  { id: 5, full_name: 'StartUp Co.',        phone: '+1-555-1005', address: null,                           zone_id: 4, zone: ZONES[3], created_at: '2024-03-01T10:00:00' },
  { id: 6, full_name: 'Metro Services',     phone: '+1-555-1006', address: '555 Riverside Dr, Springfield',zone_id: 2, zone: ZONES[1], created_at: '2024-03-10T10:00:00' },
];

function d(y: number, m: number, day: number, h = 9): string {
  return new Date(y, m - 1, day, h, 0, 0).toISOString();
}

const MOCK_REQUESTS: ServiceRequest[] = [
  { id:  1, title: 'HVAC Unit Installation',    description: 'Full installation of industrial HVAC unit.',           customer_id: 1, customer: CUSTOMERS[0], zone_id: 1, zone: ZONES[0], work_type_id: 1, work_type: WORK_TYPES[0], priority: 2, status: 'scheduled',   created_at: d(2024,4,1),  updated_at: d(2024,4,2,14) },
  { id:  2, title: 'Electrical Panel Repair',   description: null,                                                   customer_id: 2, customer: CUSTOMERS[1], zone_id: 2, zone: ZONES[1], work_type_id: 2, work_type: WORK_TYPES[1], priority: 1, status: 'in_progress', created_at: d(2024,4,2),  updated_at: d(2024,4,3,8)  },
  { id:  3, title: 'Plumbing Inspection',        description: 'Annual plumbing check for leaks and pressure test.',  customer_id: 3, customer: CUSTOMERS[2], zone_id: 1, zone: ZONES[0], work_type_id: 4, work_type: WORK_TYPES[3], priority: 4, status: 'done',        created_at: d(2024,3,15), updated_at: d(2024,3,20,16) },
  { id:  4, title: 'Security System Setup',      description: null,                                                  customer_id: 4, customer: CUSTOMERS[3], zone_id: 3, zone: ZONES[2], work_type_id: 1, work_type: WORK_TYPES[0], priority: 3, status: 'new',         created_at: d(2024,4,5),  updated_at: d(2024,4,5)    },
  { id:  5, title: 'Network Infrastructure',     description: 'Replace aging network switches and re-run Cat6.',    customer_id: 1, customer: CUSTOMERS[0], zone_id: 1, zone: ZONES[0], work_type_id: 1, work_type: WORK_TYPES[0], priority: 2, status: 'scheduled',   created_at: d(2024,4,3),  updated_at: d(2024,4,4)    },
  { id:  6, title: 'Generator Maintenance',      description: null,                                                  customer_id: 2, customer: CUSTOMERS[1], zone_id: 2, zone: ZONES[1], work_type_id: 3, work_type: WORK_TYPES[2], priority: 3, status: 'done',        created_at: d(2024,3,10), updated_at: d(2024,3,18,15) },
  { id:  7, title: 'Solar Panel Installation',   description: 'Rooftop installation of 48 solar panels.',           customer_id: 5, customer: CUSTOMERS[4], zone_id: 4, zone: ZONES[3], work_type_id: 1, work_type: WORK_TYPES[0], priority: 3, status: 'en_route',    created_at: d(2024,4,6),  updated_at: d(2024,4,7,8)  },
  { id:  8, title: 'Fire Alarm Testing',         description: null,                                                  customer_id: 3, customer: CUSTOMERS[2], zone_id: 1, zone: ZONES[0], work_type_id: 4, work_type: WORK_TYPES[3], priority: 2, status: 'cancelled',   created_at: d(2024,3,20), updated_at: d(2024,3,25)   },
  { id:  9, title: 'Elevator Maintenance',       description: 'Quarterly maintenance and safety check.',             customer_id: 4, customer: CUSTOMERS[3], zone_id: 3, zone: ZONES[2], work_type_id: 3, work_type: WORK_TYPES[2], priority: 2, status: 'scheduled',   created_at: d(2024,4,4),  updated_at: d(2024,4,4)    },
  { id: 10, title: 'Roof Assessment',            description: null,                                                  customer_id: 6, customer: CUSTOMERS[5], zone_id: 2, zone: ZONES[1], work_type_id: 4, work_type: WORK_TYPES[3], priority: 4, status: 'new',         created_at: d(2024,4,7),  updated_at: d(2024,4,7)    },
  { id: 11, title: 'Server Room Cooling Repair', description: 'Critical cooling failure in main server room.',      customer_id: 1, customer: CUSTOMERS[0], zone_id: 1, zone: ZONES[0], work_type_id: 2, work_type: WORK_TYPES[1], priority: 1, status: 'done',        created_at: d(2024,3,5),  updated_at: d(2024,3,6,18)  },
  { id: 12, title: 'Parking Lot Lighting',       description: null,                                                  customer_id: 5, customer: CUSTOMERS[4], zone_id: 4, zone: ZONES[3], work_type_id: 1, work_type: WORK_TYPES[0], priority: 5, status: 'new',         created_at: d(2024,4,8),  updated_at: d(2024,4,8)    },
  { id: 13, title: 'Emergency Generator Repair', description: 'Generator failed during last power outage.',         customer_id: 2, customer: CUSTOMERS[1], zone_id: 2, zone: ZONES[1], work_type_id: 2, work_type: WORK_TYPES[1], priority: 1, status: 'in_progress', created_at: d(2024,4,8),  updated_at: d(2024,4,8,11) },
  { id: 14, title: 'Water Heater Replacement',   description: null,                                                  customer_id: 3, customer: CUSTOMERS[2], zone_id: 1, zone: ZONES[0], work_type_id: 1, work_type: WORK_TYPES[0], priority: 3, status: 'scheduled',   created_at: d(2024,4,5),  updated_at: d(2024,4,6)    },
  { id: 15, title: 'AC System Tune-up',          description: 'Seasonal maintenance before summer.',                customer_id: 6, customer: CUSTOMERS[5], zone_id: 2, zone: ZONES[1], work_type_id: 3, work_type: WORK_TYPES[2], priority: 4, status: 'done',        created_at: d(2024,3,25), updated_at: d(2024,4,1,17) },
  { id: 16, title: 'Office Rewiring',            description: null,                                                  customer_id: 4, customer: CUSTOMERS[3], zone_id: 3, zone: ZONES[2], work_type_id: 1, work_type: WORK_TYPES[0], priority: 3, status: 'cancelled',   created_at: d(2024,3,28), updated_at: d(2024,4,2)    },
  { id: 17, title: 'Backup Power Install',       description: 'Install UPS systems for critical equipment.',        customer_id: 1, customer: CUSTOMERS[0], zone_id: 1, zone: ZONES[0], work_type_id: 1, work_type: WORK_TYPES[0], priority: 2, status: 'new',         created_at: d(2024,4,9),  updated_at: d(2024,4,9)    },
  { id: 18, title: 'Camera System Upgrade',      description: null,                                                  customer_id: 5, customer: CUSTOMERS[4], zone_id: 4, zone: ZONES[3], work_type_id: 1, work_type: WORK_TYPES[0], priority: 4, status: 'scheduled',   created_at: d(2024,4,7),  updated_at: d(2024,4,8)    },
  { id: 19, title: 'Boiler Inspection',          description: 'Annual safety inspection required by regulation.',   customer_id: 6, customer: CUSTOMERS[5], zone_id: 2, zone: ZONES[1], work_type_id: 4, work_type: WORK_TYPES[3], priority: 2, status: 'done',        created_at: d(2024,3,18), updated_at: d(2024,3,22,14) },
  { id: 20, title: 'Telecom Line Repair',        description: null,                                                  customer_id: 4, customer: CUSTOMERS[3], zone_id: 3, zone: ZONES[2], work_type_id: 2, work_type: WORK_TYPES[1], priority: 3, status: 'en_route',    created_at: d(2024,4,9),  updated_at: d(2024,4,9,9)  },
];

const MOCK_ASSIGNMENTS: Assignment[] = [
  { id: 1, request_id: 1,  technician_id: 1, technician: TECHNICIANS[0], starts_at: d(2024,4,10,9),  ends_at: d(2024,4,10,11), notes: 'Bring ladder and safety harness',    created_at: d(2024,4,2) },
  { id: 2, request_id: 2,  technician_id: 2, technician: TECHNICIANS[1], starts_at: d(2024,4,3,8),   ends_at: d(2024,4,3,10),  notes: null,                                  created_at: d(2024,4,2) },
  { id: 3, request_id: 5,  technician_id: 5, technician: TECHNICIANS[4], starts_at: d(2024,4,12,10), ends_at: d(2024,4,12,14), notes: 'Customer will provide floor plans',   created_at: d(2024,4,4) },
  { id: 4, request_id: 7,  technician_id: 3, technician: TECHNICIANS[2], starts_at: d(2024,4,7,8),   ends_at: d(2024,4,7,16),  notes: null,                                  created_at: d(2024,4,6) },
  { id: 5, request_id: 9,  technician_id: 1, technician: TECHNICIANS[0], starts_at: d(2024,4,11,14), ends_at: d(2024,4,11,16), notes: 'Elevator out of service notice sent', created_at: d(2024,4,4) },
  { id: 6, request_id: 13, technician_id: 2, technician: TECHNICIANS[1], starts_at: d(2024,4,8,11),  ends_at: d(2024,4,8,13),  notes: null,                                  created_at: d(2024,4,8) },
  { id: 7, request_id: 14, technician_id: 6, technician: TECHNICIANS[5], starts_at: d(2024,4,15,9),  ends_at: d(2024,4,15,11), notes: null,                                  created_at: d(2024,4,6) },
  { id: 8, request_id: 18, technician_id: 3, technician: TECHNICIANS[2], starts_at: d(2024,4,13,10), ends_at: d(2024,4,13,14), notes: 'Old cameras to be disposed of',       created_at: d(2024,4,8) },
  { id: 9, request_id: 20, technician_id: 5, technician: TECHNICIANS[4], starts_at: d(2024,4,9,9),   ends_at: d(2024,4,9,11),  notes: null,                                  created_at: d(2024,4,9) },
];

MOCK_ASSIGNMENTS.forEach(a => {
  const req = MOCK_REQUESTS.find(r => r.id === a.request_id);
  if (req) req.assignment = a;
});

const MOCK_AUDIT: AuditLog[] = [
  { id:  1, entity: 'request',    entity_id:  1, action: 'create', actor: 'admin',   details: 'Request created',               created_at: d(2024,4,1,9)   },
  { id:  2, entity: 'request',    entity_id:  1, action: 'update', actor: 'admin',   details: 'status: new → scheduled',       created_at: d(2024,4,2,14)  },
  { id:  3, entity: 'assignment', entity_id:  1, action: 'create', actor: 'admin',   details: 'Assigned to John Smith',        created_at: d(2024,4,2,14)  },
  { id:  4, entity: 'request',    entity_id:  2, action: 'create', actor: 'manager', details: 'Request created',               created_at: d(2024,4,2,9)   },
  { id:  5, entity: 'request',    entity_id:  2, action: 'update', actor: 'manager', details: 'status: new → in_progress',     created_at: d(2024,4,3,8)   },
  { id:  6, entity: 'request',    entity_id:  3, action: 'create', actor: 'admin',   details: 'Request created',               created_at: d(2024,3,15,10) },
  { id:  7, entity: 'request',    entity_id:  3, action: 'update', actor: 'admin',   details: 'status: in_progress → done',    created_at: d(2024,3,20,16) },
  { id:  8, entity: 'technician', entity_id:  5, action: 'create', actor: 'admin',   details: 'New technician added',          created_at: d(2024,3,1,10)  },
  { id:  9, entity: 'request',    entity_id:  8, action: 'update', actor: 'manager', details: 'status: scheduled → cancelled', created_at: d(2024,3,25,11) },
  { id: 10, entity: 'request',    entity_id: 11, action: 'update', actor: 'admin',   details: 'status: in_progress → done',    created_at: d(2024,3,6,18)  },
  { id: 11, entity: 'customer',   entity_id:  6, action: 'create', actor: 'admin',   details: 'Customer Metro Services added', created_at: d(2024,3,10,9)  },
  { id: 12, entity: 'request',    entity_id: 13, action: 'create', actor: 'manager', details: 'Emergency request created',     created_at: d(2024,4,8,7)   },
  { id: 13, entity: 'assignment', entity_id:  6, action: 'create', actor: 'manager', details: 'Assigned to Maria Garcia',      created_at: d(2024,4,8,7)   },
  { id: 14, entity: 'request',    entity_id: 16, action: 'update', actor: 'manager', details: 'status: scheduled → cancelled', created_at: d(2024,4,2,10)  },
  { id: 15, entity: 'request',    entity_id:  6, action: 'update', actor: 'tech1',   details: 'status: in_progress → done',    created_at: d(2024,3,18,15) },
  { id: 16, entity: 'request',    entity_id:  7, action: 'update', actor: 'tech3',   details: 'status: scheduled → en_route',  created_at: d(2024,4,7,8)   },
  { id: 17, entity: 'request',    entity_id: 20, action: 'update', actor: 'tech5',   details: 'status: scheduled → en_route',  created_at: d(2024,4,9,9)   },
  { id: 18, entity: 'request',    entity_id: 15, action: 'update', actor: 'tech2',   details: 'status: in_progress → done',    created_at: d(2024,4,1,17)  },
  { id: 19, entity: 'request',    entity_id: 19, action: 'update', actor: 'admin',   details: 'status: in_progress → done',    created_at: d(2024,3,22,14) },
  { id: 20, entity: 'request',    entity_id: 17, action: 'create', actor: 'admin',   details: 'Request created',               created_at: d(2024,4,9,9)   },
];

// ── Mock implementation (browser fallback) ────────────────────────────────────

let mockNextId   = MOCK_REQUESTS.length + 1;
let mockNextAuditId = MOCK_AUDIT.length + 1;

class MockDataService {
  private _requests = new BehaviorSubject<ServiceRequest[]>([...MOCK_REQUESTS]);
  private _audit    = new BehaviorSubject<AuditLog[]>([...MOCK_AUDIT]);

  private sim<T>(value: T): Observable<T> {
    return of(value).pipe(delay(300 + Math.random() * 150));
  }

  getZones(): Observable<Zone[]>         { return this.sim(ZONES); }
  getWorkTypes(): Observable<WorkType[]> { return this.sim(WORK_TYPES); }
  getCustomers(): Observable<Customer[]> { return this.sim(CUSTOMERS); }
  getTechnicians(activeOnly = false): Observable<Technician[]> {
    return this.sim(activeOnly ? TECHNICIANS.filter(t => t.is_active) : TECHNICIANS);
  }

  getRequests(filters: RequestFilters, sortCol: string, sortDir: 'asc'|'desc', page: number, pageSize: number): Observable<PagedResult<ServiceRequest>> {
    return this._requests.pipe(take(1), map(all => {
      let list = [...all];
      if (filters.search) {
        const q = filters.search.toLowerCase();
        list = list.filter(r => r.title.toLowerCase().includes(q) || r.customer?.full_name.toLowerCase().includes(q) || r.id.toString().includes(q));
      }
      if (filters.status)       list = list.filter(r => r.status === filters.status);
      if (filters.priority)     list = list.filter(r => r.priority === Number(filters.priority));
      if (filters.zone_id)      list = list.filter(r => r.zone_id === Number(filters.zone_id));
      if (filters.work_type_id) list = list.filter(r => r.work_type_id === Number(filters.work_type_id));
      list.sort((a, b) => {
        let av: unknown = (a as unknown as Record<string,unknown>)[sortCol];
        let bv: unknown = (b as unknown as Record<string,unknown>)[sortCol];
        if (sortCol === 'customer') { av = a.customer?.full_name ?? ''; bv = b.customer?.full_name ?? ''; }
        if (sortCol === 'zone')     { av = a.zone?.name ?? '';          bv = b.zone?.name ?? '';          }
        const cmp = typeof av === 'string' ? (av as string).localeCompare(bv as string) : (av as number) - (bv as number);
        return sortDir === 'asc' ? cmp : -cmp;
      });
      const total = list.length;
      return { items: list.slice(page * pageSize, (page + 1) * pageSize), total, page, pageSize };
    }), switchMap(r => this.sim(r)));
  }

  getRequest(id: number): Observable<ServiceRequest | undefined> {
    return this._requests.pipe(take(1), map(all => all.find(r => r.id === id)), switchMap(r => this.sim(r)));
  }

  createRequest(data: Partial<ServiceRequest>): Observable<ServiceRequest> {
    const newReq: ServiceRequest = {
      id: mockNextId++, title: data.title ?? '', description: data.description ?? null,
      customer_id: data.customer_id ?? 1, customer: CUSTOMERS.find(c => c.id === data.customer_id),
      zone_id: data.zone_id ?? null,       zone: ZONES.find(z => z.id === data.zone_id),
      work_type_id: data.work_type_id ?? 1, work_type: WORK_TYPES.find(wt => wt.id === data.work_type_id),
      priority: (data.priority ?? 3) as Priority, status: (data.status ?? 'new') as RequestStatus,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    this._requests.next([newReq, ...this._requests.value]);
    this._addAudit('request', newReq.id, 'create', 'Request created');
    return this.sim(newReq);
  }

  updateRequest(id: number, data: Partial<ServiceRequest>): Observable<ServiceRequest> {
    const current = this._requests.value.find(r => r.id === id);
    if (!current) throw new Error('Not found');
    const updated: ServiceRequest = {
      ...current, ...data,
      customer: CUSTOMERS.find(c => c.id === (data.customer_id ?? current.customer_id)),
      zone: data.zone_id ? ZONES.find(z => z.id === data.zone_id) : current.zone,
      work_type: WORK_TYPES.find(wt => wt.id === (data.work_type_id ?? current.work_type_id)),
      updated_at: new Date().toISOString(),
    };
    this._requests.next(this._requests.value.map(r => r.id === id ? updated : r));
    this._addAudit('request', id, 'update', current.status !== updated.status ? `status: ${current.status} → ${updated.status}` : 'Request updated');
    return this.sim(updated);
  }

  deleteRequest(id: number): Observable<void> {
    this._requests.next(this._requests.value.filter(r => r.id !== id));
    this._addAudit('request', id, 'delete', 'Request deleted');
    return this.sim(undefined as void);
  }

  restoreRequest(req: ServiceRequest): void {
    this._requests.next([req, ...this._requests.value]);
  }

  getDashboardStats(): Observable<DashboardStats> {
    return this._requests.pipe(take(1), map(all => {
      const byStatus:   Record<string, number> = { new:0, scheduled:0, en_route:0, in_progress:0, done:0, cancelled:0 };
      const byPriority: Record<number, number> = { 1:0, 2:0, 3:0, 4:0, 5:0 };
      all.forEach(r => { byStatus[r.status] = (byStatus[r.status]??0)+1; byPriority[r.priority] = (byPriority[r.priority]??0)+1; });
      const active = (byStatus['new']??0)+(byStatus['scheduled']??0)+(byStatus['en_route']??0)+(byStatus['in_progress']??0);
      return { total: all.length, active, done: byStatus['done']??0, cancelled: byStatus['cancelled']??0, byStatus, byPriority,
               recentRequests: [...all].sort((a,b) => b.updated_at.localeCompare(a.updated_at)).slice(0,5) };
    }), switchMap(s => this.sim(s)));
  }

  getAuditLog(entityFilter: string, actionFilter: string, actorFilter: string, page: number, pageSize: number): Observable<PagedResult<AuditLog>> {
    return this._audit.pipe(take(1), map(all => {
      let list = [...all];
      if (entityFilter) list = list.filter(l => l.entity === entityFilter);
      if (actionFilter) list = list.filter(l => l.action === actionFilter);
      if (actorFilter)  list = list.filter(l => l.actor?.toLowerCase().includes(actorFilter.toLowerCase()));
      list.sort((a,b) => b.created_at.localeCompare(a.created_at));
      return { items: list.slice(page*pageSize,(page+1)*pageSize), total: list.length, page, pageSize };
    }), switchMap(r => this.sim(r)));
  }

  private _addAudit(entity: string, entityId: number, action: string, details: string): void {
    this._audit.next([{ id: mockNextAuditId++, entity, entity_id: entityId, action, actor: 'admin', details, created_at: new Date().toISOString() }, ...this._audit.value]);
  }
}

// ── Public service (auto-selects Electron IPC or browser mock) ────────────────

@Injectable({ providedIn: 'root' })
export class DataService {
  private mock = new MockDataService();

  getZones(): Observable<Zone[]> {
    return isElectron() ? fromApi(window.api!.refs.zones()) : this.mock.getZones();
  }

  getWorkTypes(): Observable<WorkType[]> {
    return isElectron() ? fromApi(window.api!.refs.workTypes()) : this.mock.getWorkTypes();
  }

  getCustomers(): Observable<Customer[]> {
    return isElectron() ? fromApi(window.api!.refs.customers()) : this.mock.getCustomers();
  }

  getTechnicians(activeOnly = false): Observable<Technician[]> {
    return isElectron() ? fromApi(window.api!.refs.technicians(activeOnly)) : this.mock.getTechnicians(activeOnly);
  }

  getRequests(filters: RequestFilters, sortCol: string, sortDir: 'asc'|'desc', page: number, pageSize: number): Observable<PagedResult<ServiceRequest>> {
    return isElectron() ? fromApi(window.api!.records.list(filters, sortCol, sortDir, page, pageSize)) : this.mock.getRequests(filters, sortCol, sortDir, page, pageSize);
  }

  getRequest(id: number): Observable<ServiceRequest | undefined> {
    if (!isElectron()) return this.mock.getRequest(id);
    return from(window.api!.records.get(id).then(unwrap).catch(err => {
      if ((err as Error & { code?: string }).code === 'NOT_FOUND') return undefined;
      throw err;
    }));
  }

  createRequest(data: Partial<ServiceRequest>): Observable<ServiceRequest> {
    return isElectron() ? fromApi(window.api!.records.create(data)) : this.mock.createRequest(data);
  }

  updateRequest(id: number, data: Partial<ServiceRequest>): Observable<ServiceRequest> {
    return isElectron() ? fromApi(window.api!.records.update(id, data)) : this.mock.updateRequest(id, data);
  }

  deleteRequest(id: number): Observable<void> {
    if (!isElectron()) return this.mock.deleteRequest(id);
    return from(window.api!.records.delete(id).then(unwrap).then(() => undefined));
  }

  restoreRequest(req: ServiceRequest): void {
    if (isElectron()) {
      window.api!.records.restore(req).catch(console.error);
    } else {
      this.mock.restoreRequest(req);
    }
  }

  getDashboardStats(): Observable<DashboardStats> {
    return isElectron() ? fromApi(window.api!.records.stats()) : this.mock.getDashboardStats();
  }

  getAuditLog(entityFilter: string, actionFilter: string, actorFilter: string, page: number, pageSize: number): Observable<PagedResult<AuditLog>> {
    return isElectron() ? fromApi(window.api!.audit.list(entityFilter, actionFilter, actorFilter, page, pageSize)) : this.mock.getAuditLog(entityFilter, actionFilter, actorFilter, page, pageSize);
  }
}
