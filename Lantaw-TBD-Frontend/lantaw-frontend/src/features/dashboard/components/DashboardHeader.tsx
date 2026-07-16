// Header section with title and action button

import React from "react";
import { Button } from "../../../components/common/button";
import { Edit } from "lucide-react";

interface DashboardHeaderProps {
  projectName: string;
  projectLeader?: string;
  projectDescription: string;
  onEditProject: () => void;
  userRole?: string;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  projectName,
  projectLeader,
  projectDescription,
  onEditProject,
  userRole,
}) => {
  return (
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <h1 className="mb-2 text-[24px] font-bold">{projectName}</h1>
        {projectLeader && (
          <p className="mb-2 text-[16px] font-bold">
            Project Leader: {projectLeader}
          </p>
        )}
        <p className="text-muted-foreground">{projectDescription}</p>
      </div>
      {userRole === "Project Staff" && (
        <Button variant="outline" onClick={onEditProject}>
          <Edit className="h-4 w-4 mr-2" /> Edit Project
        </Button>
      )}
    </div>
  );
};
