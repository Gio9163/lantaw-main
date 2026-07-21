// This custom hook manages all objectives and activities-related data fetching and mutations.
/**
  It encapsulates:
  - Objectives fetching and CRUD operations
  - Activities fetching and CRUD operations
  - Budget items fetching
  - Loading states
  - Error handling
 */

import { useState, useEffect, useCallback } from "react";
import type { Activity } from "../../../types/activity";
import type { Objective } from "../../../types/objective";
import type { BudgetLineItem } from "../../../types/budgetItem";
import {
  objectivesApi,
  activitiesApi,
  budgetItemsApi,
} from "../services/activitiesApi";

const getObjectiveStatus = (activities: Activity[]): Objective["objective_status"] => {
  if (!activities.length) return "NOT_STARTED";

  const hasCompleted = activities.some(
    (activity) => activity.activity_status === "COMPLETED"
  );
  const allCompleted = activities.every(
    (activity) => activity.activity_status === "COMPLETED"
  );

  if (allCompleted) return "COMPLETED";
  if (hasCompleted) return "IN_PROGRESS";

  return "NOT_STARTED";
};

const shouldFetchActivities = (
  activitiesMap: ActivitiesMap,
  objectiveId: number,
  force = false
) => force || !Object.prototype.hasOwnProperty.call(activitiesMap, objectiveId);

interface ActivitiesMap {
  [key: number]: Activity[];
}

interface UseActivitiesReturn {
  // Data
  objectives: Objective[];
  activitiesMap: ActivitiesMap;
  budgetLineItems: BudgetLineItem[];

  // Loading states
  loadingObjectives: boolean;
  loadingActivities: Record<number, boolean>;
  loadingBudgetItems: boolean;

  // Objectives operations
  fetchObjectives: () => Promise<void>;
  createObjective: (data: { title: string; description: string }) => Promise<void>;
  updateObjective: (id: number, data: { title: string; description: string }) => Promise<void>;
  deleteObjective: (id: number) => Promise<void>;

  // Activities operations
  fetchActivities: (objectiveId: number, options?: { force?: boolean }) => Promise<void>;
  createActivity: (
    objectiveId: number,
    data: {
      title: string;
      activity_status: Activity["activity_status"];
      projected_expense: string | null;
      actual_expense: string | null;
      activity_budget_item: number | null;
    }
  ) => Promise<void>;
  updateActivity: (
    objectiveId: number,
    activityId: number,
    data: {
      title: string;
      activity_status: Activity["activity_status"];
      projected_expense: string | null;
      actual_expense: string | null;
      activity_budget_item: number | null;
    }
  ) => Promise<void>;
  deleteActivity: (objectiveId: number, activityId: number) => Promise<void>;
  addExpense: (
    objectiveId: number,
    activityId: number,
    additionalAmount: number,
    description: string
  ) => Promise<void>;

  // Budget item operations
  fetchBudgetItems: () => Promise<void>;

  // Error handling
  error: Error | null;
}

