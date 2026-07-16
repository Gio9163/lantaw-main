import type { Activity } from "../../../types/activity";
import type { BudgetItem } from "./pieChartHelper";
import type { DetailItem } from "./pieChartHelper";
import type { ExpenseComparisonItem, ProjectSummary } from "../utils/barChartHelper";
import type { BudgetBreakdownGroup } from "./pieChartHelper";

// --- ACTUAL EXPENSE LOGIC ---
// Calculate actual total expense for all activities
export const getActivitiesActualExpenseTotal = (
    activities: Activity[]
): number => {
    let grandTotal: number = 0;
    for (const activity of activities) {
        if (activity.actual_expense) {
            const parsedExpense = parseFloat(activity.actual_expense);
            if (!isNaN(parsedExpense)) {
                grandTotal += parsedExpense
            }
        }
        
    }
    return grandTotal;
}

// Calculates the total actual expense spent for each budget item (MOOE, CO, PS)
export const getActualExpenseSummaryByBudgetItem = (
  activities: Activity[]
): BudgetItem[] => {

  const budgetTotals: Record<string, number> = {};
  let grandTotal = 0;

  for (const activity of activities) {
    // Get the budget item name
    const itemName = activity.budget_item_name || "General";

    // Parse the actual expense
    let actualExpense = 0;
    if (activity.actual_expense) {
      const parsedExpense = parseFloat(activity.actual_expense);
      if (!isNaN(parsedExpense)) {
        actualExpense = parsedExpense;
      }
    }

    // Add to grand total
    grandTotal += actualExpense;

    // Aggregate the expense under the budget item name.
    if (budgetTotals[itemName]) {
      budgetTotals[itemName] += actualExpense;
    } else {
      budgetTotals[itemName] = actualExpense;
    }
  }

  // Handle case where grandTotal is 0 to avoid division by 0
  if (grandTotal === 0) {
    return Object.entries(budgetTotals).map(([name, value]) => ({
      name,
      value, 
      percentage: 0
    }));
  }

  // Convert totals object into budgetItem array
  const budgetItems: BudgetItem[] = [];
  
  const budgetNameMap: Record<string, string> = {
    CO: 'Capital Outlay',
    MOOE: 'MOOE',
    PS: 'Personnel Services',
  };

  for (const shortName in budgetTotals) {
    if (Object.prototype.hasOwnProperty.call(budgetTotals, shortName)) {

      const value = budgetTotals[shortName];
      const percentage = (value / grandTotal) * 100;
      const friendlyName = budgetNameMap[shortName] || shortName;

      budgetItems.push({
        name: friendlyName,
        value: value,
        percentage: Number(percentage.toFixed(2)),
      });
    }
  }

  return budgetItems;
};

// Return a list of detailed items in relation to the activities belonging to a budget item
export const getBudgetItemExpenseBreakdown = (
  activities: Activity[],
  actualGrandTotal: number
): DetailItem[] => {

  const detailItems: DetailItem[] = [];

  // Handle division by zero case early
  const divisor = actualGrandTotal === 0 ? 1 : actualGrandTotal;

  for (const activity of activities) {
    const name = activity.title;

    let amount = 0; 
    
    const rawExpense = activity.actual_expense;

    // Check if it is NOT null
    if (rawExpense !== null) {
      const parsedAmount = parseFloat(rawExpense);
      
      // Check if the parsing resulted in a valid number
      if (!isNaN(parsedAmount)) {
          amount = parsedAmount;
      }
    }
    // If the rawExpense was null or NaN, 'amount' remains 0.

    // Calculate the percentage
    const percentage = (amount / divisor) * 100;

    detailItems.push({
      name: name,
      amount: amount,
      percentage: Number(percentage.toFixed(2)),
    });
  }

  return detailItems;
};

// --- PROJECTED EXPENSE ---
// Calculate total projected expense
export const getActivitiesProjectedExpenseTotal = (
    activities: Activity[]
): number => {
    let grandTotal: number = 0;
    for (const activity of activities) {
        if (activity.projected_expense) {
            const parsedExpense = parseFloat(activity.projected_expense);
            if (!isNaN(parsedExpense)) {
                grandTotal += parsedExpense
            }
        }
        
    }
    return grandTotal;
}

