export interface HistoryLog {
  id: number;
  timestamp: string;
  user: number;
  user_name?: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'REVERT' | 'ASSIGN' | 'REMOVE' | 'SUBMIT' | 'APPROVE' | 'REJECT' | 'CANCEL' | 'LOGIN' | 'LOGOUT';
  change_type: 'ACTIVITY' | 'OBJECTIVE' | 'PERSONNEL' | 'BUDGET' | 'COMPENSATION' | 'PROJECT' | 'ROLE' | 'DEPARTMENT' | 'CHANGE_REQUEST' | 'USER';
  module?: string;
  description: string;
  project: number;
  project_name?: string;
  entity_id?: number | null;
  old_state?: Record<string, unknown> | null;
  new_state?: Record<string, unknown> | null;
  related_change_request?: number | null;
  remaining_until_archive?: string;
  archived_at?: string;
  purge_at?: string;
  remaining_days?: number;
}

export interface HistoryLogFilters {
  project?: number;
  change_type?: HistoryLog["change_type"];
  action?: HistoryLog["action"];
  search?: string;
}

export interface ApiResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
