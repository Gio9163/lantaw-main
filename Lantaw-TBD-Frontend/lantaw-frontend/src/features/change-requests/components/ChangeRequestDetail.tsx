import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/common/card";
import { Button } from "../../../components/common/button";
import { Badge } from "../../../components/common/badge";
import { Check, X, ArrowLeft, Calendar, User, XCircle, Archive, Pencil } from "lucide-react";
import type { ChangeRequest } from "../../../types/changeRequest";
import { getStatusStyle, getOperationStyle, getChangeTypeDisplayName } from "../utils/statusHelpers";
import { formatDate } from "../../../utils/formatHelpers";
import { ChangeRequestFieldsDisplay } from "./ChangeRequestFieldsDisplay";
import { useAuth } from "../../../context/AuthContext";

interface ChangeRequestDetailProps {
  changeRequest: ChangeRequest;
  onBack: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onArchive?: () => void;
  onResubmit?: () => void;
  onCancel?: () => void;
  showActions?: boolean;
}

export const ChangeRequestDetail: React.FC<ChangeRequestDetailProps> = ({
  changeRequest,
  onBack,
  onApprove,
  onReject,
  onArchive,
  onResubmit,
  onCancel,
  showActions = false,
}) => {
  const { user } = useAuth();
  const currentStatus = changeRequest.latest_status || changeRequest.status;
  const statusStyle = getStatusStyle(currentStatus);
  const operationStyle = getOperationStyle(changeRequest.operation);
  const changeTypeName = getChangeTypeDisplayName(changeRequest.change_type);
  const canReview = currentStatus === 'PENDING' || currentStatus === 'RESUBMITTED';
  const canArchive = !canReview && currentStatus !== 'ARCHIVED';
  const isProjectStaff = user?.role === "Project Staff";
  const isOwnRequest = user?.id !== undefined && String(changeRequest.submitted_by) === user.id;
  const canCancel = isProjectStaff && isOwnRequest && currentStatus === 'PENDING';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to List
        </Button>
        <div className="flex gap-2">
          {showActions && canReview && (
            <>
              {onApprove && (
                <Button
                  onClick={onApprove}
                  className="bg-green-500 hover:bg-green-600"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Approve
                </Button>
              )}
              {onReject && (
                <Button variant="destructive" onClick={onReject}>
                  <X className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              )}
            </>
          )}
          {showActions && canArchive && onArchive && (
            <Button variant="outline" onClick={onArchive}>
              <Archive className="h-4 w-4 mr-2" />
              Archive
            </Button>
          )}
          {isProjectStaff && currentStatus === 'REJECTED' && onResubmit && (
            <Button variant="outline" onClick={onResubmit}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit & Resubmit
            </Button>
          )}
          {canCancel && onCancel && (
            <Button variant="outline" onClick={onCancel}>
              <XCircle className="h-4 w-4 mr-2" />
              Cancel Request
            </Button>
          )}
        </div>
      </div>

      {/* Main Detail Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-xl">Change Request Details</CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                {changeRequest.project_name && (
                  <Badge variant="outline">{changeRequest.project_name}</Badge>
                )}
                {changeRequest.request_code && (
                  <Badge variant="outline">{changeRequest.request_code}</Badge>
                )}
                <Badge variant="outline">{changeTypeName}</Badge>
                <Badge className={operationStyle.badge}>
                  {operationStyle.text}
                </Badge>
                <Badge className={statusStyle.badge}>
                  {statusStyle.text}
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Submitted By</p>
              <p className="font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                {changeRequest.submitted_by_name || 'Unknown'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Date Submitted</p>
              <p className="font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {formatDate(changeRequest.date_submitted)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Current Version</p>
              <p className="font-medium">Version {changeRequest.current_version || 1}</p>
            </div>
            {changeRequest.date_processed && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Date Processed</p>
                <p className="font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {formatDate(changeRequest.date_processed)}
                </p>
              </div>
            )}
            {changeRequest.approved_by_name && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Processed By</p>
                <p className="font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {changeRequest.approved_by_name}
                </p>
              </div>
            )}
            {changeRequest.entity_id && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Entity ID</p>
                <p className="font-medium">#{changeRequest.entity_id}</p>
              </div>
            )}
          </div>

          {changeRequest.latest_feedback && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Admin Feedback</p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <p className="text-sm">{changeRequest.latest_feedback}</p>
              </div>
            </div>
          )}

          <div>
            <p className="text-sm text-muted-foreground mb-2">Current Description</p>
            <div className="bg-muted rounded-md p-4">
              <p className="whitespace-pre-wrap">{changeRequest.description}</p>
            </div>
          </div>

          {changeRequest.versions && changeRequest.versions.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Timeline</p>
              <div className="space-y-3">
                {changeRequest.versions.map((version) => (
                  <div key={version.id} className="rounded-md border p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">Version {version.version_number}</Badge>
                      <Badge className={getStatusStyle(version.status).badge}>{getStatusStyle(version.status).text}</Badge>
                    </div>
                    <p className="mt-2 text-sm whitespace-pre-wrap">{version.description}</p>
                    {version.admin_feedback && (
                      <p className="mt-2 text-sm text-muted-foreground">Feedback: {version.admin_feedback}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Structured Fields Display */}
          <div>
            <ChangeRequestFieldsDisplay changeRequest={changeRequest} />
          </div>

          {/* Rejection Reason */}
          {changeRequest.rejection_reason && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Rejection Reason</p>
              <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4">
                <p className="text-sm">{changeRequest.rejection_reason}</p>
              </div>
            </div>
          )}

          {/* Cancel Reason */}
          {changeRequest.cancel_reason && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Cancel Reason</p>
              <div className="bg-gray-100 border border-gray-200 rounded-md p-4">
                <p className="text-sm">{changeRequest.cancel_reason}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
