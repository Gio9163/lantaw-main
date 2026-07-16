// Modal for adding expense entries to an activity.

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
import { TextArea } from "../../../../components/common/textarea";
import type { Activity } from "../../../../types/activity";

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  activity: Activity | null;
  onSubmit: (amount: number, description: string) => Promise<void>;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose,
  activity,
  onSubmit,
}) => {
  const [additionalExpense, setAdditionalExpense] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setAdditionalExpense("");
      setDescription("");
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    const amount = Number(additionalExpense);
    if (!amount || amount <= 0) return;
    if (!description.trim()) return; // Description is required

    setIsSubmitting(true);
    try {
      await onSubmit(amount, description.trim());
      onClose();
    } catch (error) {
      console.error("Failed to add expense:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentExpense = Number(activity?.actual_expense || 0);
  const newTotal = currentExpense + Number(additionalExpense || 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Expense Entry</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="additional-expense" className="mb-2">
              Additional Expense (₱)
            </Label>
            <Input
              id="additional-expense"
              type="number"
              min="0"
              step="0.01"
              value={additionalExpense}
              onChange={(e) => setAdditionalExpense(e.target.value)}
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground mt-1">
              This amount will be added to the current actual expense.
            </p>
          </div>
          <div>
            <Label htmlFor="description" className="mb-2">
              Description <span className="text-destructive">*</span>
            </Label>
            <TextArea
              id="description"
              placeholder="Describe this expense entry..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1">
              This description will be recorded in the History Log.
            </p>
          </div>
          {activity && additionalExpense && Number(additionalExpense) > 0 && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">
                New Total Actual Expense
              </p>
              <p className="font-medium">₱{newTotal.toLocaleString()}</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              !additionalExpense ||
              Number(additionalExpense) <= 0 ||
              !description.trim()
            }
          >
            {isSubmitting ? "Adding..." : "Confirm Expense"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
