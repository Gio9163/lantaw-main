// This service layer abstracts all API calls related to activities.

import api from "../../../api/client";
import type { AxiosResponse } from "axios";
import type { Activity } from "../../../types/activity";
import type { Objective } from "../../../types/objective";
import type { BudgetLineItem } from "../../../types/budgetItem";
import { toBackendStatus, toFrontendStatus } from "../../../utils/projectStatusUtils";

// Response wrapper type (paginated)
interface ApiResponse<T> {
  results: T[];
  count?: number;
  next?: string | null;
  previous?: string | null;
}

const normalizeNextUrl = (url: string): string => {
  if (!/^https?:\/\//i.test(url)) return url;
  const parsed = new URL(url);
  return `${parsed.pathname}${parsed.search}`;
};

const getAllPages = async <T>(initialUrl: string): Promise<T[]> => {
  const results: T[] = [];
  let next: string | null = initialUrl;

  while (next) {
    const res: AxiosResponse<ApiResponse<T> | T[]> = await api.get<
      ApiResponse<T> | T[]
    >(normalizeNextUrl(next));
    if (Array.isArray(res.data)) {
      results.push(...res.data);
      break;
    }
    results.push(...(res.data.results || []));
    next = res.data.next || null;
  }

  return results;
};

// Objectives API 
export const objectivesApi = {
  // Fetch all objectives of a project
  getAll: async (projectId: number): Promise<Objective[]> => {
    return getAllPages<Objective>(`/api/projects/${projectId}/objectives/`);
  },

  // Create a new objective
  create: async (
    projectId: number,
    data: { title: string; description: string }
  ): Promise<Objective> => {
    const res = await api.post<Objective>(
      `/api/projects/${projectId}/objectives/`,
      data
    );
    return res.data;
  },

  // Update an existing objective
  update: async (
    projectId: number,
    objectiveId: number,
    data: { title: string; description: string }
  ): Promise<Objective> => {
    const res = await api.patch<Objective>(
      `/api/projects/${projectId}/objectives/${objectiveId}/`,
      data
    );
    return res.data;
  },

  // Delete an objective
  delete: async (projectId: number, objectiveId: number): Promise<void> => {
    await api.delete(`/api/projects/${projectId}/objectives/${objectiveId}/`);
  },
};

// Activities API
export const activitiesApi = {
  // Fetch all activities of an objective
  getByObjective: async (
    projectId: number,
    objectiveId: number
  ): Promise<Activity[]> => {
    return getAllPages<Activity>(
      `/api/projects/${projectId}/objectives/${objectiveId}/activities/`
    );
  },

  // Create an activity
  create: async (
    projectId: number,
    objectiveId: number,
    data: {
      title: string;
      activity_status: Activity["activity_status"];
      projected_expense: string | null;
      actual_expense: string | null;
      activity_budget_item: number | null;
    }
  ): Promise<Activity> => {
    const res = await api.post<Activity>(
      `/api/projects/${projectId}/objectives/${objectiveId}/activities/`,
      data
    );
    return res.data;
  },

  // Update an activity
  update: async (
    projectId: number,
    objectiveId: number,
    activityId: number,
    data: {
      title: string;
      activity_status: Activity["activity_status"];
      projected_expense: string | null;
      actual_expense: string | null;
      activity_budget_item: number | null;
      description?: string;
    }
  ): Promise<Activity> => {
    const res = await api.patch<Activity>(
      `/api/projects/${projectId}/objectives/${objectiveId}/activities/${activityId}/`,
      data
    );
    return res.data;
  },

  // Delete an activity
  delete: async (
    projectId: number,
    objectiveId: number,
    activityId: number
  ): Promise<void> => {
    await api.delete(
      `/api/projects/${projectId}/objectives/${objectiveId}/activities/${activityId}/`
    );
  },
};

// Budget Line Items API
export const budgetItemsApi = {
  // Fetch all budget line items of a project
  getAll: async (projectId: number): Promise<BudgetLineItem[]> => {
    return getAllPages<BudgetLineItem>(
      `/api/projects/${projectId}/budget-line-items/`
    );
  },
};

import type { Project } from "../../../types/project";

// Projects API (for status updates)
export const projectsApi = {
  // Update project status
  updateStatus: async (
    projectId: number,
    status: string
  ): Promise<Project> => {
    // Convert frontend status format to backend format
    const backendStatus = toBackendStatus(status);
    
    const res = await api.patch<Project>(`/api/projects/${projectId}/`, {
      project_status: backendStatus,
    });
    
    // Convert backend status format to frontend format
    const responseData = res.data;
    responseData.project_status = toFrontendStatus(responseData.project_status) as Project["project_status"];
    
    return responseData;
  },
};
