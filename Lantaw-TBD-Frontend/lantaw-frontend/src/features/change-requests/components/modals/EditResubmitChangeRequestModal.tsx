import { useEffect, useMemo, useState } from "react";
import type { AxiosResponse } from "axios";
import { AlertCircle } from "lucide-react";

import api from "../../../../api/client";
import { Button } from "../../../../components/common/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../../components/common/dialog";
import { Input } from "../../../../components/common/input";
import { Label } from "../../../../components/common/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../components/common/select";
import { TextArea } from "../../../../components/common/textarea";
import type {
  ChangeRequest,
  ChangeRequestResubmitData,
} from "../../../../types/changeRequest";
import { getApiErrorMessage } from "../../../../utils/apiError";

interface EditResubmitChangeRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  changeRequest: ChangeRequest | null;
  onResubmit: (data: ChangeRequestResubmitData) => Promise<void>;
}

interface ReferenceOption {
  id: number;
  label: string;
}

type FieldKind = "text" | "textarea" | "number" | "date" | "choice" | "reference";

interface FieldDefinition {
  key: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  step?: string;
  options?: Array<{ value: string; label: string }>;
  reference?: keyof ReferenceData;
  nullable?: boolean;
}

interface ReferenceData {
  roles: ReferenceOption[];
  departments: ReferenceOption[];
  objectives: ReferenceOption[];
  budgetItems: ReferenceOption[];
  personnel: ReferenceOption[];
}

const EMPTY_REFERENCES: ReferenceData = {
  roles: [],
  departments: [],
  objectives: [],
  budgetItems: [],
  personnel: [],
};

const FIELD_DEFINITIONS: Partial<Record<ChangeRequest["change_type"], FieldDefinition[]>> = {
  PROJECT: [
    { key: "name", label: "Project Name", kind: "text", required: true },
    { key: "project_leader", label: "Project Leader", kind: "text", required: true },
    { key: "description", label: "Project Description", kind: "textarea" },
    { key: "grant_amount", label: "Grant Amount", kind: "number", step: "0.01" },
    {
      key: "project_status",
      label: "Project Status",
      kind: "choice",
      options: [
        { value: "ACTIVE", label: "Active" },
        { value: "COMPLETED", label: "Completed" },
        { value: "ON_HOLD", label: "On Hold" },
      ],
    },
    { key: "date_start", label: "Start Date", kind: "date", required: true },
    { key: "date_end", label: "End Date", kind: "date", required: true },
  ],
  OBJECTIVE: [
    { key: "title", label: "Objective Title", kind: "text", required: true },
    { key: "description", label: "Objective Description", kind: "textarea" },
  ],
  ACTIVITY: [
    { key: "title", label: "Activity Title", kind: "text", required: true },
    {
      key: "activity_status",
      label: "Activity Status",
      kind: "choice",
      options: [
        { value: "PENDING", label: "Pending / Not Started" },
        { value: "ACTIVE", label: "Active / In Progress" },
        { value: "COMPLETED", label: "Completed" },
      ],
    },
    { key: "objective", label: "Objective", kind: "reference", reference: "objectives", required: true },
    { key: "activity_budget_item", label: "Budget Category", kind: "reference", reference: "budgetItems", nullable: true },
    { key: "projected_expense", label: "Projected Expense", kind: "number", step: "0.01" },
    { key: "actual_expense", label: "Actual Expense", kind: "number", step: "0.01" },
  ],
  PERSONNEL: [
    { key: "first_name", label: "First Name", kind: "text", required: true },
    { key: "last_name", label: "Last Name", kind: "text", required: true },
    { key: "role", label: "Personnel Role", kind: "reference", reference: "roles", nullable: true },
    { key: "department", label: "Department", kind: "reference", reference: "departments", nullable: true },
    {
      key: "employment_status",
      label: "Employment Status",
      kind: "choice",
      options: [
        { value: "ACTIVE", label: "Active" },
        { value: "INACTIVE", label: "Inactive" },
        { value: "TERMINATED", label: "Terminated" },
      ],
    },
  ],
  BUDGET: [
    {
      key: "name",
      label: "Budget Category",
      kind: "choice",
      required: true,
      options: [
        { value: "MOOE", label: "Maintenance and Other Operating Expenses (MOOE)" },
        { value: "PS", label: "Personnel Services (PS)" },
        { value: "CO", label: "Capital Outlay (CO)" },
      ],
    },
  ],
  COMPENSATION: [
    {
      key: "type",
      label: "Compensation Type",
      kind: "choice",
      required: true,
      options: [
        { value: "SALARY", label: "Salary" },
        { value: "HONORARIA", label: "Honoraria" },
      ],
    },
    { key: "personnel", label: "Personnel", kind: "reference", reference: "personnel", required: true },
    { key: "budget_item", label: "Budget Category", kind: "reference", reference: "budgetItems", required: true },
    { key: "reason", label: "Reason", kind: "textarea" },
    { key: "monthly_rate", label: "Monthly Rate", kind: "number", step: "0.01" },
    { key: "duration_months", label: "Duration (Months)", kind: "number", step: "1" },
    { key: "amount", label: "Total Amount", kind: "number", step: "0.01" },
    { key: "date_effective", label: "Effective Date", kind: "date", required: true },
  ],
  ROLE: [
    { key: "name", label: "Role Name", kind: "text", required: true },
  ],
  DEPARTMENT: [
    { key: "name", label: "Department Name", kind: "text", required: true },
  ],
};

