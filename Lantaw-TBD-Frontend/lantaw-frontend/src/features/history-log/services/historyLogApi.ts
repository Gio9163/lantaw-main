// This service layer abstracts all API calls related to history log.

import api from "../../../api/client";
import type { HistoryLog, HistoryLogFilters, ApiResponse } from "../../../types/historyLog";

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

export const historyLogApi = {
  // Fetch all history log entries (with optional filters)
  getAll: async (filters?: HistoryLogFilters): Promise<HistoryLog[]> => {

    const params = new URLSearchParams();
    if (filters?.project) params.append("project", filters.project.toString());
    if (filters?.change_type) params.append("change_type", filters.change_type);
    if (filters?.action) params.append("action", filters.action);
    if (filters?.search) params.append("search", filters.search);
    
    const queryString = params.toString();
    const url = `/api/history-log/${queryString ? `?${queryString}` : ''}`;
    
    return fetchAllPages<HistoryLog>(url);
  },

  // Fetch single history log entry
  getById: async (entryId: number): Promise<HistoryLog> => {
    const res = await api.get<HistoryLog>(
      `/api/history-log/${entryId}/`
    );
    return res.data;
  },

  // Revert a history log entry (Admin only)
  revert: async (entryId: number): Promise<HistoryLog> => {
    const res = await api.post<HistoryLog>(
      `/api/history-log/${entryId}/revert/`
    );
    return res.data;
  },

  // Archive a history log entry (soft delete) (Admin only)
  archive: async (entryId: number): Promise<HistoryLog> => {
    const res = await api.post<HistoryLog>(
      `/api/history-log/${entryId}/archive/`
    );
    return res.data;
  },

  // Permanently delete an archived history log entry (Admin only)
  permanentDeleteArchive: async (archivedEntryId: number): Promise<void> => {
    await api.delete(`/api/history-log/archive/${archivedEntryId}/permanent-delete/`);
  },

  // Restore archived history entry (already exists in backend via restore action)
  restoreArchive: async (archivedEntryId: number): Promise<HistoryLog> => {
    const res = await api.post<HistoryLog>(
      `/api/history-log/archive/${archivedEntryId}/restore/`
    );
    return res.data;
  },

  getArchive: async (filters?: HistoryLogFilters): Promise<HistoryLog[]> => {

    const params = new URLSearchParams();
    if (filters?.project) params.append("project", filters.project.toString());
    if (filters?.change_type) params.append("change_type", filters.change_type);
    if (filters?.action) params.append("action", filters.action);
    if (filters?.search) params.append("search", filters.search);

    const queryString = params.toString();
    const url = `/api/history-log/archive/${queryString ? `?${queryString}` : ''}`;
    return fetchAllPages<HistoryLog>(url);
  },
};
