// Displays a single activity with all its details.
// Handles edit, delete, and add expense actions.

import React from "react";
import { Button } from "../../../components/common/button";
import { Badge } from "../../../components/common/badge";
import { Label } from "../../../components/common/label";
import { Edit, Trash2, Plus, Calendar } from "lucide-react";
import type { Activity } from "../../../types/activity";
import type { Objective } from "../../../types/objective";
import { ExpenseBar } from "./ExpenseBar";
import {
  getActivityStatusColor,
  getBudgetBadgeColor,
} from "../utils/statusHelpers";
import {
  getBudgetStatus,
  formatCurrency,
} from "../utils/budgetHelpers";

interface ActivityCardProps {
  activity: Activity;
  objective: Objective;
  budgetName: string;
  onEdit?: (activity: Activity, objective: Objective) => void;
  onDelete?: (activity: Activity, objective: Objective) => void;
  onAddExpense?: (activity: Activity, objective: Objective) => void;
  onToggleComplete?: (activity: Activity, objective: Objective, checked: boolean) => void;
  showActions?: boolean;
  hideFinancialValues?: boolean;
}

export const ActivityCard: React.FC<ActivityCardProps> = ({
  activity,
  objective,
  budgetName,
  onEdit,
  onDelete,
  onAddExpense,
  onToggleComplete,
  showActions,
  hideFinancialValues = false,
}) => {
  const activityStyles = getActivityStatusColor(activity.activity_status);
  const projected = Number(activity.projected_expense || 0);
  const actual = Number(activity.actual_expense || 0);
  const balance = Number(activity.balance || 0);
  const budgetStatus = getBudgetStatus(activity.budget_status);

  return (
    <div className="border rounded-lg bg-background overflow-hidden shadow-sm">
      <div className="flex">
        {/* Color Bar */}
        <div className={`w-2 ${activityStyles.bg} shrink-0`}></div>

        <div className="flex-1 p-4">
          <div className="space-y-3">
            {/* Activity Header */}
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  {onToggleComplete && (
                    <input
                      type="checkbox"
                      checked={activity.activity_status === "COMPLETED"}
                      onChange={(event) => {
                        event.stopPropagation();
                        onToggleComplete(activity, objective, event.target.checked);
                      }}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  )}
                  <div
                    className={`px-2 py-1 rounded text-xs font-medium border shrink-0 ${activityStyles.badge}`}
                  >
                    {activity.activity_status}
                  </div>
                  <h4
                    className="font-medium line-clamp-2 min-w-0 wrap-break-word"
                    title={activity.title}
                  >
                    {activity.title}
                  </h4>
                  <Badge
                    variant="outline"
                    className={`text-xs ${getBudgetBadgeColor(
                      budgetName || null
                    )}`}
                  >
                    {budgetName || "General"}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Added:{" "}
                    {new Date(activity.date_created).toLocaleDateString()}
                  </span>
                </div>
              </div>
              {showActions && (
                <div className="flex flex-wrap gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit?.(activity, objective);
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete?.(activity, objective);
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Add Expense Entry"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddExpense?.(activity, objective);
                    }}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>

            {/* Expense Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border-t pt-3 mt-2">
              <div>
                <Label className="text-xs text-muted-foreground">
                  Projected
                </Label>
                <p className="text-sm font-medium">
                  {formatCurrency(projected, hideFinancialValues)}
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Actual</Label>
                <p className="text-sm font-medium">
                  {formatCurrency(actual, hideFinancialValues)}
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Balance</Label>
                <p
                  className={`text-sm font-medium ${
                    balance < 0 ? "text-red-600" : "text-gray-600"
                  }`}
                >
                  {formatCurrency(balance, hideFinancialValues)}
                </p>
              </div>
              {/* Budget Status Bar */}
              <div className="flex flex-col justify-center">
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs text-muted-foreground">
                    Budget Status
                  </Label>
                  <span
                    className={`text-[10px] uppercase font-bold ${budgetStatus.color}`}
                  >
                    {budgetStatus.text}
                  </span>
                </div>
                <ExpenseBar projected={projected} actual={actual} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
