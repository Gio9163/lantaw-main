export interface Activity {
  id: number;
  objective: number;
  title: string;
  activity_status: "ACTIVE" | "PENDING" | "COMPLETED";
  budget_item_name: string | null;
  activity_budget_item: number | null; // ID of the budget item (for API requests)
  date_created: string;
  date_modified: string;
  projected_expense: string | null;
  actual_expense: string | null;
  balance: string;
  budget_status:
    | "NOT_STARTED"
    | "ON_TRACK"
    | "UNDER_BUDGET"
    | "ON_BUDGET"
    | "OVER_BUDGET"
    | "UNALLOCATED";
}
