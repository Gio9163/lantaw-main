import { useEffect, useState } from "react";
import { Button } from "../../components/common/button";
import { Input } from "../../components/common/input";
import { Label } from "../../components/common/label";
import { Eye, EyeOff } from "lucide-react";

export type AuthFormType = "login" | "register";

interface AuthFormProps {
  type: AuthFormType;
  onSubmit: (data: AuthFormData) => void;
  isLoading?: boolean;
  invitationDefaults?: Partial<AuthFormData>;
  invitationProjectName?: string;
  lockInvitationFields?: boolean;
}

export interface AuthFormData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  confirmPassword?: string;
  requestedRole?: "PROJECT_STAFF" | "EXECUTIVE" | "";
  invitationCode?: string;
}

export function AuthForm({
  type,
  onSubmit,
  isLoading = false,
  invitationDefaults,
  invitationProjectName,
  lockInvitationFields = false,
}: AuthFormProps) {
  const [formData, setFormData] = useState<AuthFormData>({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    confirmPassword: "",
    requestedRole: "",
    invitationCode: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (invitationDefaults) {
      setFormData((previous) => ({ ...previous, ...invitationDefaults }));
    }
  }, [invitationDefaults]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Email validation
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    // Registration-specific validation
    if (type === "register") {
      if (!formData.firstName) {
        newErrors.firstName = "First name is required";
      }
      if (!formData.lastName) {
        newErrors.lastName = "Last name is required";
      }
      if (!formData.requestedRole) {
        newErrors.requestedRole = "Requested role is required";
      }
      if (!formData.invitationCode?.trim()) {
        newErrors.invitationCode = "Project invitation code is required";
      }

      if (!formData.confirmPassword) {
        newErrors.confirmPassword = "Please confirm your password";
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const handleInputChange = (field: keyof AuthFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {type === "register" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              type="text"
              placeholder="First Name"
              value={formData.firstName}
              onChange={(e) => handleInputChange("firstName", e.target.value)}
              className={errors.firstName ? "border-destructive" : ""}
              disabled={isLoading}
            />
            {errors.firstName && (
              <p className="text-sm text-destructive">{errors.firstName}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              type="text"
              placeholder="Last Name"
              value={formData.lastName}
              onChange={(e) => handleInputChange("lastName", e.target.value)}
              className={errors.lastName ? "border-destructive" : ""}
              disabled={isLoading}
            />
            {errors.lastName && (
              <p className="text-sm text-destructive">{errors.lastName}</p>
            )}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={formData.email}
          onChange={(e) => handleInputChange("email", e.target.value)}
          className={errors.email ? "border-destructive" : ""}
          disabled={isLoading}
          readOnly={type === "register" && lockInvitationFields}
          autoComplete={type === "login" ? "username" : "email"}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder={
              type === "login" ? "Enter your password" : "At least 8 characters"
            }
            value={formData.password}
            onChange={(e) => handleInputChange("password", e.target.value)}
            className={errors.password ? "border-destructive pr-10" : "pr-10"}
            disabled={isLoading}
            autoComplete={
              type === "login" ? "current-password" : "new-password"
            }
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password}</p>
        )}
      </div>

      {type === "register" && (
        <>
          {invitationProjectName && (
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <span className="text-muted-foreground">Invited Project:</span>{" "}
              {invitationProjectName}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="requestedRole">Requested Role</Label>
            <select
              id="requestedRole"
              value={formData.requestedRole}
              onChange={(event) =>
                handleInputChange("requestedRole", event.target.value)
              }
              className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ${
                errors.requestedRole ? "border-destructive" : "border-input"
              }`}
              disabled={isLoading || lockInvitationFields}
            >
              <option value="">Select a role</option>
              <option value="PROJECT_STAFF">Project Staff</option>
              <option value="EXECUTIVE">Executive</option>
            </select>
            {errors.requestedRole && (
              <p className="text-sm text-destructive">{errors.requestedRole}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Choose the role you are requesting. Your account and project access
              will require Administrator approval.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="invitationCode">Project Invitation Code</Label>
            <Input
              id="invitationCode"
              type="text"
              placeholder="Enter your invitation code"
              value={formData.invitationCode}
              onChange={(event) =>
                handleInputChange("invitationCode", event.target.value)
              }
              className={errors.invitationCode ? "border-destructive" : ""}
              disabled={isLoading}
              readOnly={lockInvitationFields}
              autoComplete="off"
            />
            {errors.invitationCode && (
              <p className="text-sm text-destructive">{errors.invitationCode}</p>
            )}
          </div>
        </>
      )}

      {type === "register" && (
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Re-enter your password"
              value={formData.confirmPassword}
              onChange={(e) =>
                handleInputChange("confirmPassword", e.target.value)
              }
              className={
                errors.confirmPassword ? "border-destructive pr-10" : "pr-10"
              }
              disabled={isLoading}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-sm text-destructive">{errors.confirmPassword}</p>
          )}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading
          ? "Loading..."
          : type === "login"
          ? "Sign In"
          : "Create Account"}
      </Button>
    </form>
  );
}
