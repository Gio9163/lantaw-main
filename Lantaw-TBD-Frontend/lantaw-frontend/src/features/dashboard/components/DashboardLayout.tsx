// Main orchestrator component for dashboard overview

import { useState, useMemo, useEffect } from "react";

// Context
import { useProject } from "../../../context/ProjectContext";
import { useAuth } from "../../../context/AuthContext";

// Hooks
import { useActivities } from "../../activities/hooks/useActivities";
import { useChangeRequests } from "../../change-requests/hooks/useChangeRequests";
import api from "../../../api/client";

// Common Components
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../../../components/common/card";
import { Accordion } from "../../../components/common/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../../components/common/dialog";

// Components
import { DashboardHeader } from "../components/DashboardHeader";
import { ProjectDurationCard } from "../components/ProjectDurationCard";
import { ObjectivesCompletedCard } from "../components/ObjectivesCompletedCard";
import { RemainingBudgetCard } from "../components/RemainingBudgetCard";
import { BudgetOverviewChart } from "../components/BudgetOverviewChart";
import { BudgetBreakdownChart } from "../components/BudgetBreakdownChart";
import { ExpenseComparisonChart } from "../components/ExpenseComparisonChart";
import { ObjectiveAccordion } from "../../activities/components/ObjectiveAccordion";

// Modals
import ProjectModal from "../../layout/components/ProjectModal";
import { SubmitChangeRequestModal } from "../../change-requests/components/SubmitChangeRequestModal";

// Helper functions
import { getProjectDuration } from "../utils/calculateProjectDuration";
import { getProjectMetrics } from "../utils/measureProjectMetrics";
import {
  generateColorVariations,
  getBaseColorForCategory,
} from "../utils/pieChartHelper";

// Types
import type { DetailItem } from "../utils/pieChartHelper";
import type { Project } from "../../../types/project";
import type { ChangeRequestCreateData } from "../../../types/changeRequest";

