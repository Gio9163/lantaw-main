import React from "react";
import { Badge } from "../../../components/common/badge";
import { getStatusStyle, getOperationStyle } from "../utils/statusHelpers";
import type { ChangeRequest } from "../../../types/changeRequest";

interface ChangeRequestStatusBadgeProps {
  status: ChangeRequest['status'];
  operation?: ChangeRequest['operation'];
  className?: string;
}

export const ChangeRequestStatusBadge: React.FC<ChangeRequestStatusBadgeProps> = ({
  status,
  operation,
  className,
}) => {
  const statusStyle = getStatusStyle(status);
  const operationStyle = operation ? getOperationStyle(operation) : null;

  return (
    <div className={`flex items-center gap-2 ${className || ''}`}>
      {operationStyle && (
        <Badge className={operationStyle.badge}>
          {operationStyle.text}
        </Badge>
      )}
      <Badge className={statusStyle.badge}>
        {statusStyle.text}
      </Badge>
    </div>
  );
};

