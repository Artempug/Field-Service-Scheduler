export type RequestStatus =
  | 'new'
  | 'scheduled'
  | 'en_route'
  | 'in_progress'
  | 'done'
  | 'cancelled';

export type Priority = 1 | 2 | 3 | 4 | 5;

export interface Zone {
  id: number;
  name: string;
}

export interface WorkType {
  id: number;
  name: string;
  default_duration_min: number;
}

export interface Technician {
  id: number;
  full_name: string;
  phone: string | null;
  zone_id: number | null;
  zone?: Zone;
  is_active: boolean;
  created_at: string;
}

export interface Customer {
  id: number;
  full_name: string;
  phone: string | null;
  address: string | null;
  zone_id: number | null;
  zone?: Zone;
  created_at: string;
}

export interface Assignment {
  id: number;
  request_id: number;
  technician_id: number;
  technician?: Technician;
  starts_at: string;
  ends_at: string;
  notes: string | null;
  created_at: string;
}

export interface ServiceRequest {
  id: number;
  title: string;
  description: string | null;
  customer_id: number;
  customer?: Customer;
  zone_id: number | null;
  zone?: Zone;
  work_type_id: number;
  work_type?: WorkType;
  priority: Priority;
  status: RequestStatus;
  created_at: string;
  updated_at: string;
  assignment?: Assignment;
}

export interface AuditLog {
  id: number;
  entity: string;
  entity_id: number;
  action: string;
  actor: string | null;
  details: string | null;
  created_at: string;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface RequestFilters {
  search: string;
  status: RequestStatus | '';
  priority: number | '';
  zone_id: number | '';
  work_type_id: number | '';
}

export interface DashboardStats {
  total: number;
  active: number;
  done: number;
  cancelled: number;
  byStatus: Record<string, number>;
  byPriority: Record<number, number>;
  recentRequests: ServiceRequest[];
}
