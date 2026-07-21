import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/common/dialog";
import { Button } from "../../../components/common/button";
import { TextArea } from "../../../components/common/textarea";
import { Label } from "../../../components/common/label";
import { AlertCircle } from "lucide-react";
import type { ChangeRequestCreateData } from "../../../types/changeRequest";
import { ProposedChangesPreview } from "./ProposedChangesPreview";
import { getApiErrorMessage } from "../../../utils/apiError";

interface SubmitChangeRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  changeType: ChangeRequestCreateData['change_type'];
  operation: ChangeRequestCreateData['operation'];
  entityId?: number | null;
  currentState?: Record<string, unknown> | null;
  proposedChanges: Record<string, unknown>;
  onSubmit: (data: ChangeRequestCreateData) => Promise<void>;
  customTitle?: string;
}

export const SubmitChangeRequestModal: React.FC<SubmitChangeRequestModalProps> = ({
  open,
  onOpenChange,
  projectId,
  changeType,
  operation,
  entityId = null,
  currentState = null,
  proposedChanges,
  onSubmit,
  customTitle,
}) => {
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!description.trim()) {
      setError("Description is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onSubmit({
        project: projectId,
        change_type: changeType,
        operation: operation,
        description: description.trim(),
        entity_id: entityId,
        current_state: currentState,
        proposed_changes: proposedChanges,
      });
      setDescription("");
      onOpenChange(false);
      // Auto-refresh the page after successful submission
      window.location.reload();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Failed to submit change request"));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setDescription("");
    setError(null);
    onOpenChange(false);
  };

  const getOperationText = () => {
    switch (operation) {
      case 'CREATE':
        return 'create';
      case 'UPDATE':
        return 'update';
      case 'DELETE':
        return 'delete';
      default:
        return 'modify';
    }
  };

  const getChangeTypeText = () => {
    const typeMap: Record<string, string> = {
      ACTIVITY: 'Activity',
      OBJECTIVE: 'Objective',
      PERSONNEL: 'Personnel',
      BUDGET: 'Budget Item',
      COMPENSATION: 'Compensation',
      PROJECT: 'Project',
      ROLE: 'Role',
      DEPARTMENT: 'Department',
    };
    return typeMap[changeType] || changeType;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-[800px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{customTitle || "Submit Change Request"}</DialogTitle>
          <DialogDescription>
            Submit a request to {getOperationText()} this {getChangeTypeText().toLowerCase()}. An Admin will review and approve or reject your request.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 overflow-y-auto flex-1 min-h-0">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Note</p>
              <p>Your changes will not be applied until approved by an Admin. You can view the status of your request in the Change Requests section.</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Operation: </span>
                <span className="font-medium">{operation}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Type: </span>
                <span className="font-medium">{getChangeTypeText()}</span>
              </div>
              {entityId && (
                <div>
                  <span className="text-muted-foreground">Entity ID: </span>
                  <span className="font-medium">#{entityId}</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              Description <span className="text-destructive">*</span>
            </Label>
            <TextArea
              id="description"
              placeholder="Describe the changes you want to make and why..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Provide a clear description of the proposed changes. This will help the Admin understand your request.
            </p>
          </div>

          {/* Preview of proposed changes */}
          <div className="space-y-2">
            <Label>Proposed Changes Preview</Label>
            <div className="border rounded-md p-4 max-h-[300px] overflow-y-auto">
              <ProposedChangesPreview
                proposedChanges={proposedChanges}
                changeType={changeType}
                operation={operation}
                currentState={currentState}
                projectId={projectId}
              />
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
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !description.trim()}
          >
            {loading ? "Submitting..." : "Submit Change Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
