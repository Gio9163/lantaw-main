import { useEffect, useState } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";

import { Button } from "../../../../components/common/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../../components/common/dialog";
import { Label } from "../../../../components/common/label";
import { TextArea } from "../../../../components/common/textarea";
import type { ChangeRequest } from "../../../../types/changeRequest";
import { getApiErrorMessage } from "../../../../utils/apiError";

interface RevertChangeRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  changeRequest: ChangeRequest | null;
  onRevert: (feedback: string) => Promise<void>;
}

export function RevertChangeRequestModal({
  open,
  onOpenChange,
  changeRequest,
  onRevert,
}: RevertChangeRequestModalProps) {
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setFeedback("");
      setError(null);
    }
  }, [open]);

  const handleClose = () => {
    if (!loading) onOpenChange(false);
  };

  const handleRevert = async () => {
    if (!changeRequest || !feedback.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await onRevert(feedback.trim());
      onOpenChange(false);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Failed to revert the approved request."));
    } finally {
      setLoading(false);
    }
  };

  if (!changeRequest) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Revert {changeRequest.request_code}
          </DialogTitle>
          <DialogDescription>
            Restore the data from before this update was approved and return the request to Project Staff for correction.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-start gap-2 rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-900">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              The rollback is blocked if the affected fields were modified after approval. Staff must submit a corrected version before Admin can approve it again.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="revert-feedback">
              Feedback for Project Staff <span className="text-destructive">*</span>
            </Label>
            <TextArea
              id="revert-feedback"
              value={feedback}
              onChange={(event) => setFeedback(event.target.value)}
              placeholder="Explain what is wrong and what Staff should correct..."
              rows={5}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              This feedback appears on the pending request and in its version timeline.
            </p>
          </div>

          {error && (
            <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleRevert} disabled={loading || !feedback.trim()}>
            {loading ? "Reverting..." : "Revert Applied Change"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