interface PaginatedResponse<T> {
  results?: T[];
  next?: string | null;
}

const normalizeNextPage = (next: string) => {
  if (!/^https?:\/\//i.test(next)) return next;
  const url = new URL(next);
  return `${url.pathname}${url.search}`;
};

const fetchAllPages = async <T,>(initialUrl: string): Promise<T[]> => {
  const items: T[] = [];
  let nextUrl: string | null = initialUrl;

  while (nextUrl) {
    const response: AxiosResponse<T[] | PaginatedResponse<T>> =
      await api.get<T[] | PaginatedResponse<T>>(nextUrl);
    if (Array.isArray(response.data)) {
      items.push(...response.data);
      break;
    }

    items.push(...(response.data.results || []));
    nextUrl = response.data.next ? normalizeNextPage(response.data.next) : null;
  }

  return items;
};

const initialFieldValue = (request: ChangeRequest, key: string) => {
  const proposed = request.proposed_changes?.[key];
  if (proposed !== null && proposed !== undefined) return String(proposed);
  const current = request.current_state?.[key];
  if (current !== null && current !== undefined) return String(current);
  return "";
};

export function EditResubmitChangeRequestModal({
  open,
  onOpenChange,
  changeRequest,
  onResubmit,
}: EditResubmitChangeRequestModalProps) {
  const [description, setDescription] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [references, setReferences] = useState<ReferenceData>(EMPTY_REFERENCES);
  const [loadingReferences, setLoadingReferences] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fields = useMemo(() => {
    if (!changeRequest || changeRequest.operation === "DELETE") return [];
    const definitions = FIELD_DEFINITIONS[changeRequest.change_type] || [];
    if (changeRequest.operation === "CREATE") return definitions;

    const requestFields = new Set([
      ...Object.keys(changeRequest.current_state || {}),
      ...Object.keys(changeRequest.proposed_changes || {}),
    ]);

    return definitions.filter((field) => {
      // These relationships are fixed by their original feature edit forms.
      if (changeRequest.change_type === "ACTIVITY" && field.key === "objective") return false;
      if (changeRequest.change_type === "COMPENSATION" && field.key === "personnel") return false;
      return requestFields.has(field.key);
    });
  }, [changeRequest]);

  useEffect(() => {
    if (!open || !changeRequest) return;
    setDescription(changeRequest.description || "");
    setValues(Object.fromEntries(
      fields.map((field) => [field.key, initialFieldValue(changeRequest, field.key)])
    ));
    setError(null);
  }, [open, changeRequest, fields]);

  useEffect(() => {
    if (!open || !changeRequest) return;
    const needed = new Set(fields.map((field) => field.reference).filter(Boolean));
    if (!needed.size) {
      setReferences(EMPTY_REFERENCES);
      return;
    }

    let cancelled = false;
    const loadReferences = async () => {
      setLoadingReferences(true);
      try {
        const projectId = changeRequest.project;
        const requests = {
          roles: needed.has("roles") ? fetchAllPages<{ id: number; name: string }>(`/api/projects/${projectId}/roles/`) : null,
          departments: needed.has("departments") ? fetchAllPages<{ id: number; name: string }>(`/api/projects/${projectId}/departments/`) : null,
          objectives: needed.has("objectives") ? fetchAllPages<{ id: number; title: string }>(`/api/projects/${projectId}/objectives/`) : null,
          budgetItems: needed.has("budgetItems") ? fetchAllPages<{ id: number; name: string }>(`/api/projects/${projectId}/budget-line-items/`) : null,
          personnel: needed.has("personnel") ? fetchAllPages<{ id: number; first_name: string; last_name: string }>(`/api/projects/${projectId}/personnel/`) : null,
        };
        const [roles, departments, objectives, budgetItems, personnel] = await Promise.all([
          requests.roles, requests.departments, requests.objectives, requests.budgetItems, requests.personnel,
        ]);
        if (cancelled) return;
        setReferences({
          roles: roles?.map((item) => ({ id: item.id, label: item.name })) || [],
          departments: departments?.map((item) => ({ id: item.id, label: item.name })) || [],
          objectives: objectives?.map((item) => ({ id: item.id, label: item.title })) || [],
          budgetItems: budgetItems?.map((item) => ({ id: item.id, label: item.name })) || [],
          personnel: personnel?.map((item) => ({ id: item.id, label: `${item.first_name} ${item.last_name}`.trim() })) || [],
        });
      } catch (requestError) {
        if (!cancelled) setError(getApiErrorMessage(requestError, "Failed to load project options."));
      } finally {
        if (!cancelled) setLoadingReferences(false);
      }
    };
    void loadReferences();
    return () => { cancelled = true; };
  }, [open, changeRequest, fields]);

  const setFieldValue = (key: string, value: string) =>
    setValues((current) => ({ ...current, [key]: value }));

  const buildProposedChanges = () => {
    if (!changeRequest) return {};
    const proposedChanges = { ...changeRequest.proposed_changes };
    for (const field of fields) {
      const value = (values[field.key] || "").trim();
      if (field.required && !value) throw new Error(`${field.label} is required.`);
      if (field.kind === "reference") {
        proposedChanges[field.key] = value ? Number(value) : null;
      } else if (field.kind === "number") {
        if (!value) {
          proposedChanges[field.key] = null;
        } else if (!Number.isFinite(Number(value))) {
          throw new Error(`${field.label} must be a valid number.`);
        } else {
          proposedChanges[field.key] = field.key === "duration_months" ? Number(value) : value;
        }
      } else {
        proposedChanges[field.key] = value;
      }
    }

    if (changeRequest.change_type === "PERSONNEL") {
      const selectedRole = references.roles.find(
        (option) => option.id === proposedChanges.role
      );
      const selectedDepartment = references.departments.find(
        (option) => option.id === proposedChanges.department
      );
      proposedChanges.role_name = selectedRole?.label || "";
      proposedChanges.department_name = selectedDepartment?.label || "";
    }

    return proposedChanges;
  };

  const handleSubmit = async () => {
    if (!changeRequest || !description.trim()) {
      setError("Request description is required.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onResubmit({
        description: description.trim(),
        proposed_changes: buildProposedChanges(),
      });
      onOpenChange(false);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Failed to resubmit change request."));
    } finally {
      setLoading(false);
    }
  };

  if (!changeRequest) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-[760px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit & Resubmit {changeRequest.request_code}</DialogTitle>
          <DialogDescription>
            Correct the {changeRequest.change_type.toLowerCase()} request and submit a new pending version. Earlier versions remain unchanged.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto py-4 pr-1">
          {changeRequest.latest_feedback && (
            <div className="flex items-start gap-2 rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-900">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div><span className="font-medium">Administrator feedback:</span> {changeRequest.latest_feedback}</div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="resubmit-description">Request Description</Label>
            <TextArea id="resubmit-description" value={description} onChange={(event) => setDescription(event.target.value)} rows={4} />
          </div>

          {changeRequest.operation === "DELETE" ? (
            <p className="text-sm text-muted-foreground">Delete requests have no editable proposed fields. Update the request description to address the feedback.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {fields.map((field) => (
                <div className={`space-y-2 ${field.kind === "textarea" ? "sm:col-span-2" : ""}`} key={field.key}>
                  <Label htmlFor={`resubmit-${field.key}`}>
                    {field.label}{field.required && <span className="text-destructive"> *</span>}
                  </Label>
                  {field.kind === "textarea" ? (
                    <TextArea id={`resubmit-${field.key}`} value={values[field.key] || ""} onChange={(event) => setFieldValue(field.key, event.target.value)} rows={3} />
                  ) : field.kind === "choice" ? (
                    <Select value={values[field.key] || undefined} onValueChange={(value) => setFieldValue(field.key, value)}>
                      <SelectTrigger id={`resubmit-${field.key}`}><SelectValue placeholder={`Select ${field.label.toLowerCase()}`} /></SelectTrigger>
                      <SelectContent>{field.options?.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                    </Select>
                  ) : field.kind === "reference" && field.reference ? (
                    <Select value={values[field.key] || (field.nullable ? "__none__" : undefined)} onValueChange={(value) => setFieldValue(field.key, value === "__none__" ? "" : value)} disabled={loadingReferences}>
                      <SelectTrigger id={`resubmit-${field.key}`}><SelectValue placeholder={loadingReferences ? "Loading options..." : `Select ${field.label.toLowerCase()}`} /></SelectTrigger>
                      <SelectContent>
                        {field.nullable && <SelectItem value="__none__">None</SelectItem>}
                        {references[field.reference].map((option) => <SelectItem key={option.id} value={String(option.id)}>{option.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id={`resubmit-${field.key}`}
                      type={field.kind === "number" ? "number" : field.kind === "date" ? "date" : "text"}
                      step={field.step}
                      value={values[field.key] || ""}
                      onChange={(event) => setFieldValue(field.key, event.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading || loadingReferences || !description.trim()}>
            {loading ? "Resubmitting..." : "Submit New Version"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
