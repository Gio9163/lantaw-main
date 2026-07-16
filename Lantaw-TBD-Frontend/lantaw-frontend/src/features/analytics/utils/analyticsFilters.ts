import type { Activity } from "../../../types/activity";
import type {
  ActivityExpenseItem,
  BudgetCategoryFilter,
  ExpenseGroupTotal,
  FinancialSummary,
} from "../types/analytics";

const parseAmount = (value: string | null | undefined): number => {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
};

/**
 * Filter activities by budget category
 */
export const filterActivitiesByCategory = (
  activities: Activity[],
  category: BudgetCategoryFilter
): Activity[] => {
  if (category === "ALL") {
    return activities;
  }

  return activities.filter((activity) => {
    const activityCategory = activity.budget_item_name?.toUpperCase();
    return activityCategory === category;
  });
};

/**
 * Filter activities by date range
 * Uses date_created field for filtering
 */
export const filterActivitiesByDateRange = (
  activities: Activity[],
  startDate: string | null,
  endDate: string | null
): Activity[] => {
  if (!startDate && !endDate) {
    return activities;
  }

  return activities.filter((activity) => {
    const activityDate = new Date(activity.date_created);
    activityDate.setHours(0, 0, 0, 0); // Normalize to start of day

    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      if (activityDate < start) {
        return false;
      }
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // Include entire end date
      if (activityDate > end) {
        return false;
      }
    }

    return true;
  });
};

/**
 * Transform activities into chart data format
 */
export const getActivityExpenseData = (
  activities: Activity[],
  objectiveNames: Map<number, string>
): ActivityExpenseItem[] => {
  return activities.map((activity) => {
    const projected = parseAmount(activity.projected_expense);
    const actual = parseAmount(activity.actual_expense);
    const balance = parseAmount(activity.balance);

    return {
      activityName: activity.title,
      objectiveName: objectiveNames.get(activity.objective) || "Unassigned Objective",
      activityStatus: activity.activity_status,
      budgetStatus: activity.budget_status,
      projected,
      actual,
      balance,
    };
  });
};

const groupExpenseTotals = (
  data: ActivityExpenseItem[],
  getName: (item: ActivityExpenseItem) => string
): ExpenseGroupTotal[] => {
  const totals = new Map<string, ExpenseGroupTotal>();

  data.forEach((item) => {
    const name = getName(item);
    const current = totals.get(name) || {
      name,
      projected: 0,
      actual: 0,
      balance: 0,
    };
    current.projected += item.projected;
    current.actual += item.actual;
    current.balance += item.balance;
    totals.set(name, current);
  });

  return Array.from(totals.values());
};

export const getFinancialSummary = (
  data: ActivityExpenseItem[]
): FinancialSummary => {
  const totalProjected = data.reduce((sum, item) => sum + item.projected, 0);
  const totalActual = data.reduce((sum, item) => sum + item.actual, 0);
  const totalBalance = totalProjected - totalActual;

  return {
    totalProjected,
    totalActual,
    totalBalance,
    utilizationPercentage:
      totalProjected > 0 ? (totalActual / totalProjected) * 100 : 0,
    underBudgetCount: data.filter(
      (item) => item.budgetStatus === "UNDER_BUDGET"
    ).length,
    onBudgetCount: data.filter((item) => item.budgetStatus === "ON_BUDGET")
      .length,
    overBudgetCount: data.filter(
      (item) => item.budgetStatus === "OVER_BUDGET"
    ).length,
    byObjective: groupExpenseTotals(data, (item) => item.objectiveName),
    byActivityStatus: groupExpenseTotals(data, (item) => item.activityStatus),
  };
};
