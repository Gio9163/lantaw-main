export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: "Admin" | "Project Staff" | "Executive";
  account_status: "ACTIVE" | "DEACTIVATED" | "SUSPENDED";
  date_joined: string;
  last_login: string | null;
  projects: number[]; 
}