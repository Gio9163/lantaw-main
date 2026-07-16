// Header section with title, project status badge, and action buttons.

import React from "react";
import { Button } from "../../../components/common/button";
import { Badge } from "../../../components/common/badge";
import { Edit, Plus } from "lucide-react";
import { getProjectStatusStyle } from "../utils/statusHelpers";

interface ActivitiesHeaderProps {
  projectName: string;
  projectStatus: string;
  onEditProjectStatus: () => void;
  onAddObjective: () => void;
  userRole?: string;
}

export const ActivitiesHeader: React.FC<ActivitiesHeaderProps> = ({
  projectName,
  projectStatus,
  onEditProjectStatus,
  onAddObjective,
  userRole,
}) => {
  const statusStyle = getProjectStatusStyle(projectStatus);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-2">
          <h1 className="text-xl sm:text-[24px] font-bold">
            Activities Management
          </h1>
          <Badge
            variant="outline"
            className={`text-xs shrink-0 ${statusStyle.badge} ${userRole === "Project Staff" ? "cursor-pointer hover:opacity-80" : ""}`}
            onClick={userRole === "Project Staff" ? onEditProjectStatus : undefined}
          >
            <div className={`w-2 h-2 rounded-full ${statusStyle.bg} mr-2`} />
            {projectStatus.replace(/_/g, " ")}
          </Badge>
        </div>
        <p className="text-muted-foreground text-sm sm:text-base">
          Manage objectives and activities for {projectName}.
        </p>
      </div>
      {userRole === "Project Staff" && (
        <div className="flex flex-nowrap gap-2 shrink-0">
          <Button
            variant="outline"
            onClick={onEditProjectStatus}
            className="bg-background hover:bg-muted shrink-0"
            title="Edit project status"
          >
            <Edit className="h-4 w-4 mr-2 shrink-0" />
            Project Status
          </Button>
          <Button
            onClick={onAddObjective}
            className="bg-primary hover:bg-primary/90 shrink-0"
            title="Add new objective"
          >
            <Plus className="h-4 w-4 mr-2 shrink-0" />
            Add Objective
          </Button>
        </div>
      )}
    </div>
  );
};
