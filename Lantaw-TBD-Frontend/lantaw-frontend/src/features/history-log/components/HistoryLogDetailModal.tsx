import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../../components/common/dialog";
import { Button } from "../../../components/common/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/common/card";
import { Badge } from "../../../components/common/badge";
import { formatDateTime } from "../../../utils/formatHelpers";
import { ChangeRequestFieldsDisplay } from "../../change-requests/components/ChangeRequestFieldsDisplay";
import type { HistoryLog } from "../../../types/historyLog";
import type { ChangeRequest } from "../../../types/changeRequest";
import { RotateCcw } from "lucide-react";

interface HistoryLogDetailModalProps {
  historyEntry: HistoryLog;
  isOpen: boolean;
  onClose: () => void;
  onRevert?: () => void;
}

export const HistoryLogDetailModal: React.FC<HistoryLogDetailModalProps> = ({
  historyEntry,
  isOpen,
  onClose,
  onRevert,
}) => {
  // Convert HistoryLog to ChangeRequest-like format for reuse of ChangeRequestFieldsDisplay
  const changeRequestLike: ChangeRequest = {
    id: historyEntry.id,
    project: historyEntry.project,
    project_name: historyEntry.project_name,
    submitted_by: historyEntry.user,
    submitted_by_name: historyEntry.user_name,
    change_type: historyEntry.change_type,
    operation: historyEntry.action === 'REVERT' ? 'UPDATE' : (historyEntry.action === 'DELETE' || historyEntry.action === 'CREATE' || historyEntry.action === 'UPDATE' ? historyEntry.action : 'UPDATE'),
    status: 'APPROVED',
    description: historyEntry.description,
    entity_id: historyEntry.entity_id,
    current_state: historyEntry.old_state ?? null,
    proposed_changes: historyEntry.new_state ?? {},
    approved_by: historyEntry.user,
    approved_by_name: historyEntry.user_name,
    date_submitted: historyEntry.timestamp,
    date_processed: historyEntry.timestamp,
  };

  const getActionStyle = (action: HistoryLog['action']) => {
    switch (action) {
      case 'CREATE':
        return 'bg-green-100 text-green-800';
      case 'UPDATE':
        return 'bg-blue-100 text-blue-800';
      case 'DELETE':
        return 'bg-red-100 text-red-800';
      case 'REVERT':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getChangeTypeDisplayName = (changeType: HistoryLog['change_type']) => {
    switch (changeType) {
      case 'ACTIVITY':
        return 'Activity';
      case 'OBJECTIVE':
        return 'Objective';
      case 'PERSONNEL':
        return 'Personnel';
      case 'BUDGET':
        return 'Budget';
      case 'COMPENSATION':
        return 'Compensation';
      case 'PROJECT':
        return 'Project';
      case 'ROLE':
        return 'Role';
      case 'DEPARTMENT':
        return 'Department';
      default:
        return changeType;
    }
  };

  const canRevert = historyEntry.action !== 'REVERT' && onRevert;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>History Log Entry Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Entry Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Date & Time</p>
                  <p className="font-medium">{formatDateTime(historyEntry.timestamp)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">User</p>
                  <p className="font-medium">{historyEntry.user_name || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Project</p>
                  <p className="font-medium">{historyEntry.project_name || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Action</p>
                  <Badge className={getActionStyle(historyEntry.action)}>
                    {historyEntry.action}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Change Type</p>
                  <Badge variant="outline">{getChangeTypeDisplayName(historyEntry.change_type)}</Badge>
                </div>
                {historyEntry.entity_id && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Entity ID</p>
                    <p className="font-medium">#{historyEntry.entity_id}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted rounded-md p-4">
                <p className="whitespace-pre-wrap">{historyEntry.description}</p>
              </div>
            </CardContent>
          </Card>

          {/* Old/New State Comparison */}
          {(historyEntry.old_state || historyEntry.new_state) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Change Details</CardTitle>
              </CardHeader>
              <CardContent>
                <ChangeRequestFieldsDisplay changeRequest={changeRequestLike} />
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          {canRevert && (
            <Button
              variant="destructive"
              onClick={onRevert}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Revert This Change
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

