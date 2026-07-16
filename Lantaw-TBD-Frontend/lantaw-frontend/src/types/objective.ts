import type { Activity } from "./activity";
export interface Objective {
  id: number;
  project: number;
  title: string;
  description: string;
  activities: Activity[];
  objective_status?: "COMPLETED" | "IN_PROGRESS" | "NOT_STARTED";
}
