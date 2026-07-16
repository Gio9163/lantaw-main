import type { ChangeRequest } from "../../../types/changeRequest";

export interface StatusStyle {
  text: string;
  badge: string;
}

export interface OperationStyle {
  text: string;
  badge: string;
}

/**
 * Get status badge styling based on change request status.
 */
export const getStatusStyle = (status: ChangeRequest['status']): StatusStyle => {
  switch (status) {
    case 'PENDING':
      return {
        text: 'Pending',
        badge: 'bg-yellow-500 text-white',
      };
    case 'RESUBMITTED':
      return {
        text: 'Resubmitted',
        badge: 'bg-blue-500 text-white',
      };
    case 'APPROVED':
      return {
        text: 'Approved',
        badge: 'bg-green-500 text-white',
      };
    case 'REJECTED':
      return {
        text: 'Rejected',
        badge: 'bg-destructive text-white',
      };
    case 'ARCHIVED':
      return {
        text: 'Archived',
        badge: 'bg-gray-500 text-white',
      };
    default:
      return {
        text: status,
        badge: 'bg-gray-400 text-white',
      };
  }
};

/**
 * Get operation badge styling based on change request operation.
 */
export const getOperationStyle = (operation: ChangeRequest['operation']): OperationStyle => {
  switch (operation) {
    case 'CREATE':
      return {
        text: 'Create',
        badge: 'bg-blue-500 text-white',
      };
    case 'UPDATE':
      return {
        text: 'Update',
        badge: 'bg-primary text-primary-foreground',
      };
    case 'DELETE':
      return {
        text: 'Delete',
        badge: 'bg-destructive text-white',
      };
    default:
      return {
        text: operation,
        badge: 'bg-gray-400 text-white',
      };
  }
};

/**
 * Get change type display name.
 */
export const getChangeTypeDisplayName = (changeType: ChangeRequest['change_type']): string => {
  const displayNames: Record<ChangeRequest['change_type'], string> = {
    ACTIVITY: 'Activity',
    OBJECTIVE: 'Objective',
    PERSONNEL: 'Personnel',
    BUDGET: 'Budget',
    COMPENSATION: 'Compensation',
    PROJECT: 'Project',
    ROLE: 'Role',
    DEPARTMENT: 'Department',
    CHANGE_REQUEST: 'Change Request',
    USER: 'User',
  };
  return displayNames[changeType] || changeType;
};

