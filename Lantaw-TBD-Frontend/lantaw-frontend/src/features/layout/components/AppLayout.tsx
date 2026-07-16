import React, { useState, useEffect } from "react";
import { NavLink, useLocation, Outlet, useNavigate } from "react-router-dom";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  useSidebar,
} from "./Sidebar";
import { useIsMobile } from "../../../components/common/use-mobile";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "../../../components/common/collapsible";
import { Button } from "../../../components/common/button";
import { useAuth } from "../../../context/AuthContext";
import {
  LayoutDashboard,
  Activity,
  Users,
  UserCircle,
  FolderOpen,
  ChevronDown,
  Eye,
  Plus,
  FileText,
  LogOut,
  History,
  BarChart3,
} from "lucide-react";
import api from "../../../api/client";
import { useProject } from "../../../context/ProjectContext";
import { CURRENT_PROJECT } from "../../../api/constants";
import ProjectModal from "../components/ProjectModal";
import type { Project } from "../../../types/project";
import { normalizeProjects } from "../../../utils/projectStatusUtils";

function MobileSidebarOverlay() {
  const { open, setOpen } = useSidebar();
  const isMobile = useIsMobile();
  if (!isMobile || !open) return null;
  return (
    <div
      className="fixed inset-0 z-[9] bg-black/50"
      onClick={() => setOpen(false)}
      aria-hidden="true"
    />
  );
}

