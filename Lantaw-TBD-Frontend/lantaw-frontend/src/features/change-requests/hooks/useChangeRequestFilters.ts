// Custom hook for managing change request filters.

import { useState, useCallback } from "react";
import type { ChangeRequestFilters } from "../../../types/changeRequest";

export interface UseChangeRequestFiltersReturn {
  filters: ChangeRequestFilters;
  setStatusFilter: (status: ChangeRequestFilters['status']) => void;
  setChangeTypeFilter: (changeType: ChangeRequestFilters['change_type']) => void;
  setOperationFilter: (operation: ChangeRequestFilters['operation']) => void;
  setProjectFilter: (project: ChangeRequestFilters['project']) => void;
  clearFilters: () => void;
}

export const useChangeRequestFilters = (): UseChangeRequestFiltersReturn => {
  const [filters, setFilters] = useState<ChangeRequestFilters>({});

  const setStatusFilter = useCallback((status: ChangeRequestFilters['status']) => {
    setFilters((prev) => ({
      ...prev,
      status: status || undefined,
    }));
  }, []);

  const setChangeTypeFilter = useCallback((changeType: ChangeRequestFilters['change_type']) => {
    setFilters((prev) => ({
      ...prev,
      change_type: changeType || undefined,
    }));
  }, []);

  const setOperationFilter = useCallback((operation: ChangeRequestFilters['operation']) => {
    setFilters((prev) => ({
      ...prev,
      operation: operation || undefined,
    }));
  }, []);

  const setProjectFilter = useCallback((project: ChangeRequestFilters['project']) => {
    setFilters((prev) => ({
      ...prev,
      project: project || undefined,
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  return {
    filters,
    setStatusFilter,
    setChangeTypeFilter,
    setOperationFilter,
    setProjectFilter,
    clearFilters,
  };
};

