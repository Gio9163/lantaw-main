import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../../components/common/dialog";
import { Button } from "../../../../components/common/button";
import { TextArea } from "../../../../components/common/textarea";
import { Label } from "../../../../components/common/label";
import { AlertCircle } from "lucide-react";
import type { ChangeRequest } from "../../../../types/changeRequest";
import { getChangeTypeDisplayName } from "../../utils/statusHelpers";

interface CancelChangeRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  changeRequest: ChangeRequest | null;
  onCancel: (reason: string) => Promise<void>;
}

export const CancelChangeRequestModal: React.FC<CancelChangeRequestModalProps> = ({
  open,
  onOpenChange,
  changeRequest,
  onCancel,
}) => {
  const [cancelReason, setCancelReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCancel = async () => {
    if (!changeRequest) return;

    setLoading(true);
    setError(null);

    try {
      await onCancel(cancelReason);
      setCancelReason("");
      onOpenChange(false);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to cancel change request");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCancelReason("");
    setError(null);
    onOpenChange(false);
  };

  if (!changeRequest) return null;

  // Generate auto title based on operation and change type
  const getAutoTitle = () => {
    const operationMap: Record<string, string> = {
      CREATE: 'Adding',
      UPDATE: 'Updating',
      DELETE: 'Deleting',
    };
    
    const changeTypeName = getChangeTypeDisplayName(changeRequest.change_type);
    const operationText = operationMap[changeRequest.operation] || 'Modifying';
    return `Cancel ${operationText} ${changeTypeName}`;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{getAutoTitle()}</DialogTitle>
          <DialogDescription>
            Please provide a reason for canceling this change request. This will help track why the request was canceled.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Note</p>
              <p>Once canceled, the change request cannot be approved or rejected. The project data will remain unchanged.</p>
            </div>
          </div>

          <div className="space-y-2">
            <div>
              <span className="text-sm font-medium">Project: </span>
              <span className="text-sm">{changeRequest.project_name || `Project #${changeRequest.project}`}</span>
            </div>
            <div>
              <span className="text-sm font-medium">Change Type: </span>
              <span className="text-sm">{changeRequest.change_type}</span>
            </div>
            <div>
              <span className="text-sm font-medium">Description: </span>
              <p className="text-sm text-muted-foreground mt-1">{changeRequest.description}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cancel-reason">
              Cancel Reason <span className="text-destructive">*</span>
            </Label>
            <TextArea
              id="cancel-reason"
              placeholder="Enter reason for canceling..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              This reason will be visible to administrators.
            </p>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Close
          </Button>
          <Button
            variant="default"
            onClick={handleCancel}
            disabled={loading || !cancelReason.trim()}
          >
            {loading ? "Canceling..." : "Cancel Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

