// Modal for creating or editing activities.

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../../../components/common/dialog";
import { Button } from "../../../../components/common/button";
import { Input } from "../../../../components/common/input";
import { Label } from "../../../../components/common/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../components/common/select";
import type { Activity } from "../../../../types/activity";
import type { BudgetLineItem } from "../../../../types/budgetItem";
import { getBudgetStatus } from "../../utils/budgetHelpers";

interface ActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  activity: Activity | null; // null = create mode, defined = edit mode
  budgetLineItems: BudgetLineItem[];
  onSubmit: (data: {
    title: string;
    activity_status: Activity["activity_status"];
    projected_expense: string | null;
    actual_expense: string | null;
    activity_budget_item: number | null;
  }) => Promise<void>;
}

export const ActivityModal: React.FC<ActivityModalProps> = ({
  isOpen,
  onClose,
  activity,
  budgetLineItems,
  onSubmit,
}) => {
  const [formData, setFormData] = useState({
    title: "",
    activity_status: "PENDING" as Activity["activity_status"],
    projected_expense: "",
    actual_expense: "",
    activity_budget_item: null as number | null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens/closes or activity changes
  useEffect(() => {
    if (isOpen) {
      if (activity) {
        setFormData({
          title: activity.title,
          activity_status: activity.activity_status,
          projected_expense: activity.projected_expense || "",
          actual_expense: activity.actual_expense || "",
          activity_budget_item: activity.activity_budget_item,
        });
      } else {
        setFormData({
          title: "",
          activity_status: "PENDING",
          projected_expense: "",
          actual_expense: "",
          activity_budget_item: null,
        });
      }
      setError(null);
    }
  }, [isOpen, activity]);

  const handleSubmit = async () => {
    if (!formData.title.trim()) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        title: formData.title,
        activity_status: formData.activity_status,
        projected_expense: formData.projected_expense || null,
        actual_expense: formData.actual_expense || null,
        activity_budget_item: formData.activity_budget_item,
      });
      onClose();
    } catch (error: unknown) {
      console.error("Failed to save activity:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to save activity. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const projected = Number(formData.projected_expense || 0);
  const actual = Number(formData.actual_expense || 0);
  const previewBudgetStatus: Activity["budget_status"] =
    projected <= 0
      ? "UNALLOCATED"
      : actual > projected
        ? "OVER_BUDGET"
        : actual === projected
          ? "ON_BUDGET"
          : formData.activity_status === "COMPLETED"
            ? "UNDER_BUDGET"
            : formData.activity_status === "PENDING" && actual === 0
              ? "NOT_STARTED"
              : "ON_TRACK";
  const budgetStatus = getBudgetStatus(previewBudgetStatus);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {activity ? "Edit Activity" : "Add New Activity"}
          </DialogTitle>
        </DialogHeader>
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
        <div className="space-y-4">
          <div>
            <Label htmlFor="activity-title" className="mb-2">
              Activity Name
            </Label>
            <Input
              id="activity-title"
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="Enter activity name..."
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="budget-item" className="mb-2">
                Category
              </Label>
              <Select
                value={formData.activity_budget_item?.toString() || ""}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    activity_budget_item: value ? Number(value) : null,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {budgetLineItems.map((item) => (
                    <SelectItem key={item.id} value={item.id.toString()}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="activity-status" className="mb-2">
                Status
              </Label>
              <Select
                value={formData.activity_status}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    activity_status: value as Activity["activity_status"],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="projected-expense" className="mb-2">
                Projected Expense (₱)
              </Label>
              <Input
                id="projected-expense"
                type="number"
                value={formData.projected_expense}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    projected_expense: e.target.value,
                  }))
                }
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="actual-expense" className="mb-2">
                Actual Expense (₱)
              </Label>
              <Input
                id="actual-expense"
                type="number"
                value={formData.actual_expense}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    actual_expense: e.target.value,
                  }))
                }
                placeholder="0"
              />
            </div>
          </div>
          {formData.projected_expense && formData.actual_expense && (
            <div className="p-3 bg-muted rounded-lg">
              <Label className="text-xs text-muted-foreground">
                Budget Status
              </Label>
              <p className={`text-sm font-medium ${budgetStatus.color}`}>
                {budgetStatus.text}
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !formData.title.trim()}
          >
            {activity ? "Update" : "Create"} Activity
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
