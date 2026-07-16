import { Navigate, useLocation, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { ReactNode } from "react";
import Landing from "../pages/Landing";

interface ProtectedRouteProps {
  children: ReactNode;
  projectScoped?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  projectScoped = false,
}) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const { id: projectId } = useParams();

  // Show loading indicator while waiting for auth state.
  if (loading) return <div>Loading in protected route...</div>;

  // If user isn't authenticated:
  // - For the root path ("/"), show the public landing page.
  // - For other protected paths, redirect to login (and save their intended location).
  if (!isAuthenticated) {
    if (location.pathname === "/") {
      return <Landing />;
    }
    return <Navigate to="/login" state={{ from: location }} />;
  }

  // If route is project-scoped and user is required to be a member:
  if (projectScoped && user?.role === "Project Staff") {
    const numericId = Number(projectId);

    // Robustly check membership
    if (!user.projects || !user.projects.includes(numericId)) {
      return <Navigate to="/" replace />;
    }
  }

  // Render the protected content if all checks pass.
  return <>{children}</>;
};
