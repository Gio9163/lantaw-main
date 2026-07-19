import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AuthForm } from "../../../components/layout/AuthForm.tsx";
import type { AuthFormData } from "../../../components/layout/AuthForm.tsx";
import { Eye } from "lucide-react";
import { Button } from "../../../components/common/button";
import api from "../../../api/client";
import { useAuth } from "../../../context/AuthContext";
import { projectMembersApi } from "../../personnel/services/projectMembersApi";
import axios from "axios";

export default function LoginCard() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setTokens } = useAuth();

  const handleLogin = async (data: AuthFormData) => {
    setIsLoading(true);
    setError("");

    try {
      const res = await api.post("/api/token/", {
        email: data.email,
        password: data.password,
      });

      const invitationCode = searchParams.get("invite")?.trim();
      if (invitationCode) {
        await projectMembersApi.acceptInvitation(invitationCode, res.data.access);
      }

      // Update AuthContext immediately with new tokens
      setTokens(res.data.access, res.data.refresh);
      
      // Small delay to let AuthContext update before navigation
      setTimeout(() => {
        navigate("/");
      }, 100);
    } catch (err: unknown) {
      console.error(err);
      const detail = axios.isAxiosError(err) ? err.response?.data?.detail : null;
      setError(detail || "Invalid email or password.");
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
            <h1 className="mb-2">Welcome to Lantaw</h1>
          </div>
          <div className="bg-card border border-border rounded-xl p-8 shadow-sm">
          <div className="mb-6">
            <h3 className="mb-1">Sign In</h3>
          </div>

          <AuthForm type="login" onSubmit={handleLogin} isLoading={isLoading} />

          {error && (
            <p className="text-sm text-destructive mt-4 text-center">{error}</p>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Don’t have an account?{" "}
              <a href="/register" className="text-primary hover:underline">
                Create one
              </a>
            </p>
          </div>
        </div>
        </div>
      </main>
    </div>
  );
}
