import { useCallback, useEffect, useState } from "react";
import { Check, UserCheck, X } from "lucide-react";

import { Button } from "../components/common/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/common/card";
import type { RegistrationRequest } from "../types/registrationRequest";
import {
  approveRegistrationRequest,
  getPendingRegistrationRequests,
  rejectRegistrationRequest,
} from "../features/auth/services/registrationRequestsApi";
import { getApiErrorMessage } from "../utils/apiError";

export default function RegistrationRequests() {
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setError("");
    try {
      setRequests(await getPendingRegistrationRequests());
    } catch (requestError) {
      console.error(requestError);
      setError("Unable to load pending registration requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const approve = async (id: number) => {
    setProcessingId(id);
    setError("");
    try {
      await approveRegistrationRequest(id);
      await refresh();
    } catch (requestError) {
      console.error(requestError);
      setError(getApiErrorMessage(
        requestError,
        "Unable to approve this registration request."
      ));
    } finally {
      setProcessingId(null);
    }
  };

  const reject = async (id: number) => {
    const reason = window.prompt("Enter the reason for rejecting this registration:");
    if (!reason?.trim()) return;
    setProcessingId(id);
    setError("");
    try {
      await rejectRegistrationRequest(id, reason.trim());
      await refresh();
    } catch (requestError) {
      console.error(requestError);
      setError(getApiErrorMessage(
        requestError,
        "Unable to reject this registration request."
      ));
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading registration requests...</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Pending Registration Requests</h2>
        <p className="text-sm text-muted-foreground">
          Review requested system roles and invitation-scoped project access.
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {requests.length === 0 ? (
        <Card>
          <CardContent className="flex items-center gap-3 py-8 text-muted-foreground">
            <UserCheck className="h-5 w-5" />
            No pending registration requests.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {requests.map((request) => (
            <Card key={request.id}>
              <CardHeader>
                <CardTitle className="text-base">
                  {request.first_name} {request.last_name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                  <div><dt className="text-muted-foreground">Email</dt><dd>{request.email}</dd></div>
                  <div><dt className="text-muted-foreground">Requested Role</dt><dd>{request.requested_role_display}</dd></div>
                  <div><dt className="text-muted-foreground">Project</dt><dd>{request.project_name}</dd></div>
                  <div><dt className="text-muted-foreground">Invitation</dt><dd>{request.invitation_code}</dd></div>
                </dl>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => void approve(request.id)}
                    disabled={processingId === request.id}
                  >
                    <Check className="h-4 w-4" /> Approve
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => void reject(request.id)}
                    disabled={processingId === request.id}
                  >
                    <X className="h-4 w-4" /> Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
