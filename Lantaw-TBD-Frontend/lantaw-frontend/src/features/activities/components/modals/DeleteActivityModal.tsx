// Confirmation modal for deleting an activity.

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

interface DeleteActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  activityTitle?: string;
}

export const DeleteActivityModal: React.FC<DeleteActivityModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  activityTitle,
}) => {
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error("Failed to delete activity:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Activity</DialogTitle>
          <DialogDescription>
            This action cannot be undone. The activity will be permanently deleted.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {activityTitle && <p className="font-medium">"{activityTitle}"</p>}
          <p className="text-muted-foreground">
            Are you sure you want to delete this activity?
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
            {isDeleting ? "Deleting..." : "Delete Activity"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
