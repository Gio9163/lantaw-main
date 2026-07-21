import React, { useEffect, useState } from "react";
import { Label } from "../../../components/common/label";
import { Badge } from "../../../components/common/badge";
import type { ChangeRequest } from "../../../types/changeRequest";
import { formatCurrency, shouldHideFinancialValues } from "../../../utils/formatHelpers";
import type { Personnel } from "../../../types/personnel";
import api from "../../../api/client";
import { useAuth } from "../../../context/AuthContext";

interface ChangeRequestFieldsDisplayProps {
  changeRequest: ChangeRequest;
}

export const ChangeRequestFieldsDisplay: React.FC<ChangeRequestFieldsDisplayProps> = ({
  changeRequest,
}) => {
  const { user } = useAuth();
  const hideFinancialValues = shouldHideFinancialValues(user?.role);
  const { change_type, operation, current_state, proposed_changes, project } = changeRequest;
  const [personnelList, setPersonnelList] = useState<Personnel[]>([]);

  // Fetch personnel list for resolving IDs to names
  useEffect(() => {
    const fetchPersonnel = async () => {
      if (change_type === 'COMPENSATION' && project) {
        try {
          const response = await api.get(`/api/projects/${project}/personnel/`);
          const personnelData = Array.isArray(response.data) 
            ? response.data 
            : (response.data.results || []);
          setPersonnelList(personnelData);
        } catch (err) {
          console.error("Failed to fetch personnel:", err);
          setPersonnelList([]);
        }
      }
    };
    fetchPersonnel();
  }, [change_type, project]);

  // Helper to resolve personnel ID to full name
  const getPersonnelName = (personnelId: unknown): string => {
    if (typeof personnelId !== "number" && typeof personnelId !== "string") return "Not set";
    const id = typeof personnelId === 'string' ? parseInt(personnelId) : personnelId;
    const person = personnelList.find(p => p.id === id);
    if (person) {
      return `${person.first_name} ${person.last_name}`.trim();
    }
    return `#${id}`;
  };

  // Render field value based on type
  const renderFieldValue = (key: string, value: unknown): React.ReactNode => {
    if (value === null || value === undefined) {
      return <span className="text-muted-foreground italic">Not set</span>;
    }

    // Handle dates
    if (key.includes("date") || key.includes("Date")) {
      return new Date(String(value)).toLocaleDateString();
    }

    // Handle amounts/expenses
    if (key.includes("expense") || key.includes("amount") || key.includes("grant")) {
      return formatCurrency(typeof value === "number" || typeof value === "string" ? value : String(value), hideFinancialValues);
    }

    // Handle status fields
    if (key.includes("status")) {
      return <Badge variant="outline">{String(value)}</Badge>;
    }

    // Handle boolean
    if (typeof value === "boolean") {
      return value ? "Yes" : "No";
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return value.length > 0 ? value.join(", ") : "None";
    }

    // Handle objects (nested)
    if (typeof value === "object") {
      return <pre className="text-xs">{JSON.stringify(value, null, 2)}</pre>;
    }

    return String(value);
  };

  // Helper function to detect changed fields
  const getChangedFields = (currentState: Record<string, unknown> | null, proposedChanges: Record<string, unknown>): Set<string> => {
    const changedFields = new Set<string>();
    
    if (!currentState || !proposedChanges) {
      return changedFields;
    }

    // Get all unique keys from both objects
    const allKeys = new Set([...Object.keys(currentState), ...Object.keys(proposedChanges)]);
    
    allKeys.forEach((key) => {
      // Skip internal IDs
      if (key === "id" || key === "project" || key === "project_id") {
        return;
      }

      const currentValue = currentState[key];
      const proposedValue = proposedChanges[key];
      
      // Special handling for grant_amount (decimal field)
      if (key === 'grant_amount') {
        const currentNum = (currentValue === null || currentValue === undefined || currentValue === '') 
          ? 0 
          : (typeof currentValue === 'number' ? currentValue : parseFloat(String(currentValue)) || 0);
        const proposedNum = (proposedValue === null || proposedValue === undefined || proposedValue === '') 
          ? 0 
          : (typeof proposedValue === 'number' ? proposedValue : parseFloat(String(proposedValue)) || 0);
        // Compare with small epsilon to handle floating point precision
        if (!isNaN(currentNum) && !isNaN(proposedNum) && Math.abs(currentNum - proposedNum) > 0.01) {
          changedFields.add(key);
        }
        return;
      }
      
      // Normalize values for comparison
      const normalizeValue = (val: unknown) => {
        if (val === null || val === undefined) return "";
        if (typeof val === "number") return val;
        const numVal = Number(val);
        if (!isNaN(numVal) && val !== "" && String(numVal) === String(val).trim()) {
          return numVal;
        }
        return String(val).trim();
      };

      const normalizedCurrent = normalizeValue(currentValue);
      const normalizedProposed = normalizeValue(proposedValue);
      
      if (normalizedCurrent !== normalizedProposed) {
        changedFields.add(key);
      }
    });

    return changedFields;
  };

  // Render fields in a structured way
  const renderFields = (
    fields: Record<string, unknown>,
    title: string, 
    variant: "current" | "proposed" = "proposed",
    changedFields?: Set<string>
  ) => {
    if (!fields || Object.keys(fields).length === 0) {
      return null;
    }

    // Check if this is an expense addition (ACTIVITY UPDATE where only actual_expense increased)
    const isExpenseAddition = change_type === 'ACTIVITY' && 
                               operation === 'UPDATE' &&
                               current_state &&
                               proposed_changes &&
                               changedFields?.has('actual_expense') &&
                               Object.keys(proposed_changes).every(key => 
                                 key === 'actual_expense' || 
                                 proposed_changes[key] === current_state[key]
                               );
    
    // Calculate additional expense if it's an expense addition (only for proposed changes)
    let additionalExpense: number | null = null;
    if (isExpenseAddition && variant === "proposed") {
      const currentExpense = Number(current_state.actual_expense || 0);
      const proposedExpense = Number(fields.actual_expense || 0);
      if (proposedExpense > currentExpense) {
        additionalExpense = proposedExpense - currentExpense;
      }
    }

    // Define field order for personnel (if it's a personnel change request)
    const personnelFieldOrder = [
      "first_name",
      "last_name",
      "role_name",
      "department_name",
      "employment_status",
    ];

    const fieldLabels: Record<string, string> = {
      // Objective fields
      title: "Title",
      description: "Description",
      
      // Activity fields
      activity_status: "Status",
      activity_budget_item: "Budget Category",
      projected_expense: "Projected Expense",
      actual_expense: "Actual Expense",
      additional_expense: "Additional Expense",
      objective: "Objective",
      
      // Personnel fields
      first_name: "First Name",
      last_name: "Last Name",
      role: "Role",
      role_name: "Role Name",
      department: "Department",
      department_name: "Department Name",
      employment_status: "Employment Status",
      
      // Budget fields
      name: "Name",
      
      // Compensation fields
      type: "Type",
      budget_item: "Budget Item",
      personnel: "Personnel",
      reason: "Reason",
      amount: "Amount",
      date_effective: "Effective Date",
      
      // Project fields
      project_leader: "Project Leader",
      grant_amount: "Grant Amount",
      project_status: "Project Status",
      date_start: "Start Date",
      date_end: "End Date",
    };

    return (
      <div className="space-y-3">
        <h4 className="font-semibold text-sm mb-3">{title}</h4>
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-md ${
          variant === "current" 
            ? "bg-red-50 border border-red-200" 
            : "bg-green-50 border border-green-200"
        }`}>
          {(() => {
            // Sort fields: personnel fields first in order, then others
            const sortedEntries = Object.entries(fields).sort(([keyA], [keyB]) => {
              const indexA = personnelFieldOrder.indexOf(keyA);
              const indexB = personnelFieldOrder.indexOf(keyB);
              
              // If both are in the order list, sort by their position
              if (indexA !== -1 && indexB !== -1) {
                return indexA - indexB;
              }
              // If only A is in the order list, it comes first
              if (indexA !== -1) return -1;
              // If only B is in the order list, it comes first
              if (indexB !== -1) return 1;
              // If neither is in the order list, maintain original order
              return 0;
            });

            // Add additional expense field if it's an expense addition
            const entriesToRender = [...sortedEntries];
            if (isExpenseAddition && variant === "proposed" && additionalExpense !== null) {
              // Insert additional_expense before actual_expense
              const actualExpenseIndex = entriesToRender.findIndex(([key]) => key === 'actual_expense');
              if (actualExpenseIndex !== -1) {
                entriesToRender.splice(actualExpenseIndex, 0, ['additional_expense', additionalExpense.toString()]);
              } else {
                entriesToRender.push(['additional_expense', additionalExpense.toString()]);
              }
            }

            return entriesToRender.map(([key, value]) => {
              // Skip internal IDs unless it's a reference field
              if (key === "id" || key === "project" || key === "project_id") {
                return null;
              }

              // Skip role/department ID fields when role_name/department_name exist
              if ((key === "role" && fields.role_name !== undefined) || 
                  (key === "department" && fields.department_name !== undefined) ||
                  (key === "role_id" && fields.role_name !== undefined) ||
                  (key === "department_id" && fields.department_name !== undefined)) {
                return null;
              }

              // Skip personnel ID when personnel_name exists (for compensation)
              if (key === "personnel" && fields.personnel_name !== undefined && change_type === 'COMPENSATION') {
                return null;
              }

              // Handle foreign key references (but skip role_id/department_id if names exist)
              if (key.includes("_id") && typeof value === "number") {
                const displayKey = key.replace("_id", "");
                // Skip role_id/department_id if we have name versions
                if ((displayKey === "role" && fields.role_name !== undefined) ||
                    (displayKey === "department" && fields.department_name !== undefined)) {
                  return null;
                }
                const isChanged = changedFields?.has(key) || false;
                const changeLabel = variant === "current" ? "Old" : "New";
                return (
                  <div 
                    key={key}
                    className={isChanged ? "bg-yellow-100 border-2 border-yellow-400 rounded-md p-2 -m-1" : ""}
                  >
                    <Label className={`text-xs ${isChanged ? "text-yellow-900 font-semibold" : "text-muted-foreground"}`}>
                      {fieldLabels[displayKey] || displayKey.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                      {isChanged && (
                        <span className="ml-1 text-yellow-700">({changeLabel})</span>
                      )}
                    </Label>
                    <p className={`text-sm font-medium ${isChanged ? "text-yellow-900" : ""}`}>#{value}</p>
                  </div>
                );
              }

              const label = fieldLabels[key] || key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
              
              // Special handling for additional_expense field (highlight it)
              if (key === "additional_expense" && isExpenseAddition) {
                return (
                  <div 
                    key={key}
                    className="bg-blue-100 border-2 border-blue-400 rounded-md p-2 -m-1"
                  >
                    <Label className="text-xs text-blue-900 font-semibold">
                      {label}
                    </Label>
                    <div className="text-sm font-medium mt-1 text-blue-900">
                      {renderFieldValue(key, value)}
                    </div>
                  </div>
                );
              }
              
              // Special handling for personnel_name field in compensation (prefer name over ID)
              if (key === "personnel_name" && change_type === 'COMPENSATION') {
                const isChanged = changedFields?.has(key) || changedFields?.has('personnel') || false;
                const changeLabel = variant === "current" ? "Old" : "New";
                return (
                  <div 
                    key={key}
                    className={isChanged ? "bg-yellow-100 border-2 border-yellow-400 rounded-md p-2 -m-1" : ""}
                  >
                    <Label className={`text-xs ${isChanged ? "text-yellow-900 font-semibold" : "text-muted-foreground"}`}>
                      Personnel
                      {isChanged && (
                        <span className="ml-1 text-yellow-700">({changeLabel})</span>
                      )}
                    </Label>
                    <div className={`text-sm font-medium mt-1 ${isChanged ? "text-yellow-900" : ""}`}>
                      {value === null || value === undefined || value === "" ? "Not set" : String(value)}
                    </div>
                  </div>
                );
              }
              
              // Fallback: if personnel_name doesn't exist, try to resolve personnel ID
              if (key === "personnel" && change_type === 'COMPENSATION' && fields.personnel_name === undefined) {
                const isChanged = changedFields?.has(key) || false;
                const changeLabel = variant === "current" ? "Old" : "New";
                return (
                  <div 
                    key={key}
                    className={isChanged ? "bg-yellow-100 border-2 border-yellow-400 rounded-md p-2 -m-1" : ""}
                  >
                    <Label className={`text-xs ${isChanged ? "text-yellow-900 font-semibold" : "text-muted-foreground"}`}>
                      {label}
                      {isChanged && (
                        <span className="ml-1 text-yellow-700">({changeLabel})</span>
                      )}
                    </Label>
                    <div className={`text-sm font-medium mt-1 ${isChanged ? "text-yellow-900" : ""}`}>
                      {getPersonnelName(value)}
                    </div>
                  </div>
                );
              }
              
              // Check if this field has changed
              const isChanged = changedFields?.has(key) || false;
              const changeLabel = variant === "current" ? "Old" : "New";
              
              return (
                <div 
                  key={key}
                  className={isChanged ? "bg-yellow-100 border-2 border-yellow-400 rounded-md p-2 -m-1" : ""}
                >
                  <Label className={`text-xs ${isChanged ? "text-yellow-900 font-semibold" : "text-muted-foreground"}`}>
                    {label}
                    {isChanged && (
                      <span className="ml-1 text-yellow-700">({changeLabel})</span>
                    )}
                  </Label>
                  <div className={`text-sm font-medium mt-1 ${isChanged ? "text-yellow-900" : ""}`}>
                    {renderFieldValue(key, value)}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>
    );
  };

  // For CREATE operations, only show proposed changes
  if (operation === "CREATE") {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold mb-2">New {change_type} Details</h3>
          {renderFields(proposed_changes, "Proposed Changes", "proposed")}
        </div>
      </div>
    );
  }

  // For UPDATE operations, show comparison
  if (operation === "UPDATE") {
    const changedFields = getChangedFields(current_state ?? null, proposed_changes);
    return (
      <div className="space-y-4">
        {current_state && renderFields(current_state, "Current State", "current", changedFields)}
        {renderFields(proposed_changes, "Proposed Changes", "proposed", changedFields)}
      </div>
    );
  }

  // For DELETE operations, show what will be deleted
  if (operation === "DELETE") {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold mb-2 text-destructive">
            This {change_type.toLowerCase()} will be deleted
          </h3>
          {current_state && renderFields(current_state, "Current State", "current")}
        </div>
      </div>
    );
  }

  return null;
};
