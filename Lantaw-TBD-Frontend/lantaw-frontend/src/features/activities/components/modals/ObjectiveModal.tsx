// Modal for creating or editing objectives.

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "../../../../components/common/dialog";
import { Button } from "../../../../components/common/button";
import { Input } from "../../../../components/common/input";
import { Label } from "../../../../components/common/label";
import { TextArea } from "../../../../components/common/textarea";
import type { Objective } from "../../../../types/objective";

interface ObjectiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  objective: Objective | null; // null = create mode, defined = edit mode
  onSubmit: (data: { title: string; description: string }) => Promise<void>;
}

export const ObjectiveModal: React.FC<ObjectiveModalProps> = ({
  isOpen,
  onClose,
  objective,
  onSubmit,
}) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens/closes or objective changes
  useEffect(() => {
    if (isOpen) {
      if (objective) {
        setFormData({
          title: objective.title,
          description: objective.description,
        });
      } else {
        setFormData({ title: "", description: "" });
      }
      setError(null);
    }
  }, [isOpen, objective]);

  const handleSubmit = async () => {
    if (!formData.title.trim()) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error: any) {
      console.error("Failed to save objective:", error);
      setError(error?.message || "Failed to save objective. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {objective ? "Edit Objective" : "Add New Objective"}
          </DialogTitle>
          <DialogDescription>
            {objective
              ? "Modify the details of your objective below."
              : "Fill in the details to add a new objective to this project."}
          </DialogDescription>
        </DialogHeader>
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
        <div className="space-y-4">
          <div>
            <Label htmlFor="objective-title" className="mb-2">
              Objective Title
            </Label>
            <Input
              id="objective-title"
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="Enter objective title..."
            />
          </div>
          <div>
            <Label htmlFor="objective-description" className="mb-2">
              Description
            </Label>
            <TextArea
              id="objective-description"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Enter objective description..."
              className="min-h-24"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !formData.title.trim()}
          >
            {objective ? "Update" : "Create"} Objective
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
