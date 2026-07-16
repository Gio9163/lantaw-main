// These functions handle budget calculations and status determinations.

export interface BudgetStatus {
  text: string;
  color: string;
}

export const getBudgetStatus = (
  status: string | null | undefined
): BudgetStatus => {
  switch (status) {
    case "ON_TRACK":
      return { text: "On Track", color: "text-teal-700" };
    case "UNDER_BUDGET":
      return { text: "Under Budget", color: "text-green-700" };
    case "ON_BUDGET":
      return { text: "On Budget", color: "text-blue-700" };
    case "OVER_BUDGET":
      return { text: "Over Budget", color: "text-red-700" };
    case "UNALLOCATED":
      return { text: "Unallocated", color: "text-amber-700" };
    default:
      return { text: "Not Started", color: "text-gray-600" };
  }
};

// Check if activity is over budget
export const isOverBudget = (projected: number, actual: number): boolean => {
  return actual > projected;
};

// Format currency amount
// If hideForExecutive is true, returns "---" instead of the formatted amount.
export const formatCurrency = (
  amount: number | string | null,
  hideForExecutive: boolean = false
): string => {
  if (hideForExecutive) {
    return "---";
  }
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount || 0;
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(numAmount) ? numAmount : 0);
};
