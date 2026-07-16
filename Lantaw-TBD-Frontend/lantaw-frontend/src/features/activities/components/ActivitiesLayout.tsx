// Main orchestrator component for activities management.

import { useState, useEffect, useMemo, useRef } from "react";
import { Accordion } from "../../../components/common/accordion";

// Context
import { useProject } from "../../../context/ProjectContext";
import { useAuth } from "../../../context/AuthContext";

// Hooks
import { useActivities } from "../hooks/useActivities";
import { useActivityFilters } from "../hooks/useActivityFilters";
import { useChangeRequests } from "../../change-requests/hooks/useChangeRequests";

// Components
import { ActivitiesHeader } from "./ActivitiesHeader";
import { ActivitiesFilters } from "./ActivitiesFilters";
import { ObjectiveAccordion } from "./ObjectiveAccordion";

// Modals
import { ObjectiveModal } from "./modals/ObjectiveModal";
import { ActivityModal } from "./modals/ActivityModal";
import { DeleteObjectiveModal } from "./modals/DeleteObjectiveModal";
import { DeleteActivityModal } from "./modals/DeleteActivityModal";
import { AddExpenseModal } from "./modals/AddExpenseModal";
import { ProjectStatusModal } from "./modals/ProjectStatusModal";
import { SubmitChangeRequestModal } from "../../change-requests/components/SubmitChangeRequestModal";

// API
import { projectsApi } from "../services/activitiesApi";
import { changeRequestsApi } from "../../change-requests/services/changeRequestsApi";

// Types
import type { Objective } from "../../../types/objective";
import type { Activity } from "../../../types/activity";

