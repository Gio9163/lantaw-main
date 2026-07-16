// Header section with title and action buttons

import React from "react";
import { Button } from "../../../components/common/button";
import { Plus } from "lucide-react";

interface PersonnelHeaderProps {
  projectName: string;
  onAddPersonnel: () => void;
  userRole?: string;
}

export const PersonnelHeader: React.FC<PersonnelHeaderProps> = ({
  projectName,
  onAddPersonnel,
  userRole,
}) => {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-4 mb-2">
          <h1 className="text-xl sm:text-[24px] font-bold font-[Instrument_Sans]">
            Personnel Management
          </h1>
        </div>
        <p className="text-muted-foreground text-sm sm:text-base">
          Manage salary and honoraria records for project personnel in{" "}
          {projectName}.
        </p>
      </div>
      {userRole === "Project Staff" && (
        <div className="flex flex-nowrap gap-2 shrink-0">
          <Button
            onClick={onAddPersonnel}
            className="bg-primary hover:bg-primary/90 shrink-0"
          >
            <Plus className="h-4 w-4 mr-2 shrink-0" />
            Add Personnel
          </Button>
        </div>
      )}
    </div>
  );
};
