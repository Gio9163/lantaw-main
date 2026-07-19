export interface ProjectMember {
  id: number;
  user: number;
  project: number;
  full_name: string;
  email: string;
  system_role: "ADMIN" | "EXECUTIVE" | "PROJECT_STAFF";
  system_role_display: string;
  membership_status: "ACTIVE" | "INACTIVE";
  date_joined: string;
  invitation_status: "ACCEPTED";
}

export type ProjectInvitationStatus =
  | "SENT"
  | "PENDING_APPROVAL"
  | "ACCEPTED"
  | "EXPIRED"
  | "REVOKED";

export interface ProjectInvitation {
  id: number;
  code: string;
  email: string;
  project: number;
  project_name: string;
  allowed_role: "EXECUTIVE" | "PROJECT_STAFF";
  allowed_role_display: string;
  message: string;
  is_active: boolean;
  expires_at: string;
  max_uses: number;
  used_count: number;
  created_by_email: string;
  created_at: string;
  revoked_at: string | null;
  accepted_at: string | null;
  status: ProjectInvitationStatus;
}

export interface InvitationValidation {
  email: string;
  allowed_role: "EXECUTIVE" | "PROJECT_STAFF";
  allowed_role_display: string;
  project_name: string;
  expires_at: string;
  existing_account: boolean;
}
