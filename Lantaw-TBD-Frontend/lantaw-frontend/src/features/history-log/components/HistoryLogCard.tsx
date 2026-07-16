import React from "react";
import { Badge } from "../../../components/common/badge";
import { Card, CardHeader } from "../../../components/common/card";
import { Calendar, User, FolderOpen } from "lucide-react";
import type { HistoryLog } from "../../../types/historyLog";
import { formatDateTime } from "../../../utils/formatHelpers";

interface HistoryLogCardProps {
  entry: HistoryLog;
  onViewDetails: (entry: HistoryLog) => void;
}

const getActionDisplayName = (action: HistoryLog["action"]) => {
  switch (action) {
    case "CREATE":
      return "Create";
    case "UPDATE":
      return "Update";
    case "DELETE":
      return "Delete";
    case "REVERT":
      return "Revert";
    default:
      return action;
  };
};

const getActionBadgeClass = (action: HistoryLog["action"]) => {
  switch (action) {
    case "CREATE":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    case "UPDATE":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    case "DELETE":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    case "REVERT":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
    default:
      return "bg-muted text-muted-foreground";
  }
};

export const HistoryLogCard: React.FC<HistoryLogCardProps> = ({
  entry,
  onViewDetails,
}) => {
  return (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onViewDetails(entry)}
    >
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1 min-w-0 space-y-2">
            {/* Description */}
            <p className="font-medium text-base wrap-break-word">
              {entry.description}
            </p>

            {/* Metadata row */}
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 shrink-0">
                <Badge
                  variant="outline"
                  className={`text-xs shrink-0 ${getActionBadgeClass(entry.action)}`}
                >
                  {getActionDisplayName(entry.action)}
                </Badge>
              </span>
              <span className="inline-flex items-center gap-1 shrink-0">
                <User className="h-3.5 w-3.5" />
                {entry.user_name || "Unknown"}
              </span>
              {entry.project_name && (
                <span className="inline-flex items-center gap-1 shrink-0">
                  <FolderOpen className="h-3.5 w-3.5" />
                  {entry.project_name}
                </span>
              )}
              <span className="inline-flex items-center gap-1 shrink-0">
                <Calendar className="h-3.5 w-3.5" />
                {formatDateTime(entry.timestamp)}
              </span>
              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${entry.remaining_until_archive && entry.remaining_until_archive.includes('day') ? 'bg-green-100 text-green-800' : entry.remaining_until_archive && entry.remaining_until_archive.includes('hour') ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'}`}>
                {entry.remaining_until_archive || 'Archive soon'}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
};