const DashboardLayout = () => {
  // Context
  const { currentProject, refetchProject } = useProject();
  const { user, loading: authLoading } = useAuth();

  // Show loading state while user data is being fetched
  if (authLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-4">
        <div className="bg-card border border-border rounded-lg p-6">
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Early return if no project is selected
  if (!currentProject) {
    return (
      <div className="p-4 sm:p-6 space-y-4">
        <h2 className="text-2xl font-semibold">Welcome to Lantaw Dashboard</h2>
        <div className="bg-card border border-border rounded-lg p-6">
          <p className="text-muted-foreground mb-4">
            No project selected. Please select a project from the sidebar or create a new one.
          </p>
          {user?.role === "Admin" && (
            <p className="text-sm text-muted-foreground">
              As an admin, you can create a new project using the "Create Project" button in the sidebar.
            </p>
          )}
        </div>
      </div>
    );
  }

  // Hooks
  const activities = useActivities(currentProject?.id || null);
  const { objectives } = activities;
  const { createChangeRequest, changeRequests } = useChangeRequests(currentProject?.id);

  // State
  const [budgetView, setBudgetView] = useState<BudgetViewType>("OVERVIEW");
  const [editFormData, setEditFormData] = useState({
    name: "",
    projectLeader: "",
    description: "",
    duration: "",
    startDate: "",
    endDate: "",
    totalGrant: "",
    projectStaff: "",
  });
  const [editProjectBudgetItems, setEditProjectBudgetItems] = useState<{
    ps: Array<{ id?: number; category: 'PS' | 'MOOE' | 'CO'; description: string; amount: string }>;
    mooe: Array<{ id?: number; category: 'PS' | 'MOOE' | 'CO'; description: string; amount: string }>;
    co: Array<{ id?: number; category: 'PS' | 'MOOE' | 'CO'; description: string; amount: string }>;
  }>({
    ps: [],
    mooe: [],
    co: [],
  });

  //Modal states
  const [isEditProjectModalOpen, setIsEditProjectModalOpen] = useState(false);
  const [isSubmitChangeRequestModalOpen, setIsSubmitChangeRequestModalOpen] = useState(false);
  const [isObjectivesModalOpen, setIsObjectivesModalOpen] = useState(false);

  // Editing states
  const [_editingProject, _setIsEditingProject] = useState<Project | null>(null);
  const [pendingChangeRequest, setPendingChangeRequest] = useState<{
    changeType: 'PROJECT';
    operation: 'UPDATE';
    entityId: number;
    currentState: Record<string, any>;
    proposedChanges: Record<string, any>;
    customTitle?: string;
  } | null>(null);

  // Error states
  const [editProjectError, setEditProjectError] = useState("");

  // Helper functions for date
  const {
    totalDays,
    elapsedDays,
    remainingDays,
    progressPercentage,
    startDate,
    endDate,
    isOverdue,
  } = getProjectDuration(currentProject);

  // Helper functions for getting project metrics summary
  const {
    completedObjectives,
    totalObjectives,
    actualBudgetItemTotal,
    activityDetailedItems,
    expenseComparisonPerBudgetItem,
    expenseSummary,
  } = getProjectMetrics(objectives, currentProject?.grant_amount);

  // Helper functions to render expense breakdown
  type BudgetViewType = "OVERVIEW" | "PS" | "MOOE" | "CO";

  const getBudgetCategoryData = (view: BudgetViewType): DetailItem[] => {
    // Check if the view is a specific category (PS, MOOE, CO)
    if (view !== "OVERVIEW" && activityDetailedItems[view]) {
      return activityDetailedItems[view];
    }
    return [];
  };

  const categoryData = getBudgetCategoryData(budgetView);
  const categoryName =
    budgetView === "PS"
      ? "Personnel Services"
      : budgetView === "MOOE"
      ? "MOOE"
      : "Capital Outlay";

  const detailColors = useMemo(() => {
    if (budgetView === "OVERVIEW") return [];

    const baseColor = getBaseColorForCategory(budgetView);
    return generateColorVariations(baseColor, categoryData.length);
  }, [budgetView, categoryData]);

  // Helper function to check if financial values should be hidden
  const hideFinancialValues = false; // Executives can now view amounts

  // Helper function to change views of budget pie chart based on click
  const renderBudgetBreakdown = () => {
    if (budgetView === "OVERVIEW") {
      return (
        <BudgetOverviewChart
          data={actualBudgetItemTotal}
          onSliceClick={setBudgetView}
          hideFinancialValues={hideFinancialValues}
        />
      );
    } else {
      return (
        <BudgetBreakdownChart
          categoryData={categoryData}
          categoryName={categoryName}
          detailColors={detailColors}
          onBack={() => setBudgetView("OVERVIEW")}
          hideFinancialValues={hideFinancialValues}
        />
      );
    }
  };

  // Helper function to calculate duration in years from two dates
  const calculateDurationFromDates = (startDate: string, endDate: string): string => {
    if (!startDate || !endDate) return "";
    const start = new Date(startDate);
    const end = new Date(endDate);
    const years = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
    // Clamp to valid range (1-5 years)
    if (years < 1) return "1";
    if (years > 5) return "5";
    return String(years);
  };

  // Helper for editing project
  useEffect(() => {
    if (currentProject && isEditProjectModalOpen) {
      const calculatedDuration = calculateDurationFromDates(
        currentProject.date_start || "",
        currentProject.date_end || ""
      );
      setEditFormData({
        name: currentProject.name || "",
        projectLeader: currentProject.project_leader || "",
        description: currentProject.description || "",
        duration: calculatedDuration,
        startDate: currentProject.date_start || "",
        endDate: currentProject.date_end || "",
        totalGrant: String(currentProject.grant_amount || 0),
        projectStaff: "",
      });
      
      // Load budget items from API response
      // Transform API format (array) to BudgetCategory format
      const budgetItems: any = { ps: [], mooe: [], co: [] };
      if ((currentProject as any).budget_items && Array.isArray((currentProject as any).budget_items)) {
        (currentProject as any).budget_items.forEach((item: any) => {
          const categoryKey = item.category.toLowerCase() as 'ps' | 'mooe' | 'co';
          if (categoryKey in budgetItems) {
            budgetItems[categoryKey].push({
              id: item.id,
              category: item.category,
              description: item.description,
              amount: String(item.amount),
            });
          }
        });
      }
      setEditProjectBudgetItems(budgetItems);
    }
  }, [currentProject, isEditProjectModalOpen]);

  // Helper function to generate title based on changed fields
  const generateChangeRequestTitle = (
    currentState: Record<string, any>,
    proposedChanges: Record<string, any>
  ): string => {
    const fieldLabels: Record<string, string> = {
      name: "Project Name",
      project_leader: "Project Leader",
      description: "Description",
      date_start: "Start Date",
      date_end: "End Date",
      grant_amount: "Grant Amount",
    };

    const changedFields: string[] = [];

    // Check each field to see if it changed
    Object.keys(proposedChanges).forEach((key) => {
      const currentValue = currentState[key];
      const proposedValue = proposedChanges[key];
      
      // Special handling for grant_amount (decimal field)
      if (key === 'grant_amount') {
        // Handle null/undefined as 0
        const currentNum = (currentValue === null || currentValue === undefined || currentValue === '') 
          ? 0 
          : (typeof currentValue === 'number' ? currentValue : parseFloat(String(currentValue)) || 0);
        const proposedNum = (proposedValue === null || proposedValue === undefined || proposedValue === '') 
          ? 0 
          : (typeof proposedValue === 'number' ? proposedValue : parseFloat(String(proposedValue)) || 0);
        // Compare with small epsilon to handle floating point precision (0.01 for 2 decimal places)
        // Only add if both are valid numbers and there's a meaningful difference
        if (!isNaN(currentNum) && !isNaN(proposedNum) && Math.abs(currentNum - proposedNum) > 0.01) {
          changedFields.push(key);
        }
        return; // Skip to next field
      }
      
      // Normalize values for comparison (handle strings, numbers, dates)
      const normalizeValue = (val: any) => {
        if (val === null || val === undefined) return "";
        // Handle numbers - convert to number for proper comparison
        if (typeof val === "number") return val;
        // Try to parse as number if it's a numeric string
        const numVal = Number(val);
        if (!isNaN(numVal) && val !== "" && String(numVal) === String(val).trim()) {
          return numVal;
        }
        return String(val).trim();
      };

      const normalizedCurrent = normalizeValue(currentValue);
      const normalizedProposed = normalizeValue(proposedValue);
      
      // Compare normalized values
      if (normalizedCurrent !== normalizedProposed) {
        changedFields.push(key);
      }
    });

    // Generate title based on changed fields
    if (changedFields.length === 0) {
      return "Updating Project";
    } else if (changedFields.length === 1) {
      const fieldName = fieldLabels[changedFields[0]] || changedFields[0];
      return `Updating ${fieldName}`;
    } else if (changedFields.length === 2) {
      const field1 = fieldLabels[changedFields[0]] || changedFields[0];
      const field2 = fieldLabels[changedFields[1]] || changedFields[1];
      return `Updating ${field1} and ${field2}`;
    } else {
      // For 3+ fields, show the first one and "and X more"
      const field1 = fieldLabels[changedFields[0]] || changedFields[0];
      const remainingCount = changedFields.length - 1;
      return `Updating ${field1} and ${remainingCount} more`;
    }
  };

  // Helper function to get changed fields from currentState and proposedChanges
  const getChangedFields = (
    currentState: Record<string, any>,
    proposedChanges: Record<string, any>
  ): Set<string> => {
    const changedFields = new Set<string>();

    Object.keys(proposedChanges).forEach((key) => {
      const currentValue = currentState[key];
      const proposedValue = proposedChanges[key];

      // Special handling for grant_amount (decimal field)
      if (key === 'grant_amount') {
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
      const normalizeValue = (val: any) => {
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

  // Handlers for editing project
  const handleOpenEditProjectModal = async () => {
    setEditProjectError("");
    // Refetch project to ensure we have the latest data including budget_items
    if (currentProject?.id) {
      try {
        await refetchProject(currentProject.id);
      } catch (error) {
        console.error("Failed to refetch project:", error);
      }
    }
    setIsEditProjectModalOpen(true);
  };

  const handleCloseEditProjectModal = (open: boolean) => {
    if (!open) {
      setEditProjectError("");
    }
    setIsEditProjectModalOpen(open);
  };

  const handleEditProject = async () => {
    if (!currentProject?.id) {
      setEditProjectError("Error: Cannot find project ID for editing.");
      return;
    }

    setEditProjectError("");

    // Basic Field Validation
    if (!editFormData.name.trim()) {
      setEditProjectError("Project name is required.");
      return;
    }

    // For Project Staff: Submit change request instead of direct edit
    if (user?.role === "Project Staff" && currentProject) {
      // Prepare current state
      const currentState = {
        name: currentProject.name || "",
        project_leader: currentProject.project_leader || "",
        description: currentProject.description || "",
        date_start: currentProject.date_start || "",
        date_end: currentProject.date_end || "",
        grant_amount: currentProject.grant_amount || 0,
      };

      // Transform budget items to API format
      const budgetItemsPayload = [
        ...editProjectBudgetItems.ps.map(item => ({
          id: item.id,
          category: item.category,
          description: item.description,
          amount: item.amount,
        })),
        ...editProjectBudgetItems.mooe.map(item => ({
          id: item.id,
          category: item.category,
          description: item.description,
          amount: item.amount,
        })),
        ...editProjectBudgetItems.co.map(item => ({
          id: item.id,
          category: item.category,
          description: item.description,
          amount: item.amount,
        })),
      ];
      
      // Prepare proposed changes
      const proposedChanges = {
        name: editFormData.name,
        project_leader: editFormData.projectLeader,
        description: editFormData.description,
        date_start: editFormData.startDate,
        date_end: editFormData.endDate,
        grant_amount: parseFloat(editFormData.totalGrant) || 0,
        budget_items: budgetItemsPayload,
      };

      // Get fields that are being changed in this edit
      const fieldsBeingChanged = getChangedFields(currentState, proposedChanges);

      // Check if any of the fields being changed are already in a pending change request
      const fieldLabels: Record<string, string> = {
        name: "Project Name",
        project_leader: "Project Leader",
        description: "Description",
        date_start: "Start Date",
        date_end: "End Date",
        grant_amount: "Grant Amount",
      };

      for (const pendingReq of pendingProjectChangeRequests) {
        if (pendingReq.current_state && pendingReq.proposed_changes) {
          const pendingChangedFields = getChangedFields(
            pendingReq.current_state,
            pendingReq.proposed_changes
          );

          // Check for overlap
          const conflictingFields = Array.from(fieldsBeingChanged).filter((field) =>
            pendingChangedFields.has(field)
          );

          if (conflictingFields.length > 0) {
            const fieldNames = conflictingFields.map((field) => fieldLabels[field] || field).join(", ");
            setEditProjectError(
              `Cannot submit change request. The following field(s) are already pending in a change request: ${fieldNames}. Please wait for admin approval or rejection before submitting changes to these fields.`
            );
            return;
          }
        }
      }

      // Generate dynamic title based on changed fields
      const customTitle = generateChangeRequestTitle(currentState, proposedChanges);

      // Set up change request and open modal
      setPendingChangeRequest({
        changeType: 'PROJECT',
        operation: 'UPDATE',
        entityId: currentProject.id,
        currentState,
        proposedChanges,
        customTitle,
      });
      setIsEditProjectModalOpen(false);
      setIsSubmitChangeRequestModalOpen(true);
      return;
    }

    // For Admin: Direct edit
    if (user?.role !== "Admin") {
      setEditProjectError("You are not authorized to edit projects.");
      return;
    }

    try {
      // Transform budget items to API format
      const budgetItemsPayload = [
        ...editProjectBudgetItems.ps.map(item => ({
          id: item.id,
          category: item.category,
          description: item.description,
          amount: item.amount,
        })),
        ...editProjectBudgetItems.mooe.map(item => ({
          id: item.id,
          category: item.category,
          description: item.description,
          amount: item.amount,
        })),
        ...editProjectBudgetItems.co.map(item => ({
          id: item.id,
          category: item.category,
          description: item.description,
          amount: item.amount,
        })),
      ];
      
      // Create project payload
      const projectPayload = {
        name: editFormData.name,
        project_leader: editFormData.projectLeader,
        description: editFormData.description,
        date_start: editFormData.startDate,
        date_end: editFormData.endDate,
        grant_amount: parseFloat(editFormData.totalGrant) || 0,
        budget_items: budgetItemsPayload,
      };

      // Patch API
      await api.patch(`/api/projects/${currentProject.id}/`, projectPayload);

      // Success handlers
      await refetchProject(currentProject.id);
      setIsEditProjectModalOpen(false);
      setEditProjectError("");
    } catch (err) {
      console.error("Failed to edit project:", err);
      setEditProjectError(
        "Something went wrong while saving changes. Please try again."
      );
    }
  };

  // Handler for submitting change request
  const handleSubmitChangeRequest = async (data: ChangeRequestCreateData) => {
    if (!currentProject?.id) return;
    
    try {
      await createChangeRequest(currentProject.id, data);
      setIsSubmitChangeRequestModalOpen(false);
      setPendingChangeRequest(null);
    } catch (err) {
      console.error("Failed to submit change request:", err);
      throw err;
    }
  };


  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <DashboardHeader
        projectName={currentProject.name}
        projectLeader={currentProject.project_leader}
        projectDescription={currentProject.description || ""}
        onEditProject={handleOpenEditProjectModal}
        userRole={user?.role}
      />

      {/* Summary Cards */}
      {/* Project Duration */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <ProjectDurationCard
          projectStatus={currentProject.project_status}
          isOverdue={isOverdue}
          remainingDays={remainingDays}
          elapsedDays={elapsedDays}
          totalDays={totalDays}
          startDate={startDate}
          endDate={endDate}
          progressPercentage={progressPercentage}
        />

        <ObjectivesCompletedCard
          completedObjectives={completedObjectives}
          totalObjectives={totalObjectives}
          onClick={() => setIsObjectivesModalOpen(true)}
        />

        <RemainingBudgetCard
          remainingBudget={Math.max(0, (currentProject.grant_amount || 0) - (expenseSummary.totalSpent || 0))}
          grantAmount={currentProject.grant_amount || 0}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart - left */}
        <ExpenseComparisonChart
          data={expenseComparisonPerBudgetItem}
          projectSummary={expenseSummary}
          hideFinancialValues={hideFinancialValues}
        />
        {/* Pie Chart - right */}
        <Card>
          <CardHeader>
            <CardTitle>
              {budgetView === "OVERVIEW"
                ? "Budget Distribution"
                : budgetView === "PS"
                ? "Personnel Breakdown"
                : budgetView === "MOOE"
                ? "MOOE Breakdown"
                : "Capital Outlay Breakdown"}
            </CardTitle>
            {budgetView === "OVERVIEW" && (
              <p className="text-sm text-muted-foreground">
                Click on a section to view detailed breakdown.
              </p>
            )}
          </CardHeader>
          <CardContent>{renderBudgetBreakdown()}</CardContent>
        </Card>
      </div>

      {/* Objectives Summary */}
      <Card>
        <CardHeader>Objectives Overview</CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Accordion type="multiple" className="w-full space-y-4">
              <Accordion type="multiple" className="w-full space-y-4">
                {activities.objectives.map((objective) => {
                  const allActivities =
                    activities.activitiesMap[objective.id] ?? objective.activities ?? [];

                  const isLoading = activities.loadingActivities[objective.id];

                  return (
                    <ObjectiveAccordion
                      key={objective.id}
                      objective={objective}
                      activities={allActivities}
                      isLoading={isLoading}
                      onExpand={activities.fetchActivities}
                      budgetLineItems={[]}
                      showActions={false}
                      hideFinancialValues={hideFinancialValues}
                    />
                  );
                })}
              </Accordion>
            </Accordion>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isObjectivesModalOpen} onOpenChange={setIsObjectivesModalOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Objectives Overview</DialogTitle>
            <DialogDescription>
              Review each objective and its current activity progress. Editing is only available in the Objectives module.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {activities.objectives.map((objective) => {
              const objectiveActivities = activities.activitiesMap[objective.id] ?? objective.activities ?? [];
              const completedCount = objectiveActivities.filter((activity) => activity.activity_status === "COMPLETED").length;
              const status = objective.objective_status ?? (objectiveActivities.length === 0
                ? "Not Started"
                : completedCount === objectiveActivities.length
                  ? "Completed"
                  : completedCount > 0
                    ? "In Progress"
                    : "Not Started");

              return (
                <div key={objective.id} className="rounded-lg border bg-background p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{objective.title}</h3>
                      <p className="text-sm text-muted-foreground">{objective.description || "No description provided."}</p>
                    </div>
                    <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">{status}</span>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm font-medium">Activities</p>
                    <ul className="mt-2 space-y-2">
                      {objectiveActivities.length === 0 ? (
                        <li className="text-sm text-muted-foreground">No activities available.</li>
                      ) : objectiveActivities.map((activity) => (
                        <li key={activity.id} className="flex items-center gap-2 text-sm">
                          <span className={activity.activity_status === "COMPLETED" ? "text-green-600" : "text-muted-foreground"}>
                            {activity.activity_status === "COMPLETED" ? "✓" : "○"}
                          </span>
                          <span>{activity.title}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Project Modal */}
      <ProjectModal
        open={isEditProjectModalOpen}
        onOpenChange={handleCloseEditProjectModal}
        isEdit={true}
        formData={editFormData}
        setFormData={setEditFormData}
        onSubmit={handleEditProject}
        userRole={user?.role}
        error={editProjectError}
        initialBudgetItems={editProjectBudgetItems}
        onBudgetItemsChange={setEditProjectBudgetItems}
      />

      {/* Submit Change Request Modal */}
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
          onSubmit={handleSubmitChangeRequest}
          customTitle={pendingChangeRequest.customTitle}
        />
      )}
    </div>
  );
};

export default DashboardLayout;
