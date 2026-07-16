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
import { AlertTriangle } from "lucide-react";
import type { ChangeRequest } from "../../../../types/changeRequest";
import { getChangeTypeDisplayName } from "../../utils/statusHelpers";

interface ApproveChangeRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  changeRequest: ChangeRequest | null;
  onApprove: () => Promise<void>;
}

export const ApproveChangeRequestModal: React.FC<ApproveChangeRequestModalProps> = ({
  open,
  onOpenChange,
  changeRequest,
  onApprove,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApprove = async () => {
    if (!changeRequest) return;

    setLoading(true);
    setError(null);

    try {
      await onApprove();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to approve change request");
    } finally {
      setLoading(false);
    }
  };

  if (!changeRequest) return null;

  // Generate auto title based on operation and change type
  const getAutoTitle = () => {
    // Special case: Check if it's an expense entry addition
    if (changeRequest.change_type === 'ACTIVITY' && 
        changeRequest.operation === 'UPDATE' &&
        changeRequest.proposed_changes &&
        changeRequest.current_state) {
      const cur = changeRequest.current_state;
      const currentExpense = Number(cur?.actual_expense || 0);
      const proposedExpense = Number(changeRequest.proposed_changes.actual_expense || 0);

      const onlyExpenseChanged = cur
        ? Object.keys(changeRequest.proposed_changes).every(key =>
            key === 'actual_expense' || changeRequest.proposed_changes[key] === cur[key]
          )
        : false;
      
      if (onlyExpenseChanged && proposedExpense > currentExpense) {
        return 'Approve Adding Expense Entry';
      }
    }
    
    const operationMap: Record<string, string> = {
      CREATE: 'Adding',
      UPDATE: 'Updating',
      DELETE: 'Deleting',
    };
    
    const changeTypeName = getChangeTypeDisplayName(changeRequest.change_type);
    const operationText = operationMap[changeRequest.operation] || 'Modifying';
    return `Approve ${operationText} ${changeTypeName}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{getAutoTitle()}</DialogTitle>
          <DialogDescription>
            Are you sure you want to approve this change request? This action will apply the proposed changes to the project.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium mb-1">Warning</p>
              <p>Once approved, the changes will be permanently applied to the project data. This action cannot be undone.</p>
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
              <span className="text-sm font-medium">Operation: </span>
              <span className="text-sm">{changeRequest.operation}</span>
            </div>
            <div>
              <span className="text-sm font-medium">Description: </span>
              <p className="text-sm text-muted-foreground mt-1">{changeRequest.description}</p>
            </div>
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
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleApprove}
            disabled={loading}
            className="bg-green-500 hover:bg-green-600"
          >
            {loading ? "Approving..." : "Approve"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

