import React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../../../components/common/card";
import { Button } from "../../../components/common/button";
import { useIsMobile } from "../../../components/common/use-mobile";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../../components/common/collapsible";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { ChevronDown, BarChart3, BarChart4 } from "lucide-react";
import {
  formatCurrency,
  getBudgetStatus,
} from "../../activities/utils/budgetHelpers";
import type {
  ActivityExpenseItem,
  ChartViewType,
  FinancialSummary,
} from "../types/analytics";

interface ActivityExpenseChartProps {
  data: ActivityExpenseItem[];
  summary: FinancialSummary;
  hideFinancialValues?: boolean;
  viewType?: ChartViewType;
  onViewTypeChange?: (viewType: ChartViewType) => void;
}

export const ActivityExpenseChart: React.FC<ActivityExpenseChartProps> = ({
  data,
  summary,
  hideFinancialValues = false,
  viewType = "COLUMN",
  onViewTypeChange,
}) => {
  const isMobile = useIsMobile();

  // Truncate activity names for display if too long
  const formatActivityName = (name: string, maxLength: number = 20) => {
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength) + "...";
  };

  // Prepare chart data with truncated names
  const chartData = data.map((item) => ({
    ...item,
    displayName: formatActivityName(item.activityName, 20),
  }));

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            <p>No activity data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Determine chart height based on view type and data length
  const chartHeight = viewType === "BAR" ? Math.max(300, data.length * 40) : 300;

  const yAxisWidth = isMobile ? 55 : 70;
  const barMargin = isMobile
    ? { top: 5, right: 20, left: 5, bottom: 5 }
    : { top: 5, right: 30, left: 5, bottom: 5 };
  const columnMargin = isMobile
    ? { top: 30, right: 20, left: 15, bottom: 40 }
    : { top: 30, right: 30, left: 20, bottom: 60 };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Activity Expenses</CardTitle>
          {onViewTypeChange && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant={viewType === "COLUMN" ? "default" : "outline"}
                size="sm"
                onClick={() => onViewTypeChange("COLUMN")}
                className="gap-2"
              >
                <BarChart3 className="h-4 w-4" />
                Column
              </Button>
              <Button
                variant={viewType === "BAR" ? "default" : "outline"}
                size="sm"
                onClick={() => onViewTypeChange("BAR")}
                className="gap-2"
              >
                <BarChart4 className="h-4 w-4" />
                Bar
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-visible">
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart
              data={chartData}
              layout={viewType === "BAR" ? "vertical" : undefined}
              margin={viewType === "BAR" ? barMargin : columnMargin}
            >
            <CartesianGrid strokeDasharray="3 3" />
            {viewType === "COLUMN" ? (
              <>
                <XAxis
                  dataKey="displayName"
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  tickFormatter={(value) =>
                    hideFinancialValues ? "---" : `₱${(value / 1000).toFixed(0)}k`
                  }
                  fontSize={12}
                />
              </>
            ) : (
              <>
                <XAxis
                  type="number"
                  tickFormatter={(value) =>
                    hideFinancialValues ? "---" : `₱${(value / 1000).toFixed(0)}k`
                  }
                  fontSize={12}
                />
                <YAxis
                  type="category"
                  dataKey="displayName"
                  fontSize={12}
                  width={yAxisWidth}
                />
              </>
            )}
            <Tooltip
              formatter={(value: number) =>
                formatCurrency(value, hideFinancialValues)
              }
              labelFormatter={(label) => {
                const fullName = data.find(
                  (item) => formatActivityName(item.activityName, 20) === label
                )?.activityName || label;
                return fullName;
              }}
              labelStyle={{ color: "#000" }}
              contentStyle={{
                maxWidth: "min(90vw, 280px)",
                wordBreak: "break-word",
              }}
              wrapperStyle={{ zIndex: 50 }}
            />
            <Bar
              dataKey="projected"
              fill="#078080"
              name="Projected"
              opacity={0.7}
            />
            <Bar dataKey="actual" fill="#f45d48" name="Actual" />
          </BarChart>
        </ResponsiveContainer>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex justify-between text-sm">
            <span>Total Projected:</span>
            <span className="font-medium">
              {formatCurrency(summary.totalProjected, hideFinancialValues)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Total Actual:</span>
            <span className="font-medium">
              {formatCurrency(summary.totalActual, hideFinancialValues)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Total Balance:</span>
            <span className="font-medium">
              {formatCurrency(summary.totalBalance, hideFinancialValues)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Utilization:</span>
            <span className="font-medium">
              {summary.utilizationPercentage.toFixed(2)}%
            </span>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
          <div className="rounded border p-2">
            <p className="text-muted-foreground">Under Budget</p>
            <p className="font-semibold">{summary.underBudgetCount}</p>
          </div>
          <div className="rounded border p-2">
            <p className="text-muted-foreground">On Budget</p>
            <p className="font-semibold">{summary.onBudgetCount}</p>
          </div>
          <div className="rounded border p-2">
            <p className="text-muted-foreground">Over Budget</p>
            <p className="font-semibold">{summary.overBudgetCount}</p>
          </div>
        </div>
        <div className="mt-4 grid gap-4 border-t pt-4 lg:grid-cols-2">
          <div>
            <h4 className="mb-2 text-sm font-medium">Expenses by Objective</h4>
            <div className="space-y-2">
              {summary.byObjective.map((group) => (
                <div key={group.name} className="rounded border p-2 text-xs">
                  <p className="font-medium">{group.name}</p>
                  <p className="text-muted-foreground">
                    Projected {formatCurrency(group.projected, hideFinancialValues)} · Actual{" "}
                    {formatCurrency(group.actual, hideFinancialValues)} · Balance{" "}
                    {formatCurrency(group.balance, hideFinancialValues)}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="mb-2 text-sm font-medium">Expenses by Activity Status</h4>
            <div className="space-y-2">
              {summary.byActivityStatus.map((group) => (
                <div key={group.name} className="rounded border p-2 text-xs">
                  <p className="font-medium">{group.name.replaceAll("_", " ")}</p>
                  <p className="text-muted-foreground">
                    Projected {formatCurrency(group.projected, hideFinancialValues)} · Actual{" "}
                    {formatCurrency(group.actual, hideFinancialValues)} · Balance{" "}
                    {formatCurrency(group.balance, hideFinancialValues)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t">
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between p-0 h-auto text-sm font-medium"
              >
                Activity Breakdown
                <ChevronDown className="h-4 w-4" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="space-y-1 max-h-60 overflow-y-auto min-w-0">
                {data.map((item, index) => {
                  const status = getBudgetStatus(item.budgetStatus);
                  return (
                    <div
                      key={`${item.activityName}-${index}`}
                      className="flex justify-between items-center text-xs min-w-0 gap-2"
                    >
                      <span className="truncate min-w-0" title={item.activityName}>
                        {item.activityName}:
                      </span>
                      <span className={`font-medium ${status.color} shrink-0`}>
                        {status.text}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </CardContent>
    </Card>
  );
};
