import { useAuth } from "../context/AuthContext";

export function useRole() {
  const { user } = useAuth();
  return user?.role || null;
}