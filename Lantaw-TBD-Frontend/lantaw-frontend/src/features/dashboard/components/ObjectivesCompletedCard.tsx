// This card shows the summary of objectives completed in the project

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../../../components/common/card";

interface ObjectivesCompletedCardProps {
  completedObjectives: number;
  totalObjectives: number;
  onClick?: () => void;
}

export const ObjectivesCompletedCard: React.FC<
  ObjectivesCompletedCardProps
> = ({ completedObjectives, totalObjectives, onClick }) => {
  return (
    <Card
      className={`transition-colors ${onClick ? "cursor-pointer hover:bg-accent/50" : ""}`}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Objectives Overview</CardTitle>
        <span className="text-2xl">📊</span>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {completedObjectives}/{totalObjectives} Objectives Completed
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          View all objectives and their current status.
        </p>
      </CardContent>
    </Card>
  );
};
