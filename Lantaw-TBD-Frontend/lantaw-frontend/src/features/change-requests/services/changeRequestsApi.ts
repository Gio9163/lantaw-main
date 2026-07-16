// This service layer abstracts all API calls related to change requests.

import api from "../../../api/client";
import type { ChangeRequest, ChangeRequestCreateData, ChangeRequestFilters } from "../../../types/changeRequest";

// Response wrapper type (paginated)
interface ApiResponse<T> {
  results: T[];
  count?: number;
  next?: string | null;
  previous?: string | null;
}

// Helper function to fetch all pages from a paginated API
const fetchAllPages = async <T>(initialUrl: string): Promise<T[]> => {
  const allResults: T[] = [];
  let url: string | null = initialUrl;

  while (url) {
    const res: { data: ApiResponse<T> } = await api.get<ApiResponse<T>>(url);
    const data: ApiResponse<T> = res.data;

    if (data?.results) {
      allResults.push(...data.results);
    }

    // Check if there's a next page
    if (data?.next) {
      const next = data.next;
      if (next.startsWith('http://') || next.startsWith('https://')) {
        try {
          const nextUrl = new URL(next);
          url = nextUrl.pathname + nextUrl.search;
        } catch {
          const match: RegExpMatchArray | null = next.match(/\/api\/.*/);
          url = match ? match[0] : null;
        }
      } else {
        url = next;
      }
    } else {
      url = null;
    }
  }

  return allResults;
};

export const changeRequestsApi = {
  // Fetch all change requests for a project (with optional filters)
  getAll: async (projectId: number, filters?: ChangeRequestFilters): Promise<ChangeRequest[]> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.change_type) params.append('change_type', filters.change_type);
    if (filters?.operation) params.append('operation', filters.operation);
    
    const queryString = params.toString();
    const url = `/api/projects/${projectId}/change-requests/${queryString ? `?${queryString}` : ''}`;
    
    return fetchAllPages<ChangeRequest>(url);
  },

  // Fetch all change requests across all projects (Admin only)
  getAllForAdmin: async (filters?: ChangeRequestFilters): Promise<ChangeRequest[]> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.change_type) params.append('change_type', filters.change_type);
    if (filters?.operation) params.append('operation', filters.operation);
    if (filters?.project) params.append('project', filters.project.toString());
    
    const queryString = params.toString();
    const url = `/api/change-requests/${queryString ? `?${queryString}` : ''}`;
    
    return fetchAllPages<ChangeRequest>(url);
  },

  // Fetch single change request
  getById: async (projectId: number, requestId: number): Promise<ChangeRequest> => {
    const res = await api.get<ChangeRequest>(
      `/api/projects/${projectId}/change-requests/${requestId}/`
    );
    return res.data;
  },

  // Submit new change request
  create: async (projectId: number, data: ChangeRequestCreateData): Promise<ChangeRequest> => {
    const res = await api.post<ChangeRequest>(
      `/api/projects/${projectId}/change-requests/`,
      data
    );
    return res.data;
  },

  // Approve change request
  approve: async (projectId: number, requestId: number): Promise<ChangeRequest> => {
    const res = await api.post<ChangeRequest>(
      `/api/projects/${projectId}/change-requests/${requestId}/approve/`
    );
    return res.data;
  },

  // Reject change request
  reject: async (projectId: number, requestId: number, reason: string): Promise<ChangeRequest> => {
    const res = await api.post<ChangeRequest>(
      `/api/projects/${projectId}/change-requests/${requestId}/reject/`,
      { rejection_reason: reason }
    );
    return res.data;
  },

  // Resubmit change request
  resubmit: async (projectId: number, requestId: number, description: string): Promise<ChangeRequest> => {
    const res = await api.post<ChangeRequest>(
      `/api/projects/${projectId}/change-requests/${requestId}/resubmit/`,
      { description }
    );
    return res.data;
  },

  // Archive change request
  archive: async (projectId: number, requestId: number): Promise<ChangeRequest> => {
    const res = await api.post<ChangeRequest>(
      `/api/projects/${projectId}/change-requests/${requestId}/archive/`
    );
    return res.data;
  },

  // Cancel change request
  cancel: async (projectId: number, requestId: number, reason: string): Promise<ChangeRequest> => {
    const res = await api.post<ChangeRequest>(
      `/api/projects/${projectId}/change-requests/${requestId}/cancel/`,
      { cancel_reason: reason }
    );
    return res.data;
  },
};

