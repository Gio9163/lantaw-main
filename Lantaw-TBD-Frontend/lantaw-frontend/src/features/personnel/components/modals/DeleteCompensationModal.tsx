// Confirmation modal for delete a compensation item

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
import type { Compensation } from "../../../../types/compensation";

interface DeleteCompensationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  compensation: Compensation;
}

export const DeleteCompensationModal: React.FC<
  DeleteCompensationModalProps
> = ({ isOpen, onClose, onConfirm, compensation }) => {
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);

    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error("Failed to delete compensation item:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const compType = compensation.type.toLowerCase();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove {compType} item</DialogTitle>
          <DialogDescription>
            This action cannot be undone. The {compType} item will be permanently deleted.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Are you sure you want to delete this {compType} item?
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
            {isDeleting ? "Deleting..." : "Remove Item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
