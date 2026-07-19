export type RegistrationRequestStatus = "PENDING" | "APPROVED" | "REJECTED";
export type RequestableSystemRole = "PROJECT_STAFF" | "EXECUTIVE";

export interface RegistrationRequest {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  requested_role: RequestableSystemRole;
  requested_role_display: string;
  project: number;
  project_name: string;
  invitation_code: string;
  status: RegistrationRequestStatus;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by_email: string | null;
  rejection_reason: string;
}
