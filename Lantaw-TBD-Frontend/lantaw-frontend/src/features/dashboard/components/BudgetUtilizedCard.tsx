// This card shows the summary of the budget used during the project

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../../../components/common/card";
import { Progress } from "../../../components/common/progress";

interface BudgetUtilizedCardProps {
  budgetUtilized: number;
}

export const BudgetUtilizedCard: React.FC<BudgetUtilizedCardProps> = ({
  budgetUtilized,
}) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Budget Utilized</CardTitle>
        <span className="text-2xl">💰</span>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{budgetUtilized.toFixed(1)}%</div>
        <Progress value={budgetUtilized} className="mt-2" />
      </CardContent>
    </Card>
  );
};
