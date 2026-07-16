// Custom hook for managing change requests data fetching and mutations.

import { useState, useEffect, useCallback } from "react";
import type { ChangeRequest, ChangeRequestCreateData, ChangeRequestFilters } from "../../../types/changeRequest";
import { changeRequestsApi } from "../services/changeRequestsApi";
import { useAuth } from "../../../context/AuthContext";

interface UseChangeRequestsReturn {
  // Data
  changeRequests: ChangeRequest[];
  
  // Loading states
  loading: boolean;
  
  // Operations
  fetchChangeRequests: (projectId?: number, filters?: ChangeRequestFilters) => Promise<void>;
  fetchChangeRequestById: (projectId: number, requestId: number) => Promise<ChangeRequest | null>;
  createChangeRequest: (projectId: number, data: ChangeRequestCreateData) => Promise<void>;
  approveChangeRequest: (projectId: number, requestId: number) => Promise<void>;
  rejectChangeRequest: (projectId: number, requestId: number, reason: string) => Promise<void>;
  resubmitChangeRequest: (projectId: number, requestId: number, description: string) => Promise<void>;
  archiveChangeRequest: (projectId: number, requestId: number) => Promise<void>;
  cancelChangeRequest: (projectId: number, requestId: number, reason: string) => Promise<void>;
  
  // Error handling
  error: Error | null;
}

export const useChangeRequests = (projectId?: number | null): UseChangeRequestsReturn => {
  const { user } = useAuth();
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch change requests
  const fetchChangeRequests = useCallback(async (
    specificProjectId?: number,
    filters?: ChangeRequestFilters
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      let data: ChangeRequest[];
      
      // Admin can fetch all requests, Project Staff only their own
      if (user?.role === "Admin") {
        // Use admin endpoint if no specific project, otherwise use project endpoint
        if (specificProjectId) {
          data = await changeRequestsApi.getAll(specificProjectId, filters);
        } else {
          data = await changeRequestsApi.getAllForAdmin(filters);
        }
      } else {
        // Project Staff: use top-level endpoint which filters by submitted_by automatically
        // This ensures they only see their own requests
        data = await changeRequestsApi.getAllForAdmin(filters);
      }
      
      setChangeRequests(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to fetch change requests");
      setError(error);
      console.error("Failed to fetch change requests:", err);
    } finally {
      setLoading(false);
    }
  }, [user, projectId]);

  // Fetch single change request
  const fetchChangeRequestById = useCallback(async (
    targetProjectId: number,
    requestId: number
  ): Promise<ChangeRequest | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await changeRequestsApi.getById(targetProjectId, requestId);
      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to fetch change request");
      setError(error);
      console.error("Failed to fetch change request:", err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Create change request
  const createChangeRequest = useCallback(async (
    targetProjectId: number,
    data: ChangeRequestCreateData
  ) => {
    setError(null);
    try {
      const newRequest = await changeRequestsApi.create(targetProjectId, data);
      setChangeRequests((prev) => [newRequest, ...prev]);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to create change request");
      setError(error);
      console.error("Failed to create change request:", err);
      throw error;
    }
  }, []);

  // Approve change request
  const approveChangeRequest = useCallback(async (
    targetProjectId: number,
    requestId: number
  ) => {
    setError(null);
    try {
      const updatedRequest = await changeRequestsApi.approve(targetProjectId, requestId);
      setChangeRequests((prev) =>
        prev.map((req) => (req.id === requestId ? updatedRequest : req))
      );
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to approve change request");
      setError(error);
      console.error("Failed to approve change request:", err);
      throw error;
    }
  }, []);

  // Reject change request
  const rejectChangeRequest = useCallback(async (
    targetProjectId: number,
    requestId: number,
    reason: string
  ) => {
    setError(null);
    try {
      const updatedRequest = await changeRequestsApi.reject(targetProjectId, requestId, reason);
      setChangeRequests((prev) =>
        prev.map((req) => (req.id === requestId ? updatedRequest : req))
      );
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to reject change request");
      setError(error);
      console.error("Failed to reject change request:", err);
      throw error;
    }
  }, []);

  // Cancel change request
  const resubmitChangeRequest = useCallback(async (
    targetProjectId: number,
    requestId: number,
    description: string
  ) => {
    setError(null);
    try {
      const updatedRequest = await changeRequestsApi.resubmit(targetProjectId, requestId, description);
      setChangeRequests((prev) =>
        prev.map((req) => (req.id === requestId ? updatedRequest : req))
      );
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to resubmit change request");
      setError(error);
      console.error("Failed to resubmit change request:", err);
      throw error;
    }
  }, []);

  const archiveChangeRequest = useCallback(async (
    targetProjectId: number,
    requestId: number
  ) => {
    setError(null);
    try {
      const updatedRequest = await changeRequestsApi.archive(targetProjectId, requestId);
      setChangeRequests((prev) =>
        prev.map((req) => (req.id === requestId ? updatedRequest : req))
      );
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to archive change request");
      setError(error);
      console.error("Failed to archive change request:", err);
      throw error;
    }
  }, []);

  const cancelChangeRequest = useCallback(async (
    targetProjectId: number,
    requestId: number,
    reason: string
  ) => {
    setError(null);
    try {
      const updatedRequest = await changeRequestsApi.cancel(targetProjectId, requestId, reason);
      setChangeRequests((prev) =>
        prev.map((req) => (req.id === requestId ? updatedRequest : req))
      );
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to cancel change request");
      setError(error);
      console.error("Failed to cancel change request:", err);
      throw error;
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    if (projectId || user?.role === "Admin") {
      fetchChangeRequests(projectId || undefined);
    }
  }, [projectId, user?.role, fetchChangeRequests]);

  return {
    changeRequests,
    loading,
    fetchChangeRequests,
    fetchChangeRequestById,
    createChangeRequest,
    approveChangeRequest,
    rejectChangeRequest,
    resubmitChangeRequest,
    archiveChangeRequest,
    cancelChangeRequest,
    error,
  };
};

