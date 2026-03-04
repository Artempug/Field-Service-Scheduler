import type {
  Zone, WorkType, Customer, Technician,
  ServiceRequest, AuditLog, PagedResult,
  RequestFilters, DashboardStats,
} from './app/core/models';

interface ElectronApi {
  records: {
    list(
      filters: RequestFilters,
      sortCol: string,
      sortDir: 'asc' | 'desc',
      page: number,
      pageSize: number,
    ): Promise<PagedResult<ServiceRequest>>;

    get(id: number): Promise<ServiceRequest>;
    create(data: Partial<ServiceRequest>): Promise<ServiceRequest>;
    update(id: number, data: Partial<ServiceRequest>): Promise<ServiceRequest>;
    delete(id: number): Promise<{ success: boolean }>;
    restore(data: Partial<ServiceRequest>): Promise<{ success: boolean; id: number }>;
    stats(): Promise<DashboardStats>;
  };

  audit: {
    list(
      entity: string,
      action: string,
      actor: string,
      page: number,
      pageSize: number,
    ): Promise<PagedResult<AuditLog>>;
  };

  refs: {
    zones(): Promise<Zone[]>;
    workTypes(): Promise<WorkType[]>;
    customers(): Promise<Customer[]>;
    technicians(activeOnly?: boolean): Promise<Technician[]>;
  };

  export: {
    csv(): Promise<{ success: boolean; path?: string }>;
  };
}

declare global {
  interface Window {
    /** Available only inside Electron (injected via preload contextBridge). */
    api?: ElectronApi;
  }
}

export {};
