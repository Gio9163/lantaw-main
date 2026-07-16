// components/RegisterCard.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthForm } from "../../../components/layout/AuthForm.tsx";
import type { AuthFormData } from "../../../components/layout/AuthForm.tsx";
import { Eye } from "lucide-react";
import { Button } from "../../../components/common/button";
import api from "../../../api/client";

export default function RegisterCard() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleRegister = async (data: AuthFormData) => {
    setIsLoading(true);
    setError("");

    try {
      await api.post("/api/register/", {
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        password: data.password,
      });

      navigate("/login");
    } catch (err) {
      console.error(err);
      setError("Registration failed. Please try again.");
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

          <AuthForm
            type="register"
            onSubmit={handleRegister}
            isLoading={isLoading}
          />

          {error && (
            <p className="text-sm text-destructive mt-4 text-center">{error}</p>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <a href="/login" className="text-primary hover:underline">
                Sign in
              </a>
            </p>
          </div>
        </div>
        </div>
      </main>
    </div>
  );
}
