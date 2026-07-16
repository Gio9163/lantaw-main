import React, { useState } from "react";
import { Button } from "../../../components/common/button";
import { Badge } from "../../../components/common/badge";
import { Card, CardHeader } from "../../../components/common/card";
import { Eye, Check, X, Calendar, User, XCircle } from "lucide-react";
import type { ChangeRequest } from "../../../types/changeRequest";
import { getStatusStyle, getOperationStyle, getChangeTypeDisplayName } from "../utils/statusHelpers";
import { useAuth } from "../../../context/AuthContext";
// Date formatting helper
const formatDateDistance = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
};

interface ChangeRequestCardProps {
  changeRequest: ChangeRequest;
  onViewDetails: (request: ChangeRequest) => void;
  onApprove?: (request: ChangeRequest) => void;
  onReject?: (request: ChangeRequest) => void;
  onCancel?: (request: ChangeRequest) => void;
  showActions?: boolean;
}

export const ChangeRequestCard: React.FC<ChangeRequestCardProps> = ({
  changeRequest,
  onViewDetails,
  onApprove,
  onReject,
  onCancel,
  showActions = false,
}) => {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const currentStatus = changeRequest.latest_status || changeRequest.status;
  const statusStyle = getStatusStyle(currentStatus);
  const operationStyle = getOperationStyle(changeRequest.operation);
  const changeTypeName = getChangeTypeDisplayName(changeRequest.change_type);
  const isProcessed = currentStatus !== 'PENDING' && currentStatus !== 'REJECTED' && currentStatus !== 'RESUBMITTED';
  const isProjectStaff = user?.role === "Project Staff";
  const isOwnRequest = user?.id !== undefined && String(changeRequest.submitted_by) === user.id;
  const canCancel = isProjectStaff && isOwnRequest && currentStatus === 'PENDING';
  const descriptionPreview = changeRequest.description.length > 150
    ? changeRequest.description.substring(0, 150) + '...'
    : changeRequest.description;

  // Helper function to generate title for PROJECT change requests based on changed fields
  const generateProjectChangeTitle = (
    currentState: Record<string, any> | null,
    proposedChanges: Record<string, any>
  ): string | null => {
    if (!currentState || !proposedChanges || changeRequest.change_type !== 'PROJECT') {
      return null;
    }

    const fieldLabels: Record<string, string> = {
      name: "Project Name",
      project_leader: "Project Leader",
      description: "Description",
      date_start: "Start Date",
      date_end: "End Date",
      grant_amount: "Grant Amount",
    };

    const changedFields: string[] = [];

    // Check each field to see if it changed
    Object.keys(proposedChanges).forEach((key) => {
      const currentValue = currentState[key];
      const proposedValue = proposedChanges[key];
      
      // Special handling for grant_amount (decimal field)
      if (key === 'grant_amount') {
        // Handle null/undefined as 0
        const currentNum = (currentValue === null || currentValue === undefined || currentValue === '') 
          ? 0 
          : (typeof currentValue === 'number' ? currentValue : parseFloat(String(currentValue)) || 0);
        const proposedNum = (proposedValue === null || proposedValue === undefined || proposedValue === '') 
          ? 0 
          : (typeof proposedValue === 'number' ? proposedValue : parseFloat(String(proposedValue)) || 0);
        // Compare with small epsilon to handle floating point precision (0.01 for 2 decimal places)
        // Only add if both are valid numbers and there's a meaningful difference
        if (!isNaN(currentNum) && !isNaN(proposedNum) && Math.abs(currentNum - proposedNum) > 0.01) {
          changedFields.push(key);
        }
        return; // Skip to next field
      }
      
      // Normalize values for comparison (handle strings, numbers, dates)
      const normalizeValue = (val: any) => {
        if (val === null || val === undefined) return "";
        // Handle numbers - convert to number for proper comparison
        if (typeof val === "number") return val;
        // Try to parse as number if it's a numeric string
        const numVal = Number(val);
        if (!isNaN(numVal) && val !== "" && String(numVal) === String(val).trim()) {
          return numVal;
        }
        return String(val).trim();
      };

      const normalizedCurrent = normalizeValue(currentValue);
      const normalizedProposed = normalizeValue(proposedValue);
      
      // Compare normalized values
      if (normalizedCurrent !== normalizedProposed) {
        changedFields.push(key);
      }
    });

    // Generate title based on changed fields
    if (changedFields.length === 0) {
      return null; // No changes detected, fall back to default
    } else if (changedFields.length === 1) {
      const fieldName = fieldLabels[changedFields[0]] || changedFields[0];
      return `Updating ${fieldName}`;
    } else if (changedFields.length === 2) {
      const field1 = fieldLabels[changedFields[0]] || changedFields[0];
      const field2 = fieldLabels[changedFields[1]] || changedFields[1];
      return `Updating ${field1} and ${field2}`;
    } else {
      // For 3+ fields, show the first one and "and X more"
      const field1 = fieldLabels[changedFields[0]] || changedFields[0];
      const remainingCount = changedFields.length - 1;
      return `Updating ${field1} and ${remainingCount} more`;
    }
  };

  // Generate auto title based on operation and change type
  const getAutoTitle = () => {
    // Special case: PROJECT change requests - generate title based on changed fields
    if (changeRequest.change_type === 'PROJECT' && 
        changeRequest.operation === 'UPDATE' &&
        changeRequest.proposed_changes &&
        changeRequest.current_state) {
      const projectTitle = generateProjectChangeTitle(
        changeRequest.current_state,
        changeRequest.proposed_changes
      );
      if (projectTitle) {
        return projectTitle;
      }
    }

    // Special case: Check if it's an expense entry addition
    if (changeRequest.change_type === 'ACTIVITY' && 
        changeRequest.operation === 'UPDATE' &&
        changeRequest.proposed_changes &&
        changeRequest.current_state) {
      const currentExpense = Number(changeRequest.current_state.actual_expense || 0);
      const proposedExpense = Number(changeRequest.proposed_changes.actual_expense || 0);
      
      // Check if only actual_expense changed and it increased
      const cur = changeRequest.current_state;
      const onlyExpenseChanged = cur
        ? Object.keys(changeRequest.proposed_changes).every(key =>
            key === 'actual_expense' || changeRequest.proposed_changes[key] === cur[key]
          )
        : false;
      
      if (onlyExpenseChanged && proposedExpense > currentExpense) {
        return 'Adding Expense Entry';
      }
    }
    
    const operationMap: Record<string, string> = {
      CREATE: 'Adding',
      UPDATE: 'Updating',
      DELETE: 'Deleting',
    };
    
    const operationText = operationMap[changeRequest.operation] || 'Modifying';
    return `${operationText} ${changeTypeName}`;
  };

  // Get entity reference for UPDATE/DELETE
  const getEntityReference = () => {
    if (changeRequest.operation === 'CREATE') return null;
    if (changeRequest.entity_id) {
      return `${changeTypeName} #${changeRequest.entity_id}`;
    }
    return null;
  };

  const entityRef = getEntityReference();
  const autoTitle = getAutoTitle();

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1 min-w-0 space-y-2">
            {/* Badges Row */}
            <div className="flex items-center gap-2 flex-wrap">
              {changeRequest.project_name && (
                <Badge variant="outline" className="text-xs">
                  {changeRequest.project_name}
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                {changeTypeName}
              </Badge>
              <Badge className={operationStyle.badge}>
                {operationStyle.text}
              </Badge>
              <Badge className={statusStyle.badge}>
                {statusStyle.text}
              </Badge>
              {changeRequest.request_code && (
                <Badge variant="outline" className="text-xs">
                  {changeRequest.request_code}
                </Badge>
              )}
            </div>

            {/* Title/Description */}
            <div>
              <h3 className="font-semibold text-base mb-1">
                {autoTitle}
              </h3>
              {entityRef && (
                <p className="text-sm text-muted-foreground">
                  {entityRef}
                </p>
              )}
            </div>

            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {changeRequest.submitted_by_name || 'Unknown'}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDateDistance(changeRequest.updated_at || changeRequest.date_submitted)}
              </span>
              {changeRequest.current_version && (
                <span>Version {changeRequest.current_version}</span>
              )}
            </div>

            {/* Description Preview */}
            <div className="text-sm text-muted-foreground">
              {isExpanded ? (
                <div>
                  <p className="whitespace-pre-wrap">{changeRequest.description}</p>
                  {changeRequest.description.length > 150 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsExpanded(false);
                      }}
                      className="text-primary hover:underline mt-1"
                    >
                      Read less
                    </button>
                  )}
                </div>
              ) : (
                <div>
                  <p>{descriptionPreview}</p>
                  {changeRequest.description.length > 150 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsExpanded(true);
                      }}
                      className="text-primary hover:underline mt-1"
                    >
                      Read more
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 shrink-0">
            {/* View button - always visible */}
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails(changeRequest);
              }}
              className="h-8"
            >
              <Eye className="h-3 w-3 mr-1" />
              View
            </Button>
            
            {/* Cancel Request button - for Project Staff on their own pending requests */}
            {canCancel && onCancel && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onCancel(changeRequest);
                }}
                className="h-8"
              >
                <XCircle className="h-3 w-3 mr-1" />
                Cancel Request
              </Button>
            )}
            
            {/* Approve/Reject buttons - only for admins */}
            {showActions && (
              <>
                {!isProcessed && onApprove && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onApprove(changeRequest);
                    }}
                    className="h-8 bg-green-500 hover:bg-green-600"
                    disabled={isProcessed}
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Approve
                  </Button>
                )}
                {!isProcessed && onReject && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onReject(changeRequest);
                    }}
                    className="h-8"
                    disabled={isProcessed}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Reject
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </CardHeader>
    </Card>
  );
};

