import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { jwtDecode } from "jwt-decode";
import type { User } from "../types/user";
import api from "../api/client";

// Context object type
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  setTokens: (access: string, refresh: string) => void;
  logout: () => void;
}

// Default context
const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  loading: true,
  accessToken: null,
  refreshToken: null,
  setTokens: () => {},
  logout: () => {},
});

// Provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Initialize state
  const [accessToken, setAccessToken] = useState<string | null>(
    localStorage.getItem("access")
  );
  const [refreshToken, setRefreshToken] = useState<string | null>(
    localStorage.getItem("refresh")
  );
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Decode JWT token
  const decodeToken = useCallback((token: string) => {
    try {
      const decoded: any = jwtDecode(token);
      return decoded;
    } catch (err) {
      console.error("❌ Invalid token: ", err);
      return null;
    }
  }, []);

  // Logout
  const logout = useCallback(async () => {
    // Call logout API to update last_login before clearing tokens
    if (accessToken) {
      try {
        await api.post("/api/logout/", {}, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
      } catch (err) {
        // Continue with logout even if API call fails
        console.error("Logout API call failed:", err);
      }
    }
    
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem("user");
    setLoading(false);
  }, [accessToken]);

  // Fetch user profile
  const fetchUserProfile = useCallback(async (token: string) => {
    try {
      // TODO: Why not use our local function here?
      const decoded: any = decodeToken(token);
      const userId = decoded.user_id;
      if (!userId) throw new Error("❌ JWT does not contain user id");

      const res = await api.get(`/api/users/${userId}/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setUser(res.data);
    } catch (err: any) {
      console.error(
        "❌ Error fetching user profile: ",
        err.response?.data || err.message
      );
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh access token
  const refreshAccessToken = useCallback(async () => {
    if (!refreshToken) return;

    try {
      const res = await api.post(`/api/token/refresh/`, {
        refresh: refreshToken,
      });

      const newAccess = res.data.access;

      setAccessToken(newAccess);
      localStorage.setItem("access", newAccess);

      await fetchUserProfile(newAccess);
    } catch (err: any) {
      console.error(
        "❌ Token refresh failed: ",
        err.response?.data || err.message
      );
      logout();
    } finally {
      setLoading(false);
    }
  }, [refreshToken, fetchUserProfile, logout]);

  // Initialize authentication
  useEffect(() => {
    const initAuth = async () => {
      if (accessToken) {
        const decoded: any = decodeToken(accessToken);
        const now = Date.now() / 1000;

        if (decoded?.exp && decoded.exp < now) {
          await refreshAccessToken();
        } else {
          await fetchUserProfile(accessToken);
        }
      } else if (refreshToken) {
        await refreshAccessToken();
      } else {
        setUser(null);
        setLoading(false);
      }
    };
    initAuth();
  }, [
    accessToken,
    refreshToken,
    decodeToken,
    refreshAccessToken,
    fetchUserProfile,
  ]);

  // Listen for token refresh events from API interceptor
  useEffect(() => {
    const handleTokenRefresh = (event: CustomEvent) => {
      const newAccessToken = event.detail?.access;
      if (newAccessToken) {
        setAccessToken(newAccessToken);
        // Re-fetch user profile with new token
        fetchUserProfile(newAccessToken);
      }
    };

    window.addEventListener('tokenRefreshed', handleTokenRefresh as EventListener);
    return () => {
      window.removeEventListener('tokenRefreshed', handleTokenRefresh as EventListener);
    };
  }, [fetchUserProfile]);

  // Persist tokens to localStorage
  useEffect(() => {
    if (accessToken) localStorage.setItem("access", accessToken);
    else localStorage.removeItem("access");

    if (refreshToken) localStorage.setItem("refresh", refreshToken);
    else localStorage.removeItem("refresh");
  }, [accessToken, refreshToken]);

  // Set tokens
  const setTokens = (access: string, refresh: string) => {
    setAccessToken(access);
    setRefreshToken(refresh);
    localStorage.setItem("access", access);
    localStorage.setItem("refresh", refresh);
  };

  // Context value
  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        accessToken,
        refreshToken,
        setTokens,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
