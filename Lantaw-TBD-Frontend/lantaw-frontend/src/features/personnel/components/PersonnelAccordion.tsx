// Single personnel accordion item containing personnel list.
// Handles expand/collapse and displays personnel.

import React from "react";
import { Card, CardContent, CardTitle } from "../../../components/common/card";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../../components/common/accordion";
import { Button } from "../../../components/common/button";
import { Badge } from "../../../components/common/badge";
import { Edit, Trash2, Plus } from "lucide-react";
import type { Personnel } from "../../../types/personnel";
import type { Compensation } from "../../../types/compensation";
import { CompensationItemCard } from "./CompensationCard";
import {
  getStatusMarkerColor,
  getStatusBadgeColor,
} from "../utils/statusHelpers";
import { formatCurrency } from "../../../utils/formatHelpers";

interface PersonnelAccordionProps {
  personnel: Personnel;
  compensations: Compensation[];
  isLoading: boolean;
  isBudgetReady: boolean;
  onExpand: (personnelId: number) => void;
  onEditPersonnel: (personnel: Personnel) => void;
  onDeletePersonnel: (personnel: Personnel) => void;
  onEditSalary: (personnel: Personnel, compensationId: number) => void;
  onDeleteSalary: (personnel: Personnel, compensationId: number) => void;
  onAddSalary?: (personnel: Personnel) => void;
  onAddHonoraria: (personnel: Personnel) => void;
  onEditHonoraria: (personnel: Personnel, compensationId: number) => void;
  onDeleteHonoraria: (personnel: Personnel, compensationId: number) => void;
  onAddCompensation?: (personnel: Personnel) => void;
  showActions?: boolean;
  hideFinancialValues?: boolean;
}

export const PersonnelAccordion: React.FC<PersonnelAccordionProps> = ({
  personnel,
  compensations,
  isLoading,
  isBudgetReady,
  onExpand,
  onEditPersonnel,
  onDeletePersonnel,
  onEditSalary,
  onDeleteSalary,
  onAddSalary,
  onAddHonoraria,
  onEditHonoraria,
  onDeleteHonoraria,
  onAddCompensation,
  showActions = true,
  hideFinancialValues = false,
}) => {
  const salary = compensations.filter((c) => c.type === "SALARY");
  const honorariaItems = compensations.filter((c) => c.type === "HONORARIA");

  const getTotal = (items: Compensation[]) =>
    items.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

  return (
    <AccordionItem
      key={personnel.id}
      value={`personnel-${personnel.id}`}
      className="group"
    >
      <Card>
        {/* Header/Trigger */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between w-full px-4 sm:px-6 py-4">
          <AccordionTrigger
            onClick={() => onExpand(personnel.id)}
            className="hover:no-underline py-0 [&>svg]:hidden flex-1 min-w-0 text-left"
          >
            <div className="mr-4 min-w-0 max-w-full">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2 min-w-0">
                <div
                  className={`w-3 h-3 rounded-full shrink-0 ${getStatusMarkerColor(
                    personnel.employment_status
                  )}`}
                />
                <CardTitle className="text-lg font-medium wrap-break-word">
                  {personnel.first_name} {personnel.last_name}
                </CardTitle>
                <Badge
                  variant="outline"
                  className={`text-xs shrink-0 ${getStatusBadgeColor(
                    personnel.employment_status
                  )}`}
                >
                  {personnel.employment_status}
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground font-medium">
                  {personnel.role_name || "No role assigned"}
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {personnel.department && (
                    <span>{personnel.department_name}</span>
                  )}
                  {/*TODO: Date Hired Here */}
                </div>
              </div>
            </div>
          </AccordionTrigger>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
            {showActions && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditPersonnel(personnel);
                  }}
                  className="h-8 w-8 p-0"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeletePersonnel(personnel);
                  }}
                  className="h-8 w-8 p-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
            <div className="w-4 h-4 flex items-center justify-center sm:ml-2 shrink-0">
              <AccordionTrigger />
            </div>
          </div>
        </div>
      </Card>
      <Card>
        {/* Compensation Content */}
        <AccordionContent>
          <CardContent className="pt-0 border-t bg-slate-50/50 p-6">
            {/* Loading State */}
            {isLoading && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Loading compensations...
              </div>
            )}

            {/* Empty State (No Data) */}
            {!isLoading && compensations.length === 0 && (
              <div className="py-6 text-center space-y-3">
                <p className="text-sm text-muted-foreground">
                  No compensations added yet.
                </p>
                {showActions && onAddCompensation && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onAddCompensation(personnel)}
                    disabled={!isBudgetReady}
                    title={
                      !isBudgetReady
                        ? "Loading budget data..."
                        : "Add Compensation"
                    }
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Compensation
                  </Button>
                )}
              </div>
            )}

            {/* Compensation Data */}
            {!isLoading && compensations.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/** Left Column: Salary */}
                <div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3">
                    <h4 className="font-medium text-sm">Salary</h4>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                        Total: {hideFinancialValues ? "---" : formatCurrency(getTotal(salary))}
                      </span>
                      {showActions && onAddSalary && salary.length === 0 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => onAddSalary(personnel)}
                          disabled={!isBudgetReady}
                          title={
                            !isBudgetReady
                              ? "Loading budget data..."
                              : "Add Salary"
                          }
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {salary.length > 0 ? (
                      salary.map((item) => (
                        <CompensationItemCard
                          key={item.id}
                          item={item}
                          onEdit={(comp) => onEditSalary(personnel, comp.id)}
                          onDelete={(comp) =>
                            onDeleteSalary(personnel, comp.id)
                          }
                          showActions={showActions}
                          hideFinancialValues={hideFinancialValues}
                        />
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-4 border border-dashed rounded">
                        No salary records.
                      </p>
                    )}
                  </div>
                </div>

                {/* Right Column: Honoraria */}
                <div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3">
                    <h4 className="font-medium text-sm">Honoraria</h4>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded">
                        Total: {hideFinancialValues ? "---" : formatCurrency(getTotal(honorariaItems))}
                      </span>
                      {showActions && honorariaItems.length === 0 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => onAddHonoraria(personnel)}
                          disabled={!isBudgetReady}
                          title={
                            !isBudgetReady
                              ? "Loading budget data..."
                              : "Add Honoraria"
                          }
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {honorariaItems.length > 0 ? (
                      honorariaItems.map((item) => (
                        <CompensationItemCard
                          key={item.id}
                          item={item}
                          onEdit={(comp) => onEditHonoraria(personnel, comp.id)}
                          onDelete={(comp) =>
                            onDeleteHonoraria(personnel, comp.id)
                          }
                          showActions={showActions}
                          hideFinancialValues={hideFinancialValues}
                        />
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-4 border border-dashed rounded">
                        No honoraria records.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </AccordionContent>
      </Card>
    </AccordionItem>
  );
};
