// Visual representation of projected vs actual expenses.
// Shows a bar chart with color coding for over/under budget.

import React from "react";

interface ExpenseBarProps {
  projected: number;
  actual: number;
}

export const ExpenseBar: React.FC<ExpenseBarProps> = ({
  projected,
  actual,
}) => {
  const maxExpense = Math.max(projected, actual);
  const projectedWidth = maxExpense > 0 ? (projected / maxExpense) * 100 : 0;
  const actualWidth = maxExpense > 0 ? (actual / maxExpense) * 100 : 0;
  const isOverBudget = actual > projected;

  return (
    <div className="relative w-full h-4 bg-muted rounded-full overflow-hidden">
      {/* Base bar (projected) */}
      <div
        className="absolute top-0 left-0 h-full bg-muted-foreground/30 rounded-full"
        style={{ width: `${projectedWidth}%` }}
      />
      {/* Actual expense bar */}
      <div
        className={`absolute top-0 left-0 h-full rounded-full ${
          isOverBudget ? "bg-destructive" : "bg-primary"
        }`}
        style={{ width: `${actualWidth}%` }}
      />
      {/* Overflow indicator if over budget */}
      {isOverBudget && (
        <div
          className="absolute top-0 h-full bg-destructive rounded-r-full opacity-80"
          style={{
            left: `${projectedWidth}%`,
            width: `${actualWidth - projectedWidth}%`,
          }}
        />
      )}
    </div>
  );
};