export const getProjectedExpenseSummaryByBudgetItem = (
  activities: Activity[]
): BudgetItem[] => {

  const projectedTotals: Record<string, number> = {};
  let grandTotal = 0; // Correctly initialized outside the loop

  for (const activity of activities) {
    // Get the budget item name
    const itemNameKey = activity.budget_item_name?.toUpperCase() || "MISC";

    // Parse the projected expense safely
    let projectedExpense = 0;
    if (activity.projected_expense) {
      const parsedExpense = +activity.projected_expense;
      if (!isNaN(parsedExpense)) {
        projectedExpense = parsedExpense;
      }
    }

    // Accumulate grand total and category total
    grandTotal += projectedExpense;

    projectedTotals[itemNameKey] = 
      (projectedTotals[itemNameKey] || 0) + projectedExpense;
  }

  // Define the map for conversion (short name -> friendly name)
  const budgetNameMap: Record<string, string> = {
    CO: 'Capital Outlay',
    MOOE: 'MOOE',
    PS: 'Personnel Services',
    GENERAL: 'General', // Added fallback
  };

  // Handle division by zero and convert totals object into BudgetItem array
  return Object.entries(projectedTotals).map(([key, value]) => {
    
    // Calculate percentage (Handle grandTotal === 0 case here)
    const percentage = grandTotal === 0 ? 0 : (value / grandTotal) * 100;

    // Get the friendly name
    const friendlyName = budgetNameMap[key] || key;

    return {
      name: friendlyName,
      value: value,
      percentage: Number(percentage.toFixed(2)),
    }; 
  });
};

// Groups a flat array of activities (DetailItem[]) into an object keyed by the main budget category (PS, MOOE, CO)
export const groupActivitiesByBudgetItem = (
  activities: Activity[] 
): BudgetBreakdownGroup => {
  
  const groupedData: BudgetBreakdownGroup = {};
  
  for (const activity of activities) {
    const categoryKey = activity.budget_item_name || "General";
    
    // Perform the expense calculation for the current activity
    let amount = 0;
    if (activity.actual_expense !== null) {
      const parsedAmount = parseFloat(activity.actual_expense);
      if (!isNaN(parsedAmount)) {
        amount = parsedAmount;
      }
    }
    
    const detailItem: DetailItem = {
      name: activity.title,
      amount: amount,
      percentage: 0,
    };

    // Group the item
    if (!groupedData[categoryKey]) {
      groupedData[categoryKey] = [];
    }
    groupedData[categoryKey].push(detailItem);
  }

  // Calculate the percentage of each activity within its group
  for (const categoryKey in groupedData) {
      const categoryActivities = groupedData[categoryKey];
      
      // Calculate the total actual expense for this specific category
      const categoryTotal = categoryActivities.reduce((sum, item) => sum + item.amount, 0);
      
      // Update each activity's percentage relative to the category total
      const divisor = categoryTotal === 0 ? 1 : categoryTotal;
      
      groupedData[categoryKey] = categoryActivities.map(item => ({
          ...item,
          percentage: Number(((item.amount / divisor) * 100).toFixed(2)),
      }));
  }

  return groupedData;
};

// Transforms two budget item arrays (actual and projected) into an array of ExpenseComparisonItem, comparing the 'actual' and 'projected' values by category.
export const createExpenseComparison = (
  actualBudget: BudgetItem[],
  projectedBudget: BudgetItem[]
): ExpenseComparisonItem[] => {

  // Create map for the projected values for quick lookup by category name.
  const projectedMap = new Map<string, number>();
  for (const item of projectedBudget) {
    projectedMap.set(item.name, item.value);
  }

  // Process the actual budget array to build the final comparison list.
  return actualBudget.map((actualItem) => {
    const categoryName = actualItem.name;

    // Get the corresponding projected value, defaulting to 0 if not found
    const projectedValue = projectedMap.get(categoryName) ?? 0;

    return {
      category: categoryName,
      projected: projectedValue,
      actual: actualItem.value,
    } as ExpenseComparisonItem;
  });
}

// Generate overall expense (actual and projected) summary 

export const getOverallSummary = (
  totalGrant: number,
  totalSpent: number,
  projectedExpenses: number,
) : ProjectSummary => {
  return {
    totalGrant: totalGrant,
    projectedExpenses: projectedExpenses, 
    totalSpent: totalSpent,
  } as ProjectSummary;
}


