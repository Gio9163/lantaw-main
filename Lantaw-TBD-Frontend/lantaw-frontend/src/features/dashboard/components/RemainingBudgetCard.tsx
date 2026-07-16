// This card shows the remaining budget amount for the project

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../../../components/common/card";

interface RemainingBudgetCardProps {
  remainingBudget: number;
  grantAmount: number;
}

export const RemainingBudgetCard: React.FC<RemainingBudgetCardProps> = ({
  remainingBudget,
  grantAmount,
}) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Remaining Budget</CardTitle>
        <span className="text-2xl">🏦</span>
      </CardHeader>
      <CardContent>
        <div className="text-xs text-muted-foreground">Grant Amount</div>
        <div className="text-lg font-semibold">₱{grantAmount.toLocaleString()}</div>
        <div className="mt-3 text-xs text-muted-foreground">Remaining Budget</div>
        <div className="text-2xl font-bold">₱{remainingBudget.toLocaleString()}</div>
      </CardContent>
    </Card>
  );
};
