import type { Project } from "../types/project";

/** Backend may return ON_HOLD; frontend uses ONHOLD */
type ProjectWithBackendStatus = Omit<Project, "project_status"> & {
  project_status: Project["project_status"] | "ON_HOLD";
};

/**
 * Normalize project status from backend format (ON_HOLD) to frontend format (ONHOLD)
 */
export const normalizeProjectStatus = (project: ProjectWithBackendStatus): Project => {
  if (project.project_status === "ON_HOLD") {
    return { ...project, project_status: "ONHOLD" as Project["project_status"] };
  }
  return project as Project;
};

/**
 * Normalize an array of projects (backend may return ON_HOLD)
 */
export const normalizeProjects = (projects: ProjectWithBackendStatus[]): Project[] => {
  return projects.map(normalizeProjectStatus);
};

/**
 * Convert frontend status format to backend format
 * Frontend uses "ONHOLD", backend expects "ON_HOLD"
 */
export const toBackendStatus = (status: string): string => {
  return status === "ONHOLD" ? "ON_HOLD" : status;
};

/**
 * Convert backend status format to frontend format
 * Backend returns "ON_HOLD", frontend expects "ONHOLD"
 */
export const toFrontendStatus = (status: string): string => {
  return status === "ON_HOLD" ? "ONHOLD" : status;
};

