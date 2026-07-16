import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../../../components/common/dialog";
import { Button } from "../../../../components/common/button";
import { Label } from "../../../../components/common/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../components/common/select";
import { Input } from "../../../../components/common/input";
import type { Compensation } from "../../../../types/compensation";
import type { Personnel } from "../../../../types/personnel";

interface EditCompensationModalProps {
  isOpen: boolean;
  onClose: () => void;

  // Data props
  compensation: Compensation | null; // null = create, existing = edit
  personnel: Personnel;
  defaultBudgetItemId: number | null;
  defaultType?: "SALARY" | "HONORARIA" | null; // Default type when creating new compensation

  // Actions
  onSubmit: (data: {
    type: Compensation["type"];
    budget_item: number;
    personnel: number;
    reason: string | null;
    amount: number;
    date_effective: string;
  }) => Promise<void>;
}

export const EditCompensationModal: React.FC<EditCompensationModalProps> = ({
  isOpen,
  onClose,
  compensation,
  personnel,
  defaultBudgetItemId,
  defaultType = null,
  onSubmit,
}) => {
  const [formData, setFormData] = useState({
    type: "SALARY" as Compensation["type"],
    budget_item: null as number | null,
    personnel: personnel?.id,
    reason: "",
    amount: "",
    date_effective: new Date().toISOString().split("T")[0], // Default to today
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      if (compensation) {
        setFormData({
          type: compensation.type,
          budget_item: compensation.budget_item,
          personnel: compensation.personnel,
          reason: compensation.reason || "",
          amount: compensation.amount ? compensation.amount.toString() : "",
          date_effective: compensation.date_effective || "",
        });
      } else {
        setFormData({
          type: defaultType || "HONORARIA",
          budget_item: defaultBudgetItemId,
          personnel: personnel?.id, // Auto-assign to the current personnel
          reason: "",
          amount: "",
          date_effective: new Date().toISOString().split("T")[0],
        });
      }
      // Clear error when modal opens
      setError(null);
    }
  }, [isOpen, compensation, personnel, defaultBudgetItemId, defaultType]);

  const handleSubmit = async () => {
    setError(null);
    
    // Basic Validation
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError("Please enter a valid amount greater than 0");
      return;
    }
    
    if (!formData.budget_item) {
      setError("Budget item is required. Please ensure the budget is loaded.");
      return;
    }
    
    if (!formData.personnel) {
      setError("Personnel is required");
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        type: formData.type,
        budget_item: formData.budget_item!,
        personnel: formData.personnel!,
        reason: formData.reason || null,
        amount: parseFloat(formData.amount), // Convert back to number
        date_effective: formData.date_effective,
      });
      setError(null);
      onClose();
    } catch (error: any) {
      console.error("Failed to save compensation item:", error);
      console.error("Error details:", error?.response?.data);
      
      // Extract error message from response
      let errorMessage = "Failed to save compensation. Please try again.";
      if (error?.response?.data) {
        const errorData = error.response.data;
        if (errorData.non_field_errors && Array.isArray(errorData.non_field_errors)) {
          // Handle unique constraint error
          if (errorData.non_field_errors[0]?.includes("unique")) {
            errorMessage = `A ${formData.type === 'SALARY' ? 'Salary' : 'Honoraria'} compensation already exists for this personnel. Please edit the existing compensation instead.`;
          } else {
            errorMessage = errorData.non_field_errors[0];
          }
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (typeof errorData === 'string') {
          errorMessage = errorData;
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      // Don't close modal on error - let user see the error and try again
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {compensation ? "Edit Compensation" : "Add Compensation"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-800">
              {error}
            </div>
          )}
          
          {/* Type Selection */}
          <div>
            <Label htmlFor="item-type" className="mb-2">
              Type
            </Label>
            <Select
              value={formData.type}
              onValueChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  type: value as Compensation["type"],
                }))
              }
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SALARY">Salary</SelectItem>
                <SelectItem value="HONORARIA">Honoraria</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reason Input */}
          <div>
            <Label htmlFor="item-reason" className="mb-2">
              Reason
            </Label>
            <Input
              id="item-reason"
              value={formData.reason}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  reason: e.target.value, // FIXED: was 'description'
                }))
              }
              placeholder="Enter reason (optional)..."
              disabled={isSubmitting}
            />
          </div>

          {/* Amount Input */}
          <div>
            <Label htmlFor="item-amount" className="mb-2">
              Amount (₱)
            </Label>
            <Input
              id="item-amount"
              type="number"
              value={formData.amount}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  amount: e.target.value,
                }))
              }
              placeholder="0.00"
              disabled={isSubmitting}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose} // FIXED: was isOpen(false)
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting
              ? "Saving..."
              : compensation
              ? "Update Item"
              : "Create Item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
