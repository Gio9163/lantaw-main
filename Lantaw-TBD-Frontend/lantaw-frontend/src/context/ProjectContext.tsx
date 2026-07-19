import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { CURRENT_PROJECT } from "../api/constants";
import type { Project } from "../types/project";
import api from "../api/client";
import { normalizeProjectStatus } from "../utils/projectStatusUtils";
import { useAuth } from "./AuthContext";
interface ProjectContextType {
  currentProject: Project | null;
  setCurrentProject: (project: Project) => void;
  clearProject: () => void;
  // Added refetchProject
  refetchProject: (projectId: number) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [currentProject, setCurrentProjectState] = useState<Project | null>(
    () => {
      const saved = localStorage.getItem(CURRENT_PROJECT);
      return saved ? JSON.parse(saved) : null;
    }
  );

  const setCurrentProject = (project: Project) => {
    setCurrentProjectState(project);
    localStorage.setItem(CURRENT_PROJECT, JSON.stringify(project));
  };

  const clearProject = () => {
    setCurrentProjectState(null);
    localStorage.removeItem(CURRENT_PROJECT);
  };

  useEffect(() => {
    const projectId = currentProject?.id;
    if (authLoading || !isAuthenticated || !projectId) return;

    let cancelled = false;
    const refreshCachedProject = async () => {
      try {
        const response = await api.get(`/api/projects/${projectId}/`);
        if (cancelled) return;
        const updatedProject: Project = normalizeProjectStatus(response.data);
        setCurrentProjectState(updatedProject);
        localStorage.setItem(CURRENT_PROJECT, JSON.stringify(updatedProject));
      } catch (error) {
        console.error(`Failed to refresh cached project ID ${projectId}:`, error);
      }
    };

    void refreshCachedProject();
    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, currentProject?.id]);

  // Implementation of refetchProject
  const refetchProject = async (projectId: number): Promise<void> => {
    try {
      const response = await api.get(`/api/projects/${projectId}/`);
      const updatedProject: Project = normalizeProjectStatus(response.data);

      // Use the existing setter which updates both state and localStorage
      setCurrentProject(updatedProject);
    } catch (error) {
      console.error(`Failed to refetch project ID ${projectId}:`, error);
      throw new Error("Failed to load updated project data.");
    }
  };

  return (
    <ProjectContext.Provider
      value={{
        currentProject,
        setCurrentProject,
        clearProject,
        refetchProject,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return context;
};
