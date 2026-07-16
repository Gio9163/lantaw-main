// This card shows the summary of the duration status of the project

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../../../components/common/card";
import { Progress } from "../../../components/common/progress";
import { formatDate } from "../../../utils/formatHelpers";
import { Calendar } from "lucide-react";

interface ProjectDurationCardProps {
  projectStatus: string;
  isOverdue: boolean;
  remainingDays: number;
  elapsedDays: number;
  totalDays: number;
  startDate: string;
  endDate: string;
  progressPercentage: number;
}

export const ProjectDurationCard: React.FC<ProjectDurationCardProps> = ({
  projectStatus,
  isOverdue,
  remainingDays,
  elapsedDays,
  totalDays,
  startDate,
  endDate,
  progressPercentage,
}) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Project Duration</CardTitle>
        <Calendar className="h-5 w-5" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="text-lg font-bold">
            {projectStatus === "COMPLETED"
              ? "Completed"
              : isOverdue
              ? "OVERDUE"
              : `${remainingDays} days left`}
          </div>
          <div className="text-xs text-muted-foreground">
            {formatDate(startDate)} - {formatDate(endDate)}
          </div>
          <Progress
            value={progressPercentage}
            className={`mt-2 ${isOverdue ? "[&>div]:bg-destructive" : ""}`}
          />
          <div className="text-xs text-muted-foreground">
            {elapsedDays} of {totalDays} days
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
