export interface ChangeRequestVersion {
  id: number;
  version_number: number;
  status: 'PENDING' | 'REJECTED' | 'RESUBMITTED' | 'APPROVED' | 'ARCHIVED';
  description: string;
  admin_feedback?: string;
  change_type: ChangeRequest['change_type'];
  operation: ChangeRequest['operation'];
  entity_id?: number | null;
  current_state?: Record<string, unknown> | null;
  proposed_changes: Record<string, unknown>;
  submitted_at: string;
  reviewed_at?: string | null;
  reviewed_by?: number | null;
  reviewed_by_name?: string;
}

export interface ChangeRequest {
  id: number;
  project: number;
  project_name?: string;
  submitted_by: number;
  submitted_by_name?: string;
  request_code?: string;
  change_type: 'ACTIVITY' | 'OBJECTIVE' | 'PERSONNEL' | 'BUDGET' | 'COMPENSATION' | 'PROJECT' | 'ROLE' | 'DEPARTMENT' | 'CHANGE_REQUEST' | 'USER';
  operation: 'CREATE' | 'UPDATE' | 'DELETE' | 'ASSIGN' | 'APPROVE' | 'REJECT' | 'CANCEL' | 'LOGIN' | 'LOGOUT';
  status: 'PENDING' | 'REJECTED' | 'RESUBMITTED' | 'APPROVED' | 'ARCHIVED';
  description: string;
  entity_id?: number | null;
  current_state?: Record<string, unknown> | null;
  proposed_changes: Record<string, unknown>;
  approved_by?: number | null;
  approved_by_name?: string;
  date_submitted: string;
  updated_at?: string;
  date_processed?: string | null;
  rejection_reason?: string;
  cancel_reason?: string;
  versions?: ChangeRequestVersion[];
  current_version?: number;
  latest_version?: ChangeRequestVersion;
  latest_status?: ChangeRequest['status'];
  latest_feedback?: string;
}

export interface ChangeRequestCreateData {
  project: number;
  change_type: ChangeRequest['change_type'];
  operation: ChangeRequest['operation'];
  description: string;
  entity_id?: number | null;
  current_state?: Record<string, unknown> | null;
  proposed_changes: Record<string, unknown>;
}

export interface ChangeRequestFilters {
  status?: ChangeRequest['status'];
  change_type?: ChangeRequest['change_type'];
  operation?: ChangeRequest['operation'];
  project?: number;
}
