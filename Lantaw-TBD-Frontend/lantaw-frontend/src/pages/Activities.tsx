import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ActivitiesLayout from "../features/activities/components/ActivitiesLayout";

function Activities() {
  const { user, loading } = useAuth();

  // Show loading while checking auth
  if (loading) return <div>Loading...</div>;

  // Check if user has required role (Admin, Project Staff, or Executive)
  const allowedRoles = ["Admin", "Project Staff", "Executive"];
  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/notfound" replace />;
  }

  return <ActivitiesLayout />;
}

export default Activities;