export const useActivities = (projectId: number | null): UseActivitiesReturn => {
  // State
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [activitiesMap, setActivitiesMap] = useState<ActivitiesMap>({});
  const [budgetLineItems, setBudgetLineItems] = useState<BudgetLineItem[]>([]);

  // Loading states
  const [loadingObjectives, setLoadingObjectives] = useState(false);
  const [loadingActivities, setLoadingActivities] = useState<Record<number, boolean>>({});
  const [loadingBudgetItems, setLoadingBudgetItems] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const dispatchActivitiesChanged = useCallback(
    (objectiveId?: number) => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("lantaw:activities-updated", {
            detail: { projectId, objectiveId },
          })
        );
      }
    },
    [projectId]
  );

  const fetchObjectives = useCallback(async () => {
    if (!projectId) return;

    setLoadingObjectives(true);
    setError(null);
    try {
      const data = await objectivesApi.getAll(projectId);
      const nextActivitiesMap = Object.fromEntries(
        data.map((objective) => [objective.id, objective.activities || []])
      );

      setObjectives(
        data.map((objective) => ({
          ...objective,
          activities: objective.activities || [],
        }))
      );
      setActivitiesMap(nextActivitiesMap);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to fetch objectives");
      setError(error);
      console.error("Failed to fetch objectives:", err);
    } finally {
      setLoadingObjectives(false);
    }
  }, [projectId]);

  const fetchActivities = useCallback(
    async (objectiveId: number, options?: { force?: boolean }) => {
      if (!projectId) return;

      const force = options?.force ?? false;

      if (!shouldFetchActivities(activitiesMap, objectiveId, force)) return;

      setLoadingActivities((prev) => ({ ...prev, [objectiveId]: true }));
      setError(null);

      try {
        const data = await activitiesApi.getByObjective(projectId, objectiveId);
        setActivitiesMap((prev) => ({
          ...prev,
          [objectiveId]: data,
        }));

        // Keep objective_status in sync for any UI consuming it.
        setObjectives((prev) =>
          prev.map((objective) =>
            objective.id === objectiveId
              ? {
                  ...objective,
                  activities: data,
                  objective_status: getObjectiveStatus(data),
                }
              : objective
          )
        );
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to fetch activities");
        setError(error);
        console.error("Failed to fetch activities:", err);
      } finally {
        setLoadingActivities((prev) => ({ ...prev, [objectiveId]: false }));
      }
    },
    [projectId, activitiesMap]
  );

  const fetchBudgetItems = useCallback(async () => {
    if (!projectId) return;

    setLoadingBudgetItems(true);
    setError(null);
    try {
      const data = await budgetItemsApi.getAll(projectId);
      setBudgetLineItems(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to fetch budget items");
      setError(error);
      console.error("Failed to fetch budget items", err);
    } finally {
      setLoadingBudgetItems(false);
    }
  }, [projectId]);

  const createObjective = useCallback(
    async (data: { title: string; description: string }) => {
      if (!projectId) return;

      setError(null);
      try {
        const newObjective = await objectivesApi.create(projectId, data);
        setObjectives((prev) => [...prev, { ...newObjective }]);

        dispatchActivitiesChanged();
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to create objective");
        setError(error);
        console.error("Failed to create objective:", err);
        throw error;
      }
    },
    [projectId, dispatchActivitiesChanged]
  );

  const updateObjective = useCallback(
    async (id: number, data: { title: string; description: string }) => {
      if (!projectId) return;

      setError(null);
      try {
        const updatedObjective = await objectivesApi.update(projectId, id, data);
        setObjectives((prev) => prev.map((obj) => (obj.id === updatedObjective.id ? { ...updatedObjective } : obj)));

        dispatchActivitiesChanged();
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to update objective");
        setError(error);
        console.error("Failed to update objective:", err);
        throw error;
      }
    },
    [projectId, dispatchActivitiesChanged]
  );

  const deleteObjective = useCallback(
    async (id: number) => {
      if (!projectId) return;

      setError(null);
      try {
        await objectivesApi.delete(projectId, id);
        setObjectives((prev) => prev.filter((obj) => obj.id !== id));
        dispatchActivitiesChanged();

        setActivitiesMap((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to delete objective");
        setError(error);
        console.error("Failed to delete objective:", err);
        throw error;
      }
    },
    [projectId, dispatchActivitiesChanged]
  );

  const createActivity = useCallback(
    async (
      objectiveId: number,
      data: {
        title: string;
        activity_status: Activity["activity_status"];
        projected_expense: string | null;
        actual_expense: string | null;
        activity_budget_item: number | null;
      }
    ) => {
      if (!projectId) return;

      setError(null);
      try {
        const newActivity = await activitiesApi.create(projectId, objectiveId, data);

        // Mutate local activitiesMap first
        const nextActivities = [
          ...(activitiesMap[objectiveId] || []),
          newActivity,
        ];

        setActivitiesMap((prev) => ({
          ...prev,
          [objectiveId]: nextActivities,
        }));

        setObjectives((prev) =>
          prev.map((objective) =>
            objective.id === objectiveId
              ? {
                  ...objective,
                  activities: nextActivities,
                  objective_status: getObjectiveStatus(nextActivities),
                }
              : objective
          )
        );

        dispatchActivitiesChanged(objectiveId);
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to create activity");
        setError(error);
        console.error("Failed to create activity:", err);
        throw error;
      }
    },
    [projectId, activitiesMap, dispatchActivitiesChanged]
  );

  const updateActivity = useCallback(
    async (
      objectiveId: number,
      activityId: number,
      data: {
        title: string;
        activity_status: Activity["activity_status"];
        projected_expense: string | null;
        actual_expense: string | null;
        activity_budget_item: number | null;
      }
    ) => {
      if (!projectId) return;

      setError(null);
      try {
        const updatedActivity = await activitiesApi.update(
          projectId,
          objectiveId,
          activityId,
          data
        );

        const nextActivities = (activitiesMap[objectiveId] || []).map((activity) =>
          activity.id === updatedActivity.id ? updatedActivity : activity
        );

        setActivitiesMap((prev) => ({
          ...prev,
          [objectiveId]: nextActivities,
        }));

        setObjectives((prev) =>
          prev.map((objective) =>
            objective.id === objectiveId
              ? {
                  ...objective,
                  activities: nextActivities,
                  objective_status: getObjectiveStatus(nextActivities),
                }
              : objective
          )
        );

        dispatchActivitiesChanged(objectiveId);
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to update activity");
        setError(error);
        console.error("Failed to update activity:", err);
        throw error;
      }
    },
    [projectId, activitiesMap, dispatchActivitiesChanged]
  );

  const deleteActivity = useCallback(
    async (objectiveId: number, activityId: number) => {
      if (!projectId) return;

      setError(null);
      try {
        await activitiesApi.delete(projectId, objectiveId, activityId);

        const nextActivities = (activitiesMap[objectiveId] || []).filter(
          (activity) => activity.id !== activityId
        );

        setActivitiesMap((prev) => ({
          ...prev,
          [objectiveId]: nextActivities,
        }));

        setObjectives((prev) =>
          prev.map((objective) =>
            objective.id === objectiveId
              ? {
                  ...objective,
                  activities: nextActivities,
                  objective_status: getObjectiveStatus(nextActivities),
                }
              : objective
          )
        );

        dispatchActivitiesChanged(objectiveId);
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to delete activity");
        setError(error);
        console.error("Failed to delete activity:", err);
        throw error;
      }
    },
    [projectId, activitiesMap, dispatchActivitiesChanged]
  );

  const addExpense = useCallback(
    async (
      objectiveId: number,
      activityId: number,
      additionalAmount: number,
      description: string
    ) => {
      if (!projectId) return;

      setError(null);
      try {
        const currentActivity = activitiesMap[objectiveId]?.find(
          (act) => act.id === activityId
        );

        if (!currentActivity) {
          throw new Error("Activity not found");
        }

        const currentExpense = Number(currentActivity.actual_expense || 0);
        const newTotalExpense = currentExpense + additionalAmount;

        const updatedActivity = await activitiesApi.update(
          projectId,
          objectiveId,
          activityId,
          {
            title: currentActivity.title,
            activity_status: currentActivity.activity_status,
            activity_budget_item: currentActivity.activity_budget_item ?? null,
            projected_expense: currentActivity.projected_expense,
            actual_expense: newTotalExpense.toString(),
            description,
          }
        );

        const nextActivities = (activitiesMap[objectiveId] || []).map((act) =>
          act.id === updatedActivity.id ? updatedActivity : act
        );

        setActivitiesMap((prev) => ({
          ...prev,
          [objectiveId]: nextActivities,
        }));

        setObjectives((prev) =>
          prev.map((objective) =>
            objective.id === objectiveId
              ? {
                  ...objective,
                  activities: nextActivities,
                  objective_status: getObjectiveStatus(nextActivities),
                }
              : objective
          )
        );

        dispatchActivitiesChanged(objectiveId);
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to add expense");
        setError(error);
        console.error("Failed to add expense:", err);
        throw error;
      }
    },
    [projectId, activitiesMap, dispatchActivitiesChanged]
  );

  useEffect(() => {
    if (projectId) {
      fetchObjectives();
      fetchBudgetItems();
    }
  }, [projectId, fetchObjectives, fetchBudgetItems]);

  useEffect(() => {
    if (!projectId || typeof window === "undefined") return;

    const handleActivitiesChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{
        projectId?: number;
        objectiveId?: number;
      }>;

      const changedProjectId = customEvent.detail?.projectId;
      if (changedProjectId && changedProjectId !== projectId) return;

      void fetchObjectives();
      if (customEvent.detail?.objectiveId) {
        void fetchActivities(customEvent.detail.objectiveId, { force: true });
      }
    };

    window.addEventListener(
      "lantaw:activities-updated",
      handleActivitiesChanged as EventListener
    );

    return () => {
      window.removeEventListener(
        "lantaw:activities-updated",
        handleActivitiesChanged as EventListener
      );
    };
  }, [projectId, fetchActivities, fetchObjectives]);

  return {
    objectives,
    activitiesMap,
    budgetLineItems,

    loadingObjectives,
    loadingActivities,
    loadingBudgetItems,

    fetchObjectives,
    createObjective,
    updateObjective,
    deleteObjective,

    fetchActivities,
    createActivity,
    updateActivity,
    deleteActivity,
    addExpense,

    fetchBudgetItems,
    error,
  };
};