const AppLayout: React.FC<{ children?: React.ReactNode }> = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);
  const [projects, setProjects] = useState<Project[]>([]);
  const { currentProject, setCurrentProject, clearProject } = useProject();
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] =
    useState(false);
  const [createProjectError, setCreateProjectError] = useState("");
  const [createProjectForm, setCreateProjectForm] = useState({
    name: "",
    projectLeader: "",
    description: "",
    duration: "",
    startDate: "",
    endDate: "",
    totalGrant: "",
    projectStaff: "",
  });
  const [createProjectBudgetItems, setCreateProjectBudgetItems] = useState<{
    ps: Array<{ id?: number; category: 'PS' | 'MOOE' | 'CO'; description: string; amount: string }>;
    mooe: Array<{ id?: number; category: 'PS' | 'MOOE' | 'CO'; description: string; amount: string }>;
    co: Array<{ id?: number; category: 'PS' | 'MOOE' | 'CO'; description: string; amount: string }>;
  }>({
    ps: [],
    mooe: [],
    co: [],
  });

  // Helper function to check if  the staff exists in the database  first
  const checkStaffExists = async (email: string): Promise<boolean> => {
    if (!email.trim()) return false;
    try {
      const staffRes = await api.get(`/api/users/check/?email=${encodeURIComponent(email.trim())}`);
      return staffRes.data.exists === true;
    } catch (err) {
      console.error("Failed to lookup staff:", err);
      // Return false so we can show in the UI
      return false;
    }
  };

  const handleCreateProject = async () => {
    if (user?.role !== "Project Staff") {
      setCreateProjectError("You are not authorized to create projects.");
      return;
    }

    setCreateProjectError("");

    if (!createProjectForm.projectLeader.trim()) {
      setCreateProjectError("Project leader is required.");
      return;
    }
    if (!createProjectForm.name.trim()) {
      setCreateProjectError("Project name is required.");
      return;
    }
    if (!createProjectForm.projectStaff.trim()) {
      setCreateProjectError("Project staff email is required.");
      return;
    }

    try {
      // Check if staff exists
      const staffRes = await api.get(
        `/api/users/check/?email=${encodeURIComponent(createProjectForm.projectStaff.trim())}`
      );

      if (!staffRes.data.exists) {
        setCreateProjectError(
          "Staff does not exist. Please enter a valid email."
        );
        return;
      }

      // Transform budget items to API format
      const budgetItemsPayload = [
        ...createProjectBudgetItems.ps.map(item => ({
          category: item.category,
          description: item.description,
          amount: item.amount,
        })),
        ...createProjectBudgetItems.mooe.map(item => ({
          category: item.category,
          description: item.description,
          amount: item.amount,
        })),
        ...createProjectBudgetItems.co.map(item => ({
          category: item.category,
          description: item.description,
          amount: item.amount,
        })),
      ];
      
      // Create project
      const projectPayload = {
        name: createProjectForm.name,
        project_leader: createProjectForm.projectLeader,
        description: createProjectForm.description,
        date_start: createProjectForm.startDate,
        date_end: createProjectForm.endDate,
        grant_amount: parseFloat(createProjectForm.totalGrant) || 0,
        budget_items: budgetItemsPayload,
      };

      // The backend converts this protected write into a pending Change Request.
      await api.post("/api/projects/", projectPayload);

      // Reset & close modal
      setIsCreateProjectModalOpen(false);
      setCreateProjectForm({
        name: "",
        projectLeader: "",
        description: "",
        duration: "",
        startDate: "",
        endDate: "",
        totalGrant: "",
        projectStaff: "",
      });
      setCreateProjectBudgetItems({ ps: [], mooe: [], co: [] });
      setCreateProjectError("");
    } catch (err) {
      console.error("Failed to create project:", err);
      setCreateProjectError("Something went wrong. Please try again.");
    }
  };

  const location = useLocation();

  // Sidebar menu items
  const allMenuItems = [
    { name: "Overview", icon: LayoutDashboard, path: "/" },
    { name: "Activities", icon: Activity, path: "/activities" },
    { name: "Analytics", icon: BarChart3, path: "/analytics" },
    { name: "Personnel", icon: Users, path: "/personnel" },
    // Change Requests available for Admin and Project Staff
    ...(user?.role === "Admin" || user?.role === "Project Staff" 
      ? [{ name: "Change Requests", icon: FileText, path: "/change-requests" }] 
      : []),
    // History Log available for all user types
    { name: "History Log", icon: History, path: "/history-log" },
    { name: "Profile", icon: UserCircle, path: "/profile" },
  ];

  // Use all menu items (no filtering needed - route protection handles access)
  const menuItems = allMenuItems;

  // Helper: status color
  const getProjectStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-500";
      case "ONHOLD":
        return "bg-gray-400";
      case "COMPLETED":
        return "bg-blue-500";
      default:
        return "bg-gray-400";
    }
  };

  // Fetch user's projects
  useEffect(() => {
    const fetchProjects = async () => {
      if (!user) return;

      try {
        let projectData: Project[] = [];
        
        // For Executives and Admins, fetch all projects from /api/projects/
        if (user.role === "Executive" || user.role === "Admin") {
          const response = await api.get("/api/projects/");
          // Handle paginated response (Django REST Framework returns { results: [...] })
          const raw = Array.isArray(response.data)
            ? response.data
            : (response.data.results || []);
          projectData = normalizeProjects(raw);
          setProjects(projectData);
          // Clear currentProject if no projects exist
          if (projectData.length === 0) {
            clearProject();
            return;
          }
        }
        // For Project Staff, fetch from user.projects array
        else if (user.role === "Project Staff" && user.projects?.length) {
          const responses = await Promise.all(
            user.projects.map((id) => api.get(`/api/projects/${id}/`))
          );
          projectData = normalizeProjects(responses.map((res) => res.data));
          setProjects(projectData);
          // Clear currentProject if no projects exist
          if (projectData.length === 0) {
            clearProject();
            return;
          }
        } else if (user.role === "Project Staff") {
          // Project Staff with no projects - clear current project and set empty array
          setProjects([]);
          clearProject();
          return;
        } else {
          // Ensure projects is always an array
          setProjects([]);
          clearProject();
          return;
        }

        // Restore saved project if it exists and is in the fetched projects
        if (projectData.length > 0) {
          // Get saved project from localStorage
          const savedProjectJson = localStorage.getItem(CURRENT_PROJECT);
          if (savedProjectJson) {
            try {
              const savedProject = JSON.parse(savedProjectJson);
              // Try to find the saved project in the fetched projects
              const foundProject = projectData.find(p => p.id === savedProject.id);
              if (foundProject) {
                // Update the saved project with fresh data from server
                setCurrentProject(foundProject);
                return; // Don't set to first project
              }
            } catch {
              // Invalid JSON in localStorage, ignore and fall through
            }
          }
          // No saved project or saved project not found, use first project
          // Only set if currentProject is null to avoid overwriting user selection
          if (!currentProject) {
            setCurrentProject(projectData[0]);
          }
        }
      } catch (error) {
        console.error("Failed to fetch projects:", error);
        // Set empty array on error to prevent map errors
        setProjects([]);
      }
    };

    fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Handle logout
  const handleLogout = async () => {
    await logout();
    navigate("/landing");
  };

  // Determine current page title based on route path
  const currentPage =
    menuItems.find((item) => item.path === location.pathname)?.name ||
    "Dashboard";

  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <MobileSidebarOverlay />
      <Sidebar>
        {/* Sidebar Header */}
        <SidebarHeader>
          <div className="flex items-center gap-2 px-4 py-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold">
              <Eye />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold">Lantaw</span>
            </div>
          </div>
        </SidebarHeader>

        {/* Sidebar Content */}
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {/* Map over menu items */}
                {menuItems.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton asChild tooltip={item.name}>
                      <NavLink to={item.path}>
                        <item.icon />
                        <span>{item.name}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
                {/* Logout button */}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={handleLogout}
                    tooltip="Logout"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {/* Sidebar Footer (Projects) */}
        <SidebarFooter className="border-t">
          {/* Projects Section */}
          <Collapsible>
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger className="group/collapsible w-full flex items-center justify-between p-2 text-sm font-medium hover:bg-sidebar-accent rounded-md">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 shrink-0" />
                    <span className="group-data-[collapsible=icon]:hidden">
                      Projects
                    </span>
                  </div>
                  <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180 group-data-[collapsible=icon]:hidden" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>

              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {/* Create Project Button */}
                    {user?.role === "Project Staff" && (
                      <>
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild tooltip="Create Project">
                            <Button
                              variant="outline"
                              className="w-full justify-start text-xs mb-2 group-data-[collapsible=icon]:justify-center"
                              onClick={() => setIsCreateProjectModalOpen(true)}
                            >
                              <Plus className="h-3 w-3 mr-2 group-data-[collapsible=icon]:mr-0" />
                              <span className="group-data-[collapsible=icon]:hidden">
                                Create Project
                              </span>
                            </Button>
                          </SidebarMenuButton>
                        </SidebarMenuItem>

                        <ProjectModal
                          open={isCreateProjectModalOpen}
                          onOpenChange={setIsCreateProjectModalOpen}
                          initialBudgetItems={createProjectBudgetItems}
                          onBudgetItemsChange={setCreateProjectBudgetItems}
                          formData={createProjectForm}
                          setFormData={setCreateProjectForm}
                          onSubmit={handleCreateProject}
                          checkStaffExists={checkStaffExists}
                          userRole={user?.role}
                          error={createProjectError}
                        />
                      </>
                    )}

                    {/* Dynamically Render User's Projects */}
                    {projects.length === 0 && user?.role === "Project Staff" ? (
                      <SidebarMenuItem>
                        <SidebarMenuButton disabled tooltip="No project">
                          <span className="text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
                            No project
                          </span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ) : (
                      projects.map((project) => (
                        <SidebarMenuItem key={project.id}>
                          <SidebarMenuButton
                            asChild
                            isActive={currentProject?.id === project.id}
                            tooltip={project.name}
                          >
                            <Button
                              variant="ghost"
                              className="w-full justify-start text-xs"
                              onClick={() => setCurrentProject(project)}
                            >
                              <div
                                className={`w-2 h-2 rounded-full ${getProjectStatusColor(
                                  project.project_status
                                )} shrink-0`}
                              />
                              <span className="truncate group-data-[collapsible=icon]:hidden">
                                {project.name}
                              </span>
                            </Button>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))
                    )}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        </SidebarFooter>
      </Sidebar>

      {/* Main Content Area */}
      <SidebarInset className="min-h-0">
        {/* Header with sidebar toggle */}
        <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4 min-w-0">
          <SidebarTrigger />

          {/* Title and breadcrumb inline */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <h1 className="text-lg font-semibold truncate">{currentPage}</h1>
            <span className="text-muted-foreground shrink-0">•</span>
            <span className="text-sm text-muted-foreground truncate">
              {currentProject?.name || "No Project Selected"}
            </span>
          </div>
        </header>

        {/* Main content area — page content */}
        <main className="flex-1 min-h-0 overflow-auto p-4 sm:p-6 bg-gray-50">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default AppLayout;
