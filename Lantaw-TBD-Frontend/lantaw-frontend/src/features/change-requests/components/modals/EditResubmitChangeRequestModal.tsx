import { useEffect, useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";

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

const fieldLabel = (key: string) =>
  key.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

const toDraftValue = (value: unknown) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
};

const isDisplayOnlyField = (key: string) =>
  key.endsWith("_name") || key === "additional_expense";

export function EditResubmitChangeRequestModal({
  open,
  onOpenChange,
  changeRequest,
  onResubmit,
}: EditResubmitChangeRequestModalProps) {
  const [description, setDescription] = useState("");
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editableEntries = useMemo(
    () => Object.entries(changeRequest?.proposed_changes || {}).filter(
      ([key]) => !isDisplayOnlyField(key)
    ),
    [changeRequest]
  );

  useEffect(() => {
    if (!open || !changeRequest) return;
    setDescription(changeRequest.description || "");
    setDraftValues(Object.fromEntries(
      editableEntries.map(([key, value]) => [key, toDraftValue(value)])
    ));
    setError(null);
  }, [open, changeRequest, editableEntries]);

  const parseValue = (key: string, originalValue: unknown) => {
    const value = draftValues[key] ?? "";
    if (typeof originalValue === "number") {
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) throw new Error(`${fieldLabel(key)} must be a number.`);
      return parsed;
    }
    if (typeof originalValue === "boolean") return value === "true";
    if (originalValue !== null && typeof originalValue === "object") {
      try {
        return JSON.parse(value);
      } catch {
        throw new Error(`${fieldLabel(key)} must contain valid JSON.`);
      }
    }
    return value;
  };

  const handleSubmit = async () => {
    if (!changeRequest || !description.trim()) {
      setError("Description is required.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const proposedChanges = { ...changeRequest.proposed_changes };
      editableEntries.forEach(([key, originalValue]) => {
        proposedChanges[key] = parseValue(key, originalValue);
      });
      await onResubmit({
        description: description.trim(),
        proposed_changes: proposedChanges,
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
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-[700px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit & Resubmit {changeRequest.request_code}</DialogTitle>
          <DialogDescription>
            Revise the requested content using the Administrator feedback. Resubmitting creates a new pending version; earlier versions remain unchanged.
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
            <TextArea
              id="resubmit-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
            />
          </div>

          {changeRequest.operation === "DELETE" ? (
            <p className="text-sm text-muted-foreground">
              Delete requests have no proposed field values. You can revise the description before resubmitting.
            </p>
          ) : (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Proposed Changes</h3>
              {editableEntries.map(([key, originalValue]) => {
                const isStructured = originalValue !== null && typeof originalValue === "object";
                const isLongText = isStructured || ["description", "reason", "message"].includes(key);
                return (
                  <div className="space-y-2" key={key}>
                    <Label htmlFor={`resubmit-${key}`}>{fieldLabel(key)}</Label>
                    {typeof originalValue === "boolean" ? (
                      <select
                        id={`resubmit-${key}`}
                        className="border-input bg-input-background h-9 w-full rounded-md border px-3 text-sm"
                        value={draftValues[key] ?? "false"}
                        onChange={(event) => setDraftValues((current) => ({ ...current, [key]: event.target.value }))}
                      >
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </select>
                    ) : isLongText ? (
                      <TextArea
                        id={`resubmit-${key}`}
                        value={draftValues[key] ?? ""}
                        onChange={(event) => setDraftValues((current) => ({ ...current, [key]: event.target.value }))}
                        rows={isStructured ? 6 : 3}
                      />
                    ) : (
                      <Input
                        id={`resubmit-${key}`}
                        type={typeof originalValue === "number" ? "number" : key.includes("date") ? "date" : "text"}
                        value={draftValues[key] ?? ""}
                        onChange={(event) => setDraftValues((current) => ({ ...current, [key]: event.target.value }))}
                      />
                    )}
                    {isStructured && <p className="text-xs text-muted-foreground">Edit this structured value as JSON.</p>}
                  </div>
                );
              })}
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading || !description.trim()}>
            {loading ? "Resubmitting..." : "Submit New Version"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
