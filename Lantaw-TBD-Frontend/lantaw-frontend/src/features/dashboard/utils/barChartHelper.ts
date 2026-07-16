export interface ExpenseComparisonItem {
  category: string;
  projected: number;
  actual: number;
}

export interface ProjectSummary {
  totalGrant: number;
  projectedExpenses: number;
  totalSpent: number;
}

export interface BudgetStatus {
  text: string;
  color: string;
}

export type BudgetExpenseSummaryGroup = Record<string, ExpenseComparisonItem[]>

export const getBudgetStatus = (
  projected: number,
  actual: number,
  hideForExecutive: boolean = false
) => {
    const variance = actual - projected;
    if (variance === 0) {
      return { text: "On Budget", color: "text-gray-600" };
    } else if (variance > 0) {
      return { 
        text: hideForExecutive 
          ? "Over Budget" 
          : `Over Budget of ₱${variance.toLocaleString()}`, 
        color: "text-red-600" 
      };
    } else {
      return { 
        text: hideForExecutive
          ? "Under Budget"
          : `Under Budget of ₱${Math.abs(variance).toLocaleString()}`, 
        color: "text-green-600" 
      };
    }
  };
