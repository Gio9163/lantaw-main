import { useEffect, useState } from "react";
import axios from "axios";
import { Copy } from "lucide-react";

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
import type { ProjectInvitation } from "../../../../types/projectMember";
import { projectMembersApi } from "../../services/projectMembersApi";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  projectName: string;
  onCreated: () => Promise<void>;
}

function defaultExpiration() {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

export function GenerateInvitationModal({
  open,
  onOpenChange,
  projectId,
  projectName,
  onCreated,
}: Props) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"PROJECT_STAFF" | "EXECUTIVE">("PROJECT_STAFF");
  const [expiration, setExpiration] = useState(defaultExpiration());
  const [message, setMessage] = useState("");
  const [created, setCreated] = useState<ProjectInvitation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setEmail("");
      setRole("PROJECT_STAFF");
      setExpiration(defaultExpiration());
      setMessage("");
      setCreated(null);
      setError("");
    }
  }, [open]);

  const invitationLink = created
    ? `${window.location.origin}${
        window.location.pathname.startsWith("/") ? "/" : ""
      }/register?invite=${encodeURIComponent(created.code)}`
    : "";

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const expiresAt = new Date(`${expiration}T23:59:59`).toISOString();
      const invitation = await projectMembersApi.createInvitation(projectId, {
        email: email.trim(),
        allowed_role: role,
        expires_at: expiresAt,
        message: message.trim(),
      });
      setCreated(invitation);
      await onCreated();
    } catch (requestError: unknown) {
      console.error(requestError);
      const data = axios.isAxiosError(requestError)
        ? requestError.response?.data
        : null;
      const detail = data?.email?.[0] || data?.expires_at?.[0] || data?.detail;
      setError(detail || "Unable to generate the invitation.");
    } finally {
      setLoading(false);
    }
  };

  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Generate Invitation</DialogTitle>
          <DialogDescription>
            Invite a system user to {projectName}. Administrator approval remains required.
          </DialogDescription>
        </DialogHeader>

        {created ? (
          <div className="space-y-4">
            <div className="rounded-md border p-3 text-sm space-y-1">
              <p><span className="text-muted-foreground">Project:</span> {created.project_name}</p>
              <p><span className="text-muted-foreground">Role:</span> {created.allowed_role_display}</p>
              <p><span className="text-muted-foreground">Email:</span> {created.email}</p>
              <p><span className="text-muted-foreground">Expires:</span> {new Date(created.expires_at).toLocaleDateString()}</p>
            </div>
            <Button variant="outline" className="w-full" onClick={() => void copy(invitationLink)}>
              <Copy className="h-4 w-4" /> Copy Invitation Link
            </Button>
            <Button variant="outline" className="w-full" onClick={() => void copy(created.code)}>
              <Copy className="h-4 w-4" /> Copy Invitation Code
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email Address</Label>
              <Input id="invite-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <select
                id="invite-role"
                value={role}
                onChange={(event) => setRole(event.target.value as "PROJECT_STAFF" | "EXECUTIVE")}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="PROJECT_STAFF">Project Staff</option>
                <option value="EXECUTIVE">Executive</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-expiration">Expiration</Label>
              <Input id="invite-expiration" type="date" required value={expiration} onChange={(event) => setExpiration(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-message">Optional Message</Label>
              <TextArea id="invite-message" value={message} onChange={(event) => setMessage(event.target.value)} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={loading}>{loading ? "Generating..." : "Generate Invitation"}</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
