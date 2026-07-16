// Single objective accordion item with activities list.
// Handles expand/collapse and displays activities.

import React, { useRef } from "react";
import { Card, CardContent, CardTitle } from "../../../components/common/card";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../../components/common/accordion";
import { Button } from "../../../components/common/button";
import { Edit, Trash2, Plus, ChevronDown } from "lucide-react";
import type { Objective } from "../../../types/objective";
import type { Activity } from "../../../types/activity";
import type { BudgetLineItem } from "../../../types/budgetItem";
import { ActivityCard } from "./ActivityCard";

interface ObjectiveAccordionProps {
  objective: Objective;
  activities: Activity[] | undefined;
  isLoading: boolean;
  onExpand: (objectiveId: number) => void;
  budgetLineItems: BudgetLineItem[];
  onEditObjective?: (objective: Objective) => void;
  onDeleteObjective?: (objective: Objective) => void;
  onAddActivity?: (objective: Objective) => void;
  onEditActivity?: (activity: Activity, objective: Objective) => void;
  onDeleteActivity?: (activity: Activity, objective: Objective) => void;
  onAddExpense?: (activity: Activity, objective: Objective) => void;
  onToggleActivityComplete?: (activity: Activity, objective: Objective, checked: boolean) => void;
  showActions?: boolean;
  hideFinancialValues?: boolean;
}

export const ObjectiveAccordion: React.FC<ObjectiveAccordionProps> = ({
  objective,
  activities,
  isLoading,
  onExpand,
  budgetLineItems,
  onEditObjective,
  onDeleteObjective,
  onAddActivity,
  onEditActivity,
  onDeleteActivity,
  onAddExpense,
  onToggleActivityComplete,
  showActions,
  hideFinancialValues = false,
}) => {
  const rawActivities = activities;
  const hasData = (rawActivities?.length ?? 0) > 0;
  const isFilterEmpty = hasData && activities?.length === 0;
  const accordionTriggerRef = useRef<HTMLButtonElement>(null);

  const handleChevronClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Trigger the accordion toggle by clicking the AccordionTrigger
    if (accordionTriggerRef.current) {
      accordionTriggerRef.current.click();
    }
    // Also call onExpand to fetch activities if needed
    onExpand(objective.id);
  };

  return (
    <AccordionItem
      key={objective.id}
      value={`objective-${objective.id}`}
      className="border rounded-lg group"
    >
      <Card>
        {/* Header / Trigger */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full px-4 sm:px-6 py-4">
          <div className="flex-1 min-w-0 max-w-full">
            <AccordionTrigger
              ref={accordionTriggerRef}
              onClick={() => onExpand(objective.id)}
              className="hover:no-underline py-0 [&>svg]:hidden w-full min-w-0 text-left"
            >
              <div className="mr-4 min-w-0 max-w-full flex-1">
                <CardTitle
                  className="text-lg mb-1 wrap-break-word"
                  title={objective.title}
                >
                  {objective.title}
                </CardTitle>
                <p className="text-sm text-muted-foreground wrap-break-word">
                  {objective.description || "No description provided."}
                </p>
              </div>
            </AccordionTrigger>
          </div>

          {/* Action Buttons and Chevron - Outside of AccordionTrigger to avoid nested buttons */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
            {showActions && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditObjective?.(objective);
                  }}
                  className="h-8 w-8 p-0"
                >
                  <Edit className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteObjective?.(objective);
                  }}
                  className="h-8 w-8 p-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddActivity?.(objective);
                  }}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Activity
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleChevronClick}
              className="h-8 w-8 p-0 hover:bg-transparent hover:text-foreground"
            >
              <ChevronDown className="h-4 w-4 transform transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </Button>
          </div>
        </div>

        {/* Content Body */}
        <AccordionContent>
          <CardContent className="pt-0 border-t bg-slate-50/50 p-6">
            {/* Loading State */}
            {isLoading && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Loading activities...
              </div>
            )}

            {/* Empty State (No Data from API) */}
            {!isLoading && !hasData && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No activities added yet.
              </div>
            )}

            {/* Filtered Empty State (Data exists, but search hides it) */}
            {!isLoading && isFilterEmpty && (
              <div className="py-6 text-center text-sm text-muted-foreground bg-white rounded border border-dashed">
                No activities match your filters.
              </div>
            )}

            {/* Filtered Activities List */}
            {!isLoading && hasData && activities && (
              <div className="space-y-3">
                {activities.map((activity) => {
                  const budgetItem =
                    budgetLineItems.find(
                      (item) => item.id === activity.activity_budget_item
                    ) || null;
                  const budgetName =
                    budgetItem?.name || activity.budget_item_name || null;

                  return (
                    <ActivityCard
                      key={activity.id}
                      activity={activity}
                      objective={objective}
                      budgetName={budgetName || "General"}
                      onEdit={onEditActivity}
                      onDelete={onDeleteActivity}
                      onAddExpense={onAddExpense}
                      onToggleComplete={onToggleActivityComplete}
                      showActions={showActions}
                      hideFinancialValues={hideFinancialValues}
                    />
                  );
                })}
              </div>
            )}
          </CardContent>
        </AccordionContent>
      </Card>
    </AccordionItem>
  );
};
