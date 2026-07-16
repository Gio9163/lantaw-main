// Manage all filtering logic for activities.

import { useState, useMemo } from "react";
import type { Activity } from "../../../types/activity";
import type { Objective } from "../../../types/objective";

export interface ActivityFilters {
  searchQuery: string;
  categoryFilter: string;
  statusFilter: string;
  dateFilter: string;
  expenseFilter: string;
}

export interface UseActivityFiltersReturn {
  filters: ActivityFilters;
  setSearchQuery: (query: string) => void;
  setCategoryFilter: (filter: string) => void;
  setStatusFilter: (filter: string) => void;
  setDateFilter: (filter: string) => void;
  setExpenseFilter: (filter: string) => void;
  clearFilters: () => void;
  filterActivities: (activities: Activity[] | undefined) => Activity[];
  filterObjectives: (objective: Objective, activities: Activity[] | undefined) => boolean;
}

// Filter activities based on current filter state
const applyFilters = (activities: Activity[], filters: ActivityFilters): Activity[] => {
  return activities.filter((activity) => {
    // Match activities with title
    const matchesSearch = activity.title
      .toLowerCase()
      .includes(filters.searchQuery.toLowerCase());

    // Match activities with budget_item_name
    const matchesCategory =
      filters.categoryFilter === "all" ||
      activity.budget_item_name === filters.categoryFilter;

    // Match activities with activity_status
    const matchesStatus =
      filters.statusFilter === "all" || activity.activity_status === filters.statusFilter;

    // Match activities with expense status
    const projected = Number(activity.projected_expense || 0);
    const actual = Number(activity.actual_expense || 0);
    const variance = actual - projected; // Positive = Over budget

    const matchesExpense =
      filters.expenseFilter === "all" ||
      (filters.expenseFilter === "over" && variance > 0) || // Actual is higher than projected
      (filters.expenseFilter === "under" && variance <= 0); // Actual is lower or equal

    return matchesSearch && matchesCategory && matchesStatus && matchesExpense;
  });
};

export const useActivityFilters = (): UseActivityFiltersReturn => {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [expenseFilter, setExpenseFilter] = useState("all");

  const filters: ActivityFilters = useMemo(
    () => ({
      searchQuery,
      categoryFilter,
      statusFilter,
      dateFilter,
      expenseFilter,
    }),
    [searchQuery, categoryFilter, statusFilter, dateFilter, expenseFilter]
  );

  const clearFilters = () => {
    setSearchQuery("");
    setCategoryFilter("all");
    setStatusFilter("all");
    setDateFilter("all");
    setExpenseFilter("all");
  };

  const filterActivities = (activities: Activity[] | undefined): Activity[] => {
    if (!activities) return [];
    return applyFilters(activities, filters);
  };

  const filterObjectives = (objective: Objective, activities: Activity[] | undefined): boolean => {
    // If search query is empty, show all objectives
    if (!filters.searchQuery.trim()) {
      return true;
    }

    const searchLower = filters.searchQuery.toLowerCase();

    // Check if objective title or description matches the search query
    const objectiveMatches =
      objective.title.toLowerCase().includes(searchLower) ||
      objective.description.toLowerCase().includes(searchLower);

    // Check if any activities match the search query (after applying all filters)
    const filteredActivities = filterActivities(activities);
    const hasMatchingActivities = filteredActivities.length > 0;

    // Show objective if it matches OR if it has matching activities
    return objectiveMatches || hasMatchingActivities;
  };

  return {
    filters,
    setSearchQuery,
    setCategoryFilter,
    setStatusFilter,
    setDateFilter,
    setExpenseFilter,
    clearFilters,
    filterActivities,
    filterObjectives,
  };
};

