export interface Project {
  id: number;
  name: string;
  project_leader?: string;
  description?: string;
  grant_amount: number;
  project_status: "ACTIVE" | "COMPLETED" | "ONHOLD";
  date_start: string;
  date_end: string;
  budget_items?: ProjectBudgetItem[];
}

export interface ProjectBudgetItem {
  id?: number;
  category: "PS" | "MOOE" | "CO";
  description: string;
  amount: number | string;
}
