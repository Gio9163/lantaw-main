import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { BudgetItem } from "../utils/pieChartHelper";
import { OVERVIEW_COLORS } from "../utils/pieChartHelper";

interface BudgetOverviewChartProps {
  data: BudgetItem[];
  onSliceClick: (view: "PS" | "MOOE" | "CO") => void;
  hideFinancialValues?: boolean;
}

export const BudgetOverviewChart: React.FC<BudgetOverviewChartProps> = ({
  data,
  onSliceClick,
  hideFinancialValues = false,
}) => {
  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={320} className="min-h-[280px] sm:min-h-[320px]">
        <PieChart>
          <Pie
            data={data as Array<{ name: string; value: number; percentage: number }>}
            cx="50%"
            cy="50%"
          innerRadius={70}
          outerRadius={120}
            paddingAngle={5}
            dataKey="value"
            label={false}
            onClick={(sliceData) => {
              if (sliceData.name === "Personnel Services") {
                onSliceClick("PS");
              } else if (sliceData.name === "MOOE") {
                onSliceClick("MOOE");
              } else if (sliceData.name === "Capital Outlay") {
                onSliceClick("CO");
              }
            }}
            style={{ cursor: "pointer" }}
          >
            {data.map((_entry, index) => (
              <Cell
                key={`cell-overview-${index}`}
                fill={OVERVIEW_COLORS[index % OVERVIEW_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, name: string, props: any) => [
              hideFinancialValues ? "---" : `₱${value.toLocaleString()}`,
              `${name} (${props.payload.percentage}%)`,
            ]}
          />
        </PieChart>
      </ResponsiveContainer>
      {/* Legend: color dot, name, and percent */}
      <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
        {data.map((item, index) => (
          <li
            key={item.name}
            className="flex items-center gap-2 shrink-0"
          >
            <span
              className="h-3 w-3 rounded-full shrink-0"
              style={{ backgroundColor: OVERVIEW_COLORS[index % OVERVIEW_COLORS.length] }}
              aria-hidden
            />
            <span className="text-foreground font-medium">{item.name}</span>
            <span className="text-muted-foreground">({item.percentage}%)</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
