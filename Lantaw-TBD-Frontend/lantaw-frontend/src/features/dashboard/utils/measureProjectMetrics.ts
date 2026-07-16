import type { Activity } from "../../../types/activity";
import type { Objective } from "../../../types/objective";
import { 
  getActivitiesActualExpenseTotal, 
  getActualExpenseSummaryByBudgetItem, 
  getProjectedExpenseSummaryByBudgetItem, 
  getActivitiesProjectedExpenseTotal,
  groupActivitiesByBudgetItem, 
  createExpenseComparison,
  getOverallSummary,
} from "./budgetMetrics";

export const getProjectMetrics = (
  objectives: Objective[],
  totalGrant: number,
) => {
  // Flattens all activities from all objectives into a single array
  const allActivities: Activity[] = objectives.flatMap(
    (objective) => objective.activities || [] 
  );

  // --- Activity Metrics ---
  
  // Calculate completed activities
  const completedActivities = allActivities.filter(
    (act) => act.activity_status === "COMPLETED" 
  ).length;

  const totalActivities = allActivities.length; // Uses the flattened array

  // Calcuate the total ACTUAL amount spent per budget item for all activities
  const actualBudgetItemTotal = getActualExpenseSummaryByBudgetItem(allActivities); 
  const actualTotalExpense = getActivitiesActualExpenseTotal(allActivities);
  const activityDetailedItems = groupActivitiesByBudgetItem(allActivities)

  // Calcuate the total PROJECTED amount spent per budget item for all activities
  const projectedBudgetItemTotal = getProjectedExpenseSummaryByBudgetItem(allActivities);
  const projectedTotalExpense = getActivitiesProjectedExpenseTotal(allActivities);

  // Get the expense comparison between actual and projected 
  const expenseComparisonPerBudgetItem = createExpenseComparison(actualBudgetItemTotal, projectedBudgetItemTotal)

  // Get overall expense summary
  const expenseSummary = getOverallSummary(totalGrant, actualTotalExpense, projectedTotalExpense)

  // --- Objective Metrics ---
  
  // Calculate completed objectives
  const completedObjectives = objectives.filter((objective) => {
    // 2. Use the 'activities' array *inside* the current objective object
    const objectiveActivities = objective.activities;

    // If an objective has no activities, it is not considered DONE
    if (!objectiveActivities || objectiveActivities.length === 0) {
      return false;
    }

    // Check if ALL activities for this objective are COMPLETED
    const allActivitiesCompleted = objectiveActivities.every(
      (act) => act.activity_status === "COMPLETED"
    );

    return allActivitiesCompleted;
  }).length;
  
  // --- Budget Metrics ---
  
  // Calculate budget metrics
  const budgetUtilized = (actualTotalExpense / totalGrant) * 100;
  const remainingBudget = ((totalGrant - actualTotalExpense) / totalGrant) * 100;

  // --- Variance Metrics ---
  
  // Calculate variance metrics
  const variance = actualTotalExpense - projectedTotalExpense;
  
  // Prevent division by zero if projectedTotalExpense is 0
  const variancePercentage =
    projectedTotalExpense !== 0 ? (variance / projectedTotalExpense) * 100 : 0;

  return {
    completedObjectives,
    totalObjectives: objectives.length,
    completedActivities,
    totalActivities,
    budgetUtilized,
    remainingBudget,
    variance,
    variancePercentage,
    actualBudgetItemTotal,
    projectedBudgetItemTotal,
    activityDetailedItems,
    expenseComparisonPerBudgetItem,
    expenseSummary,
  };
};