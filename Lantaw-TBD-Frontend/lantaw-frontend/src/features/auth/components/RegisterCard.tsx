// components/RegisterCard.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AuthForm } from "../../../components/layout/AuthForm.tsx";
import type { AuthFormData } from "../../../components/layout/AuthForm.tsx";
import { Eye } from "lucide-react";
import { Button } from "../../../components/common/button";
import api from "../../../api/client";
import axios from "axios";
import type { InvitationValidation } from "../../../types/projectMember";
import { projectMembersApi } from "../../personnel/services/projectMembersApi";

export default function RegisterCard() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [invitation, setInvitation] = useState<InvitationValidation | null>(null);
  const [validatingInvitation, setValidatingInvitation] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const invitationCode = searchParams.get("invite")?.trim() || "";

  useEffect(() => {
    if (!invitationCode) return;
    let cancelled = false;
    setValidatingInvitation(true);
    projectMembersApi.validateInvitation(invitationCode)
      .then((details) => {
        if (!cancelled) setInvitation(details);
      })
      .catch((requestError) => {
        console.error(requestError);
        if (!cancelled) setError("This invitation is invalid, expired, revoked, or already accepted.");
      })
      .finally(() => {
        if (!cancelled) setValidatingInvitation(false);
      });
    return () => { cancelled = true; };
  }, [invitationCode]);

  const invitationDefaults = useMemo(() => invitation ? ({
    email: invitation.email,
    requestedRole: invitation.allowed_role,
    invitationCode,
  }) : undefined, [invitation, invitationCode]);

  const handleRegister = async (data: AuthFormData) => {
    setIsLoading(true);
    setError("");

    try {
      await api.post("/api/register/", {
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        password: data.password,
        requested_role: data.requestedRole,
        invitation_code: data.invitationCode,
      });

      setSubmitted(true);
    } catch (err: unknown) {
      console.error(err);
      const responseData = axios.isAxiosError(err) ? err.response?.data : null;
      const errorValues =
        responseData && typeof responseData === "object"
          ? Object.values(responseData as Record<string, unknown>)
          : [];
      const firstError = errorValues
        .flatMap((value) => (Array.isArray(value) ? value : [value]))
        .find((value): value is string => typeof value === "string");
      setError(
        typeof firstError === "string"
          ? firstError
          : "Registration failed. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="flex items-center justify-between px-4 sm:px-8 py-6 border-b">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate("/")}>
            Back
          </Button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md px-4">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-primary">
                <Eye className="h-8 w-8 text-primary-foreground" />
              </div>
            </div>
            <h1 className="mb-2">Join Lantaw</h1>
          </div>

        <div className="bg-card border border-border rounded-xl p-8 shadow-sm">
          <div className="mb-6">
            <h3 className="mb-1">Create Account</h3>
          </div>

          {validatingInvitation ? (
            <p className="text-sm text-muted-foreground text-center">Validating invitation...</p>
          ) : invitation?.existing_account ? (
            <div className="space-y-4 text-center">
              <p className="font-medium">An account already exists for {invitation.email}.</p>
              <p className="text-sm text-muted-foreground">
                Sign in to submit this project membership invitation for Administrator approval.
              </p>
              <Button className="w-full" onClick={() => navigate(`/login?invite=${encodeURIComponent(invitationCode)}`)}>
                Sign In to Accept
              </Button>
            </div>
          ) : submitted ? (
            <div className="space-y-4 text-center">
              <p className="font-medium">Registration submitted successfully.</p>
              <p className="text-sm text-muted-foreground">
                Your account is awaiting Administrator approval.
              </p>
              <Button className="w-full" onClick={() => navigate("/login")}>
                Return to Sign In
              </Button>
            </div>
          ) : (
            <AuthForm
              type="register"
              onSubmit={handleRegister}
              isLoading={isLoading}
              invitationDefaults={invitationDefaults}
              invitationProjectName={invitation?.project_name}
              lockInvitationFields={Boolean(invitation)}
            />
          )}

          {error && (
            <p className="text-sm text-destructive mt-4 text-center">{error}</p>
          )}

          {!submitted && <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <a href="/login" className="text-primary hover:underline">
                Sign in
              </a>
            </p>
          </div>}
        </div>
        </div>
      </main>
    </div>
  );
}
