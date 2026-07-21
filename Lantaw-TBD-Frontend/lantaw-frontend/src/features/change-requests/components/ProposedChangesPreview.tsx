import React, { useEffect, useState } from "react";
import { Label } from "../../../components/common/label";
import { Badge } from "../../../components/common/badge";
import { formatCurrency, shouldHideFinancialValues } from "../../../utils/formatHelpers";
import type { Personnel } from "../../../types/personnel";
import api from "../../../api/client";
import { useAuth } from "../../../context/AuthContext";

interface ProposedChangesPreviewProps {
  proposedChanges: Record<string, unknown>;
  changeType: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE' | 'ASSIGN' | 'APPROVE' | 'REJECT' | 'CANCEL' | 'LOGIN' | 'LOGOUT';
  currentState?: Record<string, unknown> | null;
  projectId?: number;
}

export const ProposedChangesPreview: React.FC<ProposedChangesPreviewProps> = ({
  proposedChanges,
  changeType,
  operation,
  currentState = null,
  projectId,
}) => {
  const { user } = useAuth();
  const hideFinancialValues = shouldHideFinancialValues(user?.role);
  const [personnelList, setPersonnelList] = useState<Personnel[]>([]);

  // Fetch personnel list for resolving IDs to names
  useEffect(() => {
    const fetchPersonnel = async () => {
      if (changeType === 'COMPENSATION' && projectId) {
        try {
          const response = await api.get(`/api/projects/${projectId}/personnel/`);
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
  }, [changeType, projectId]);

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
    if (value === null || value === undefined || value === "") {
      return <span className="text-muted-foreground italic">Not set</span>;
    }

    // Handle dates
    if (key.includes("date") || key.includes("Date")) {
      try {
        return new Date(String(value)).toLocaleDateString();
      } catch {
        return String(value);
      }
    }

    // Handle amounts/expenses
    if (key.includes("expense") || key.includes("amount") || key.includes("grant")) {
      const numValue = typeof value === "number" ? value : typeof value === "string" ? parseFloat(value) : Number.NaN;
      if (!isNaN(numValue)) {
        return formatCurrency(numValue, hideFinancialValues);
      }
      return String(value);
    }

    // Handle status fields
    if (key.includes("status")) {
      return <Badge variant="outline" className="text-xs">{String(value)}</Badge>;
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

  // Field labels mapping
  const fieldLabels: Record<string, string> = {
    // Objective fields
    title: "Title",
    description: "Description",
    
    // Activity fields
    activity_status: "Status",
    activity_budget_item: "Budget Category",
    projected_expense: "Projected Expense",
    actual_expense: "Actual Expense",
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
    personnel_name: "Personnel",
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

  // Render fields in a structured way
  const renderFields = (fields: Record<string, unknown>, title: string, variant: "current" | "proposed" = "proposed") => {
    if (!fields || Object.keys(fields).length === 0) {
      return null;
    }

    // Define field order for personnel (if it's a personnel change request)
    const personnelFieldOrder = [
      "first_name",
      "last_name",
      "role_name",
      "department_name",
      "employment_status",
    ];

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

    return (
      <div className="space-y-3">
        <h4 className="font-semibold text-sm mb-2">{title}</h4>
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 p-3 rounded-md border ${
          variant === "current" 
            ? "bg-red-50 border-red-200" 
            : "bg-green-50 border-green-200"
        }`}>
          {sortedEntries.map(([key, value]) => {
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
            if (key === "personnel" && fields.personnel_name !== undefined && changeType === 'COMPENSATION') {
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
              return (
                <div key={key}>
                  <Label className="text-xs text-muted-foreground">
                    {fieldLabels[displayKey] || displayKey.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                  </Label>
                  <p className="text-sm font-medium">#{value}</p>
                </div>
              );
            }

            const label = fieldLabels[key] || key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
            
            // Special handling for personnel_name field in compensation (prefer name over ID)
            if (key === "personnel_name" && changeType === 'COMPENSATION') {
              return (
                <div key={key}>
                  <Label className="text-xs text-muted-foreground">Personnel</Label>
                  <div className="text-sm font-medium mt-1">
                    {value === null || value === undefined || value === "" ? "Not set" : String(value)}
                  </div>
                </div>
              );
            }
            
            // Fallback: if personnel_name doesn't exist, try to resolve personnel ID
            if (key === "personnel" && changeType === 'COMPENSATION' && fields.personnel_name === undefined) {
              return (
                <div key={key}>
                  <Label className="text-xs text-muted-foreground">{label}</Label>
                  <div className="text-sm font-medium mt-1">
                    {getPersonnelName(value)}
                  </div>
                </div>
              );
            }
            
            return (
              <div key={key}>
                <Label className="text-xs text-muted-foreground">{label}</Label>
                <div className="text-sm font-medium mt-1">
                  {renderFieldValue(key, value)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // For CREATE operations, only show proposed changes
  if (operation === "CREATE") {
    return (
      <div className="space-y-3">
        {renderFields(proposedChanges, "New Details", "proposed")}
      </div>
    );
  }

  // For UPDATE operations, show comparison
  if (operation === "UPDATE") {
    return (
      <div className="space-y-3">
        {currentState && renderFields(currentState, "Current State", "current")}
        {renderFields(proposedChanges, "Proposed Changes", "proposed")}
      </div>
    );
  }

  // For DELETE operations, show what will be deleted
  if (operation === "DELETE") {
    return (
      <div className="space-y-3">
        <div className="text-sm font-semibold text-destructive mb-2">
          This {changeType.toLowerCase()} will be deleted
        </div>
        {currentState && renderFields(currentState, "Current State", "current")}
      </div>
    );
  }

  return null;
};
