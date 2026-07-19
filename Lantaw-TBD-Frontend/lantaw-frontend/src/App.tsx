import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Logout from "./pages/Logout";
import Register from "./pages/Register";
import Landing from "./pages/Landing";
import Home from "./pages/Home";
import Activities from "./pages/Activities";
import Analytics from "./pages/Analytics";
import Personnel from "./pages/Personnel";
import Profile from "./pages/Profile";
import ChangeRequests from "./pages/ChangeRequests";
import HistoryLog from "./pages/HistoryLog";
import HistoryArchive from "./pages/HistoryArchive";
import NotFound from "./pages/NotFound";
import PublicProjects from "./pages/PublicProjects";
import RegistrationRequests from "./pages/RegistrationRequests";

import { ProtectedRoute } from "./routes/ProtectedRoute";
import { RoleRoute } from "./routes/RoleRoute";
import { AuthProvider } from "./context/AuthContext";
import { ProjectProvider } from "./context/ProjectContext";
import AppLayout from "./features/layout/components/AppLayout";

function RegisterAndLogout() {
  localStorage.clear();
  return <Register />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ProjectProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/landing" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/logout" element={<Logout />} />
            <Route path="/register" element={<RegisterAndLogout />} />
            <Route path="/projects" element={<PublicProjects />} />

            {/* Protected routes */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Home />} />

              <Route
                path="/activities"
                element={
                  <RoleRoute
                    allowedRoles={["Admin", "Project Staff", "Executive"]}
                  >
                    <Activities />
                  </RoleRoute>
                }
              />

              <Route
                path="/analytics"
                element={
                  <RoleRoute
                    allowedRoles={["Admin", "Project Staff", "Executive"]}
                  >
                    <Analytics />
                  </RoleRoute>
                }
              />

              <Route path="/personnel" element={<Personnel />} />
              <Route path="/profile" element={<Profile />} />

              <Route
                path="/change-requests"
                element={
                  <RoleRoute allowedRoles={["Admin", "Project Staff"]}>
                    <ChangeRequests />
                  </RoleRoute>
                }
              />

              <Route
                path="/history-log"
                element={
                  <RoleRoute
                    allowedRoles={["Admin", "Project Staff", "Executive"]}
                  >
                    <HistoryLog />
                  </RoleRoute>
                }
              />

              <Route
                path="/history-log/archive"
                element={
                  <RoleRoute allowedRoles={["Admin"]}>
                    <HistoryArchive />
                  </RoleRoute>
                }
              />

              <Route
                path="/registration-requests"
                element={
                  <RoleRoute allowedRoles={["Admin"]}>
                    <RegistrationRequests />
                  </RoleRoute>
                }
              />
            </Route>

            {/* Fallback */}
            <Route path="/notfound" element={<NotFound />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ProjectProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;