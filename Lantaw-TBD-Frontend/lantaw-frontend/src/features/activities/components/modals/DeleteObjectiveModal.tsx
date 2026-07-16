// Confirmation modal for deleting an objective.

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../../../components/common/dialog";
import { Button } from "../../../../components/common/button";

interface DeleteObjectiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  objectiveTitle?: string;
}

export const DeleteObjectiveModal: React.FC<DeleteObjectiveModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  objectiveTitle,
}) => {
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error("Failed to delete objective:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Objective</DialogTitle>
          <DialogDescription>
            This action cannot be undone. All activities under this objective will also be deleted.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {objectiveTitle && <p className="font-medium">"{objectiveTitle}"</p>}
          <p className="text-muted-foreground">
            Are you sure you want to delete this objective?
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete Objective"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
