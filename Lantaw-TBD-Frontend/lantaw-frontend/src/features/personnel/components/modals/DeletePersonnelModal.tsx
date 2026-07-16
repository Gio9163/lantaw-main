// Confirmation modal for delete a personnel

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

interface DeletePersonnelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  personnelFirstName?: string;
  personnelLastName?: string;
}

export const DeletePersonnelModal: React.FC<DeletePersonnelModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  personnelFirstName,
  personnelLastName,
}) => {
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error("Failed to delete personnel:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const personnelFullName = `${personnelFirstName} ${personnelLastName}`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove Personnel</DialogTitle>
          <DialogDescription>
            This action cannot be undone. The personnel will be permanently removed from the project.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {personnelFullName && (
            <p className="font-medium">{personnelFullName}</p>
          )}
          <p className="text-muted-foreground">
            Are you sure you want to remove this personnel?
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
            {isDeleting ? "Deleting..." : "Remove Personnel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
