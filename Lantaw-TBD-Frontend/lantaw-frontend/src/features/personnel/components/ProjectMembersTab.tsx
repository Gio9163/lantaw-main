import { useCallback, useEffect, useState } from "react";
import { Link2, Plus, UserRound } from "lucide-react";

import { Badge } from "../../../components/common/badge";
import { Button } from "../../../components/common/button";
import type { User } from "../../../types/user";
import type { ProjectInvitation, ProjectMember } from "../../../types/projectMember";
import { projectMembersApi } from "../services/projectMembersApi";
import { GenerateInvitationModal } from "./modals/GenerateInvitationModal";

interface Props {
  projectId: number;
  projectName: string;
  user: User | null;
}

function statusVariant(status: string) {
  if (status === "ACTIVE" || status === "ACCEPTED") return "default" as const;
  if (status === "REVOKED" || status === "EXPIRED") return "destructive" as const;
  return "secondary" as const;
}

function readableStatus(status: string) {
  return status.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function ProjectMembersTab({ projectId, projectName, user }: Props) {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [invitations, setInvitations] = useState<ProjectInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [revokingId, setRevokingId] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    setError("");
    try {
      const memberData = await projectMembersApi.listMembers(projectId);
      setMembers(memberData);
      if (user?.role === "Project Staff" || user?.role === "Admin") {
        setInvitations(await projectMembersApi.listInvitations(projectId));
      } else {
        setInvitations([]);
      }
    } catch (requestError) {
      console.error(requestError);
      setError("Unable to load project members and invitations.");
    } finally {
      setLoading(false);
    }
  }, [projectId, user?.role]);

  useEffect(() => {
    setLoading(true);
    void refresh();
  }, [refresh]);

  const revoke = async (invitation: ProjectInvitation) => {
    setRevokingId(invitation.id);
    setError("");
    try {
      await projectMembersApi.revokeInvitation(projectId, invitation.id);
      await refresh();
    } catch (requestError) {
      console.error(requestError);
      setError("Unable to revoke this invitation.");
    } finally {
      setRevokingId(null);
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading project members...</p>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Project Members</h2>
          <p className="text-sm text-muted-foreground">System accounts and invitation-based access for {projectName}.</p>
        </div>
        {user?.role === "Project Staff" && (
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" /> Generate Invitation
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-left">
            <tr>
              <th className="p-3">Name</th><th className="p-3">Email</th>
              <th className="p-3">Role</th><th className="p-3">Status</th>
              <th className="p-3">Invitation</th><th className="p-3">Joined Date</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={`member-${member.id}`} className="border-b last:border-0">
                <td className="p-3 font-medium">{member.full_name || "Unnamed User"}</td>
                <td className="p-3">{member.email}</td>
                <td className="p-3">{member.system_role_display}</td>
                <td className="p-3"><Badge variant={statusVariant(member.membership_status)}>{readableStatus(member.membership_status)}</Badge></td>
                <td className="p-3"><Badge variant="outline">Accepted</Badge></td>
                <td className="p-3">{new Date(member.date_joined).toLocaleDateString()}</td>
                <td className="p-3 text-muted-foreground">—</td>
              </tr>
            ))}
            {invitations.filter((item) => item.status !== "ACCEPTED").map((invitation) => (
              <tr key={`invitation-${invitation.id}`} className="border-b last:border-0">
                <td className="p-3 text-muted-foreground">Pending Invitee</td>
                <td className="p-3">{invitation.email}</td>
                <td className="p-3">{invitation.allowed_role_display}</td>
                <td className="p-3"><Badge variant="secondary">Pending</Badge></td>
                <td className="p-3"><Badge variant={statusVariant(invitation.status)}>{readableStatus(invitation.status)}</Badge></td>
                <td className="p-3 text-muted-foreground">—</td>
                <td className="p-3">
                  {user?.role === "Project Staff" &&
                  invitation.created_by_email === user.email &&
                  invitation.status === "SENT" ? (
                    <Button variant="outline" size="sm" disabled={revokingId === invitation.id} onClick={() => void revoke(invitation)}>
                      Revoke
                    </Button>
                  ) : <span className="text-muted-foreground">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {members.length === 0 && invitations.length === 0 && (
          <div className="flex items-center justify-center gap-2 p-10 text-muted-foreground">
            <UserRound className="h-5 w-5" /> No project members or invitations yet.
          </div>
        )}
      </div>

      {invitations.some((item) => item.status === "SENT") && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link2 className="h-3.5 w-3.5" /> Invitation links remain valid until accepted, revoked, or expired.
        </p>
      )}

      {user?.role === "Project Staff" && (
        <GenerateInvitationModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          projectId={projectId}
          projectName={projectName}
          onCreated={refresh}
        />
      )}
    </div>
  );
}