const ActivitiesLayout = () => {
  const { currentProject, setCurrentProject } = useProject();
  const { user } = useAuth();
  const activities = useActivities(currentProject?.id || null);
  const filters = useActivityFilters();
  const { changeRequests } = useChangeRequests(currentProject?.id);
  
  // Helper to check if financial values should be hidden
  const hideFinancialValues = false; // Executives can now view amounts

  // Project status state
  const [projectStatus, setProjectStatus] = useState<
    "ACTIVE" | "COMPLETED" | "ONHOLD"
  >(currentProject?.project_status || "ACTIVE");
  const [projectStatusError, setProjectStatusError] = useState<string | null>(null);
  const [isUpdatingProjectStatus, setIsUpdatingProjectStatus] = useState(false);

  // Modal states
  const [isObjectiveModalOpen, setIsObjectiveModalOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [isProjectStatusModalOpen, setIsProjectStatusModalOpen] =
    useState(false);
  const [isDeleteActivityModalOpen, setIsDeleteActivityModalOpen] =
    useState(false);
  const [isDeleteObjectiveModalOpen, setIsDeleteObjectiveModalOpen] =
    useState(false);
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
  const [isSubmitChangeRequestModalOpen, setIsSubmitChangeRequestModalOpen] = useState(false);

  // Change request state
  const [pendingChangeRequest, setPendingChangeRequest] = useState<{
    changeType: 'OBJECTIVE' | 'PROJECT' | 'ACTIVITY';
    operation: 'CREATE' | 'UPDATE' | 'DELETE';
    entityId?: number | null;
    currentState?: Record<string, unknown> | null;
    proposedChanges: Record<string, unknown>;
  } | null>(null);

  // Editing states
  const [editingObjective, setEditingObjective] = useState<Objective | null>(
    null
  );
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);

  // Expanded objectives state (controlled accordion)
  const [expandedObjectives, setExpandedObjectives] = useState<string[]>([]);
  
  // Track the last search query to avoid refetching unnecessarily
  const lastSearchQueryRef = useRef<string>("");

  // Update project status when currentProject changes
  useEffect(() => {
    if (currentProject?.project_status) {
      setProjectStatus(currentProject.project_status);
    }
  }, [currentProject]);

  // Helper function to get changed fields from currentState and proposedChanges
  const getChangedFields = (
    currentState: Record<string, unknown> | null,
    proposedChanges: Record<string, unknown>
  ): Set<string> => {
    const changedFields = new Set<string>();
    
    if (!currentState) return changedFields;

    Object.keys(proposedChanges).forEach((key) => {
      // Skip internal fields
      if (key === 'id' || key === 'objective' || key === 'project') {
        return;
      }

      const currentValue = currentState[key];
      const proposedValue = proposedChanges[key];

      // Special handling for numeric fields (expenses, amounts)
      if (key.includes('expense') || key.includes('amount')) {
        const currentNum = (currentValue === null || currentValue === undefined || currentValue === '')
          ? 0
          : (typeof currentValue === 'number' ? currentValue : parseFloat(String(currentValue)) || 0);
        const proposedNum = (proposedValue === null || proposedValue === undefined || proposedValue === '')
          ? 0
          : (typeof proposedValue === 'number' ? proposedValue : parseFloat(String(proposedValue)) || 0);
        if (!isNaN(currentNum) && !isNaN(proposedNum) && Math.abs(currentNum - proposedNum) > 0.01) {
          changedFields.add(key);
        }
        return;
      }

      // Normalize values for comparison
      const normalizeValue = (val: unknown) => {
        if (val === null || val === undefined) return "";
        if (typeof val === "number") return val;
        const numVal = Number(val);
        if (!isNaN(numVal) && val !== "" && String(numVal) === String(val).trim()) {
          return numVal;
        }
        return String(val).trim();
      };

      const normalizedCurrent = normalizeValue(currentValue);
      const normalizedProposed = normalizeValue(proposedValue);

      if (normalizedCurrent !== normalizedProposed) {
        changedFields.add(key);
      }
    });

    return changedFields;
  };

  // Get pending change requests for the current project
  const pendingChangeRequests = useMemo(() => {
    if (!currentProject?.id || user?.role !== "Project Staff") {
      return [];
    }
    return changeRequests.filter(
      (req) =>
        req.project === currentProject.id &&
        req.change_type === "OBJECTIVE" &&
        req.status === "PENDING"
    );
  }, [changeRequests, currentProject?.id, user?.role]);

  // Get pending PROJECT change requests for the current project
  const pendingProjectChangeRequests = useMemo(() => {
    if (!currentProject?.id || user?.role !== "Project Staff") {
      return [];
    }
    return changeRequests.filter(
      (req) =>
        req.project === currentProject.id &&
        req.change_type === "PROJECT" &&
        req.status === "PENDING"
    );
  }, [changeRequests, currentProject?.id, user?.role]);

  // Handlers
  const handleOpenAddObjectiveModal = () => {
    setEditingObjective(null);
    setIsObjectiveModalOpen(true);
  };

  const handleOpenEditObjectiveModal = (objective: Objective) => {
    setEditingObjective(objective);
    setIsObjectiveModalOpen(true);
  };

  const handleOpenAddActivityModal = (objective: Objective) => {
    setEditingObjective(objective);
    setEditingActivity(null);
    setIsActivityModalOpen(true);
  };

  const handleOpenEditActivityModal = (
    activity: Activity,
    objective: Objective
  ) => {
    setEditingActivity(activity);
    setEditingObjective(objective);
    setIsActivityModalOpen(true);
  };

  const handleOpenDeleteObjectiveModal = (objective: Objective) => {
    setEditingObjective(objective);
    setIsDeleteObjectiveModalOpen(true);
  };

  const handleOpenDeleteActivityModal = (
    activity: Activity,
    objective: Objective
  ) => {
    setEditingActivity(activity);
    setEditingObjective(objective);
    setIsDeleteActivityModalOpen(true);
  };

  const handleOpenAddExpenseModal = (
    activity: Activity,
    objective: Objective
  ) => {
    setEditingActivity(activity);
    setEditingObjective(objective);
    setIsAddExpenseModalOpen(true);
  };

  // Objective operations
  const handleCreateObjective = async (data: {
    title: string;
    description: string;
  }) => {
    if (user?.role === "Project Staff" && currentProject) {
      // Show change request modal for Project Staff
      setPendingChangeRequest({
        changeType: 'OBJECTIVE',
        operation: 'CREATE',
        entityId: null,
        currentState: null,
        proposedChanges: data,
      });
      setIsSubmitChangeRequestModalOpen(true);
      setIsObjectiveModalOpen(false);
    } else {
      // Admin can create directly
      await activities.createObjective(data);
    }
  };

  const handleEditObjective = async (data: {
    title: string;
    description: string;
  }) => {
    if (!editingObjective) return;
    
    if (user?.role === "Project Staff" && currentProject) {
      const currentState = {
        title: editingObjective.title,
        description: editingObjective.description,
      };
      const proposedChanges = data;

      // Check for field-level conflicts with pending requests
      const fieldsBeingChanged = getChangedFields(currentState, proposedChanges);
      
      const fieldLabels: Record<string, string> = {
        title: "Title",
        description: "Description",
      };

      // Check pending requests for the same entity
      for (const pendingReq of pendingChangeRequests) {
        if (
          pendingReq.change_type === 'OBJECTIVE' &&
          pendingReq.entity_id === editingObjective.id &&
          pendingReq.operation === 'UPDATE' &&
          pendingReq.current_state &&
          pendingReq.proposed_changes
        ) {
          const pendingChangedFields = getChangedFields(
            pendingReq.current_state,
            pendingReq.proposed_changes
          );

          const conflictingFields = Array.from(fieldsBeingChanged).filter((field) =>
            pendingChangedFields.has(field)
          );

          if (conflictingFields.length > 0) {
            const fieldNames = conflictingFields.map((field) => fieldLabels[field] || field).join(", ");
            throw new Error(
              `Cannot submit change request. The following field(s) are already pending in a change request: ${fieldNames}. Please wait for admin approval or rejection before submitting changes to these fields.`
            );
          }
        } else if (
          pendingReq.change_type === 'OBJECTIVE' &&
          pendingReq.entity_id === editingObjective.id &&
          pendingReq.operation === 'DELETE'
        ) {
          throw new Error(
            "Cannot submit change request. This objective has a pending delete request. Please wait for admin approval or rejection."
          );
        }
      }

      // Show change request modal for Project Staff
      setPendingChangeRequest({
        changeType: 'OBJECTIVE',
        operation: 'UPDATE',
        entityId: editingObjective.id,
        currentState,
        proposedChanges,
      });
      setIsSubmitChangeRequestModalOpen(true);
      setIsObjectiveModalOpen(false);
    } else {
      // Admin can update directly
      await activities.updateObjective(editingObjective.id, data);
    }
  };

  const handleDeleteObjective = async () => {
    if (!editingObjective) return;
    
    if (user?.role === "Project Staff" && currentProject) {
      // Check if there's already a pending DELETE request for this objective
      const hasPendingDelete = pendingChangeRequests.some(
        (req) =>
          req.change_type === 'OBJECTIVE' &&
          req.entity_id === editingObjective.id &&
          req.operation === 'DELETE'
      );

      if (hasPendingDelete) {
        throw new Error(
          "Cannot submit change request. This objective already has a pending delete request. Please wait for admin approval or rejection."
        );
      }

      // Show change request modal for Project Staff
      setPendingChangeRequest({
        changeType: 'OBJECTIVE',
        operation: 'DELETE',
        entityId: editingObjective.id,
        currentState: {
          title: editingObjective.title,
          description: editingObjective.description,
        },
        proposedChanges: {},
      });
      setIsSubmitChangeRequestModalOpen(true);
      setIsDeleteObjectiveModalOpen(false);
    } else {
      // Admin can delete directly
      await activities.deleteObjective(editingObjective.id);
      setEditingObjective(null);
    }
  };

  // Activity operations
  const handleCreateActivity = async (data: {
    title: string;
    activity_status: Activity["activity_status"];
    projected_expense: string | null;
    actual_expense: string | null;
    activity_budget_item: number | null;
  }) => {
    if (!editingObjective) return;
    
    if (user?.role !== "Project Staff" || !currentProject) return;
    setPendingChangeRequest({
      changeType: 'ACTIVITY', operation: 'CREATE', entityId: null,
      currentState: null, proposedChanges: { ...data, objective: editingObjective.id },
    });
    setIsSubmitChangeRequestModalOpen(true);
    setIsActivityModalOpen(false);
  };

  const handleEditActivity = async (data: {
    title: string;
    activity_status: Activity["activity_status"];
    projected_expense: string | null;
    actual_expense: string | null;
    activity_budget_item: number | null;
  }) => {
    if (!editingObjective || !editingActivity) return;
    
    if (user?.role !== "Project Staff" || !currentProject) return;
    setPendingChangeRequest({
      changeType: 'ACTIVITY', operation: 'UPDATE', entityId: editingActivity.id,
      currentState: { ...editingActivity }, proposedChanges: data,
    });
    setIsSubmitChangeRequestModalOpen(true);
    setIsActivityModalOpen(false);
    setEditingActivity(null);
  };

  const handleDeleteActivity = async () => {
    if (!editingObjective || !editingActivity) return;
    
    if (user?.role !== "Project Staff" || !currentProject) return;
    setPendingChangeRequest({
      changeType: 'ACTIVITY', operation: 'DELETE', entityId: editingActivity.id,
      currentState: { ...editingActivity }, proposedChanges: {},
    });
    setIsSubmitChangeRequestModalOpen(true);
    setIsDeleteActivityModalOpen(false);
    setEditingActivity(null);
  };

  const handleAddExpense = async (amount: number, description: string) => {
    if (!editingObjective || !editingActivity) return;
    
    if (user?.role !== "Project Staff" || !currentProject) return;
    const currentAmount = Number(editingActivity.actual_expense || 0);
    setPendingChangeRequest({
      changeType: 'ACTIVITY', operation: 'UPDATE', entityId: editingActivity.id,
      currentState: { ...editingActivity },
      proposedChanges: { actual_expense: String(currentAmount + amount), description },
    });
    setIsSubmitChangeRequestModalOpen(true);
    setIsAddExpenseModalOpen(false);
    setEditingActivity(null);
  };

  const handleToggleActivityComplete = async (
    activity: Activity,
    _objective: Objective,
    checked: boolean
  ) => {
    if (user?.role !== "Project Staff" || !currentProject) return;
    setPendingChangeRequest({
      changeType: 'ACTIVITY', operation: 'UPDATE', entityId: activity.id,
      currentState: { ...activity },
      proposedChanges: { activity_status: checked ? "COMPLETED" : "PENDING" },
    });
    setIsSubmitChangeRequestModalOpen(true);
  };

  // Project status update
  const handleProjectStatusUpdate = async () => {
    if (!currentProject) return;

    // Prevent Executives from updating project status
    if (user?.role === "Executive") {
      setIsProjectStatusModalOpen(false);
      return;
    }

    // Clear previous error
    setProjectStatusError(null);

    if (user?.role === "Project Staff") {
      // Check if status is actually changing
      if (currentProject.project_status === projectStatus) {
        setProjectStatusError(
          "No changes detected. The project status is already set to the selected status."
        );
        return;
      }

      const currentState = {
        project_status: currentProject.project_status,
      };
      const proposedChanges = {
        project_status: projectStatus,
      };

      // Check for field-level conflicts with pending PROJECT change requests
      const fieldsBeingChanged = getChangedFields(currentState, proposedChanges);

      // Check if there's any pending request that includes project_status field
      for (const pendingReq of pendingProjectChangeRequests) {
        if (
          pendingReq.entity_id === currentProject.id &&
          pendingReq.operation === 'UPDATE' &&
          pendingReq.current_state &&
          pendingReq.proposed_changes
        ) {
          // Check if the pending request includes project_status field
          const pendingChangedFields = getChangedFields(
            pendingReq.current_state,
            pendingReq.proposed_changes
          );

          // If pending request has project_status field, block the new request
          if (pendingChangedFields.has('project_status')) {
            setProjectStatusError(
              "Cannot submit change request. Project Status is already pending in a change request. Please wait for admin approval or rejection before submitting changes to this field."
            );
            return;
          }

          // Also check for field conflicts
          const conflictingFields = Array.from(fieldsBeingChanged).filter((field) =>
            pendingChangedFields.has(field)
          );

          if (conflictingFields.length > 0) {
            setProjectStatusError(
              "Cannot submit change request. Project Status is already pending in a change request. Please wait for admin approval or rejection before submitting changes to this field."
            );
            return;
          }
        }
      }

      // Show change request modal for Project Staff
      setPendingChangeRequest({
        changeType: 'PROJECT',
        operation: 'UPDATE',
        entityId: currentProject.id,
        currentState,
        proposedChanges,
      });
      setIsSubmitChangeRequestModalOpen(true);
      setIsProjectStatusModalOpen(false);
    } else {
      // Admin can update directly
      setIsUpdatingProjectStatus(true);
      setProjectStatusError(null);
      try {
        const updatedProject = await projectsApi.updateStatus(
          currentProject.id,
          projectStatus
        );
        setCurrentProject(updatedProject);
        setProjectStatusError(null);
        setIsProjectStatusModalOpen(false);
      } catch (error) {
        console.error("Failed to update project status:", error);
        setProjectStatusError("Failed to update project status. Please try again.");
      } finally {
        setIsUpdatingProjectStatus(false);
      }
    }
  };

  // Get filtered activities for an objective
  const getFilteredActivitiesForObjective = (objectiveId: number) => {
    const rawActivities = activities.activitiesMap[objectiveId];
    return filters.filterActivities(rawActivities);
  };

  // Compute which objectives should be auto-expanded based on search query
  const objectivesToAutoExpand = useMemo(() => {
    const searchQuery = filters.filters.searchQuery.trim();
    
    // If search query is empty, don't auto-expand (let user control manually)
    if (!searchQuery) {
      return [];
    }

    const searchLower = searchQuery.toLowerCase();
    
    // Find objectives that should be auto-expanded
    const toExpand: string[] = [];
    
    activities.objectives.forEach((objective) => {
      // Check if objective title or description matches
      const objectiveMatches = 
        objective.title.toLowerCase().includes(searchLower) ||
        objective.description.toLowerCase().includes(searchLower);
      
      // Check if objective has matching activities (if activities are loaded)
      const objectiveActivities = activities.activitiesMap[objective.id];
      const hasActivitiesLoaded = objectiveActivities !== undefined;
      const filteredActivities = hasActivitiesLoaded 
        ? filters.filterActivities(objectiveActivities)
        : [];
      const hasMatchingActivities = filteredActivities.length > 0;
      
      // Auto-expand if:
      // 1. Objective matches by title/description (expand immediately, even if activities not loaded), OR
      // 2. Objective has matching activities (after activities are loaded)
      if (objectiveMatches || hasMatchingActivities) {
        toExpand.push(`objective-${objective.id}`);
      }
    });

    return toExpand;
  }, [filters, activities.objectives, activities.activitiesMap]);

  // Fetch activities for all objectives when search query is set (only once per search query)
  useEffect(() => {
    const searchQuery = filters.filters.searchQuery.trim();
    
    // Only fetch if search query changed and is not empty
    if (searchQuery && searchQuery !== lastSearchQueryRef.current) {
      lastSearchQueryRef.current = searchQuery;
      
      // Proactively fetch activities for all objectives when searching
      // This ensures we can check for matching activities even if they weren't loaded yet
      activities.objectives.forEach((objective) => {
        // Fetch activities if they haven't been loaded yet
        if (!activities.activitiesMap[objective.id]) {
          activities.fetchActivities(objective.id);
        }
      });
    } else if (!searchQuery) {
      // Reset ref when search is cleared
      lastSearchQueryRef.current = "";
    }
  }, [filters.filters.searchQuery, activities]);

  // Update expanded objectives when search query or activities change
  useEffect(() => {
    const searchQuery = filters.filters.searchQuery.trim();
    
    if (searchQuery) {
      // When searching, auto-expand objectives with matching activities
      // Only update if the expansion list actually changed to avoid infinite loops
      setExpandedObjectives((prev) => {
        const prevSet = new Set(prev);
        const newSet = new Set(objectivesToAutoExpand);
        
        // Check if arrays are different
        if (prev.length !== objectivesToAutoExpand.length) {
          return objectivesToAutoExpand;
        }
        
        const hasChanges = objectivesToAutoExpand.some(
          (id) => !prevSet.has(id)
        ) || prev.some((id) => !newSet.has(id));
        
        return hasChanges ? objectivesToAutoExpand : prev;
      });
    }
    // When search is cleared, keep current expansion state (user's manual choices)
    // This allows users to maintain their manual expansion preferences
  }, [objectivesToAutoExpand, filters.filters.searchQuery]);

  if (!currentProject) {
    return (
      <div className="p-4 sm:p-6">
        <p className="text-muted-foreground">No project selected.</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <ActivitiesHeader
        projectName={currentProject.name}
        projectStatus={projectStatus}
        onEditProjectStatus={() => setIsProjectStatusModalOpen(true)}
        onAddObjective={handleOpenAddObjectiveModal}
        userRole={user?.role}
      />

      {/* Search and Filters */}
      <ActivitiesFilters filters={filters} />

      {/* Objectives Accordion */}
      <div className="space-y-4">
        <Accordion 
          type="multiple" 
          className="w-full space-y-4"
          value={expandedObjectives}
          onValueChange={setExpandedObjectives}
        >
          {activities.objectives
            .filter((objective) => {
              const objectiveActivities = activities.activitiesMap[objective.id];
              return filters.filterObjectives(objective, objectiveActivities);
            })
            .map((objective) => {
              const filteredActivities = getFilteredActivitiesForObjective(
                objective.id
              );
              const isLoading = activities.loadingActivities[objective.id];

              return (
                <ObjectiveAccordion
                  key={objective.id}
                  objective={objective}
                  activities={filteredActivities}
                  isLoading={isLoading}
                  onExpand={activities.fetchActivities}
                  budgetLineItems={activities.budgetLineItems}
                  onEditObjective={handleOpenEditObjectiveModal}
                  onDeleteObjective={handleOpenDeleteObjectiveModal}
                  onAddActivity={handleOpenAddActivityModal}
                  onEditActivity={handleOpenEditActivityModal}
                  onDeleteActivity={handleOpenDeleteActivityModal}
                  onAddExpense={handleOpenAddExpenseModal}
                  onToggleActivityComplete={handleToggleActivityComplete}
                  showActions={user?.role === "Project Staff"}
                  hideFinancialValues={hideFinancialValues}
                />
              );
            })}
        </Accordion>
      </div>

      {/* Modals */}
      <ProjectStatusModal
        isOpen={isProjectStatusModalOpen}
        onClose={() => {
          if (!isUpdatingProjectStatus) {
            setIsProjectStatusModalOpen(false);
            setProjectStatusError(null);
          }
        }}
        projectStatus={projectStatus}
        onStatusChange={(status) => {
          setProjectStatus(status as "ACTIVE" | "COMPLETED" | "ONHOLD");
          setProjectStatusError(null); // Clear error when status changes
        }}
        onUpdate={handleProjectStatusUpdate}
        error={projectStatusError}
        isLoading={isUpdatingProjectStatus}
      />

      <ObjectiveModal
        isOpen={isObjectiveModalOpen}
        onClose={() => {
          setIsObjectiveModalOpen(false);
          setEditingObjective(null);
        }}
        objective={editingObjective}
        onSubmit={
          editingObjective ? handleEditObjective : handleCreateObjective
        }
      />

      <ActivityModal
        isOpen={isActivityModalOpen}
        onClose={() => {
          setIsActivityModalOpen(false);
          setEditingActivity(null);
          setEditingObjective(null);
        }}
        activity={editingActivity}
        budgetLineItems={activities.budgetLineItems}
        onSubmit={editingActivity ? handleEditActivity : handleCreateActivity}
      />

      <DeleteObjectiveModal
        isOpen={isDeleteObjectiveModalOpen}
        onClose={() => {
          setIsDeleteObjectiveModalOpen(false);
          setEditingObjective(null);
        }}
        onConfirm={handleDeleteObjective}
        objectiveTitle={editingObjective?.title}
      />

      <DeleteActivityModal
        isOpen={isDeleteActivityModalOpen}
        onClose={() => {
          setIsDeleteActivityModalOpen(false);
          setEditingActivity(null);
          setEditingObjective(null);
        }}
        onConfirm={handleDeleteActivity}
        activityTitle={editingActivity?.title}
      />

      <AddExpenseModal
        isOpen={isAddExpenseModalOpen}
        onClose={() => {
          setIsAddExpenseModalOpen(false);
          setEditingActivity(null);
          setEditingObjective(null);
        }}
        activity={editingActivity}
        onSubmit={handleAddExpense}
      />

      {/* Change Request Submission Modal */}
      {pendingChangeRequest && currentProject && (
        <SubmitChangeRequestModal
          open={isSubmitChangeRequestModalOpen}
          onOpenChange={setIsSubmitChangeRequestModalOpen}
          projectId={currentProject.id}
          changeType={pendingChangeRequest.changeType}
          operation={pendingChangeRequest.operation}
          entityId={pendingChangeRequest.entityId}
          currentState={pendingChangeRequest.currentState}
          proposedChanges={pendingChangeRequest.proposedChanges}
          onSubmit={async (data) => {
            await changeRequestsApi.create(currentProject.id, data);
            setPendingChangeRequest(null);
            // Refresh activities to show updated data
            await activities.fetchObjectives();
          }}
        />
      )}
    </div>
  );
};

export default ActivitiesLayout;
