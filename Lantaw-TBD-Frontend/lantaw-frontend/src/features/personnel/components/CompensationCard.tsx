// Displays a single compensation record with all its details.
// Handles edit, delete, and addition of honorarum.

import React from "react";
import { Button } from "../../../components/common/button";
import { Edit, Trash2 } from "lucide-react";
import type { Compensation } from "../../../types/compensation";
import { formatCurrency } from "../../../utils/formatHelpers";

interface CompensationItemCardProps {
  item: Compensation;
  onEdit: (item: Compensation) => void;
  onDelete: (item: Compensation) => void;
  showActions?: boolean;
  hideFinancialValues?: boolean;
}

export const CompensationItemCard: React.FC<CompensationItemCardProps> = ({
  item,
  onEdit,
  onDelete,
  showActions = true,
  hideFinancialValues = false,
}) => {
  const isHonoraria = item.type?.toLowerCase() === "honoraria";
  const monthlyAmount = isHonoraria ? item.honoraria : item.monthly_salary;
  const monthlyLabel = isHonoraria ? "Monthly Honoraria" : "Monthly Salary";

  return (
    <div className="border rounded-lg p-3 bg-card hover:bg-accent/5 transition-colors group">
      <div className="flex items-start justify-between">
        {/* Information Section */}
        <div className="flex-1">
          <p className="font-medium text-sm text-foreground">
            {item.role_name || item.reason || "Personnel compensation"}
          </p>
          <div className="mt-2 grid gap-2 text-xs sm:grid-cols-3">
            <div>
              <p className="text-muted-foreground">{monthlyLabel}</p>
              <p className="font-semibold">
                {formatCurrency(monthlyAmount, hideFinancialValues)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Duration</p>
              <p className="font-semibold">
                {item.duration_months ? `${item.duration_months} months` : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Approved Total</p>
              <p className="font-semibold">
                {formatCurrency(item.total_compensation, hideFinancialValues)}
              </p>
            </div>
          </div>
          {item.reason && (
            <p className="mt-2 text-xs text-muted-foreground">{item.reason}</p>
          )}
        </div>

        {/* Action Buttons (Hidden until hover) */}
        {showActions && (
          <div className="flex gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(item);
              }}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-blue-600"
            >
              <Edit className="h-3.5 w-3.5" />
            </Button>
            {isHonoraria && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(item);
                }}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Export alias for backward compatibility
export const CompensationCard = CompensationItemCard;
