export interface ActivityExpenseItem {
  activityName: string;
  objectiveName: string;
  activityStatus: string;
  budgetStatus: string;
  projected: number;
  actual: number;
  balance: number;
}

export interface ExpenseGroupTotal {
  name: string;
  projected: number;
  actual: number;
  balance: number;
}

export interface FinancialSummary {
  totalProjected: number;
  totalActual: number;
  totalBalance: number;
  utilizationPercentage: number;
  underBudgetCount: number;
  onBudgetCount: number;
  overBudgetCount: number;
  byObjective: ExpenseGroupTotal[];
  byActivityStatus: ExpenseGroupTotal[];
}

export type BudgetCategoryFilter = "ALL" | "PS" | "MOOE" | "CO";

export type ChartViewType = "COLUMN" | "BAR";

export interface AnalyticsFilters {
  category: BudgetCategoryFilter;
  startDate: string | null;
  endDate: string | null;
}
