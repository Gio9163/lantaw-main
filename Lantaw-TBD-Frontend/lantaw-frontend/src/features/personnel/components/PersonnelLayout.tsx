// Main orchestrator component for personnel management.

import { useState, useMemo } from "react";
import { Accordion } from "../../../components/common/accordion";

// Context
import { useProject } from "../../../context/ProjectContext";
import { useAuth } from "../../../context/AuthContext";

// Hooks
import { usePersonnel } from "../hooks/usePersonnel";
import { usePersonnelFilters } from "../hooks/usePersonnelFilter";
import { useCompensation } from "../hooks/useCompensation";
import { useRole } from "../hooks/useRole";
import { useDepartment } from "../hooks/useDepartment";
import { useActivities } from "../../../features/activities/hooks/useActivities";
import { useChangeRequests } from "../../change-requests/hooks/useChangeRequests";

// Components
import { PersonnelHeader } from "./PersonnelHeader";
import { PersonnelFilters } from "./PersonnelFilters";
import { PersonnelAccordion } from "./PersonnelAccordion";
import { ProjectMembersTab } from "./ProjectMembersTab";
import { Button } from "../../../components/common/button";

// Modals
import { AddPersonnelModal } from "./modals/AddPersonnelModal";
import { DeletePersonnelModal } from "./modals/DeletePersonnelModal";
import { EditCompensationModal } from "./modals/EditCompensationModal";
import { DeleteCompensationModal } from "./modals/DeleteCompensationModal";
import { SubmitChangeRequestModal } from "../../change-requests/components/SubmitChangeRequestModal";
import { changeRequestsApi } from "../../change-requests/services/changeRequestsApi";

// Types
import type { Personnel } from "../../../types/personnel";
import type { Compensation } from "../../../types/compensation";

const PersonnelLayout = () => {
  const [activeSection, setActiveSection] = useState<"PERSONNEL" | "MEMBERS">("PERSONNEL");
  // Hooks
  const { currentProject } = useProject();
  const { user } = useAuth();
  const filters = usePersonnelFilters();
  const { changeRequests } = useChangeRequests(currentProject?.id);

  const personnel = usePersonnel(currentProject?.id || null);
  const {
    compensation: compensationList,
    loadingCompensation,
    fetchCompensation,
    addCompensation,
    updateCompensation,
    deleteCompensation,
    error: compensationError,
  } = useCompensation(currentProject?.id ?? 0);

  const {
    role: roles,
    loadingRole,
    addRole,
  } = useRole(currentProject?.id ?? 0);

  const {
    department: departments,
    loadingDepartment,
    addDepartment,
  } = useDepartment(currentProject?.id ?? 0);

  const { budgetLineItems } = useActivities(currentProject?.id || null);

  // Modal states
  const [isAddPersonnelModalOpen, setIsAddPersonnelModalOpen] = useState(false);
  const [isDeletePersonnelModalOpen, setIsDeletePersonnelModalOpen] =
    useState(false);
  const [isEditCompensationModalOpen, setIsEditCompensationModalOpen] =
    useState(false);
  const [isDeleteCompensationModalOpen, setIsDeleteCompensationModalOpen] =
    useState(false);
  const [isSubmitChangeRequestModalOpen, setIsSubmitChangeRequestModalOpen] = useState(false);

  // Change request state
  const [pendingChangeRequest, setPendingChangeRequest] = useState<{
    changeType: 'PERSONNEL' | 'COMPENSATION' | 'ROLE' | 'DEPARTMENT';
    operation: 'CREATE' | 'UPDATE' | 'DELETE';
    entityId?: number | null;
    currentState?: Record<string, unknown> | null;
    proposedChanges: Record<string, unknown>;
  } | null>(null);

  // Helper function to resolve role/department IDs to names
  const resolvePersonnelFields = (data: {
    role: number | null;
    department: number | null;
    [key: string]: unknown;
  }) => {
    const roleObj = roles.find(r => r.id === data.role);
    const deptObj = departments.find(d => d.id === data.department);
    
    return {
      ...data,
      role_name: roleObj?.name || "",
      department_name: deptObj?.name || "",
    };
  };

  // Helper function to get changed fields from currentState and proposedChanges
  const getChangedFields = (
    currentState: Record<string, unknown> | null,
    proposedChanges: Record<string, unknown>
  ): Set<string> => {
    const changedFields = new Set<string>();
    
    if (!currentState) return changedFields;

    Object.keys(proposedChanges).forEach((key) => {
      // Skip internal fields
      if (key === 'id' || key === 'project' || key === 'personnel_name' || key === 'role_name' || key === 'department_name') {
        return;
      }

      const currentValue = currentState[key];
      const proposedValue = proposedChanges[key];

      // Special handling for numeric fields (amounts)
      if (key === 'amount') {
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
        (req.change_type === "PERSONNEL" || req.change_type === "COMPENSATION") &&
        req.status === "PENDING"
    );
  }, [changeRequests, currentProject?.id, user?.role]);

  // Editing states
  const [editingPersonnel, setEditingPersonnel] = useState<Personnel | null>(
    null
  );
  const [editingCompensation, setEditingCompensation] =
    useState<Compensation | null>(null);
  const [defaultCompensationType, setDefaultCompensationType] = useState<
    "SALARY" | "HONORARIA" | null
  >(null);

  // Handlers for personnel
  const handleOpenAddPersonnelModal = () => {
    setEditingPersonnel(null);
    setIsAddPersonnelModalOpen(true);
  };

  const handleOpenEditPersonnelModal = (person: Personnel) => {
    setEditingPersonnel(person);
    setIsAddPersonnelModalOpen(true);
  };

  const handleOpenDeletePersonnelModal = (person: Personnel) => {
    setEditingPersonnel(person);
    setIsDeletePersonnelModalOpen(true);
  };

  const handleCreatePersonnel = async (data: {
    first_name: string;
    last_name: string;
    role: number | null;
    department: number | null;
    employment_status: Personnel["employment_status"];
  }) => {
    if (user?.role === "Project Staff" && currentProject) {
      setPendingChangeRequest({
        changeType: 'PERSONNEL',
        operation: 'CREATE',
        entityId: null,
        currentState: null,
        proposedChanges: resolvePersonnelFields(data),
      });
      setIsSubmitChangeRequestModalOpen(true);
      setIsAddPersonnelModalOpen(false);
    } else {
      // Admin can add directly
      // addPersonnel already updates the state optimistically with the server response
      await personnel.addPersonnel(data);
    }
  };

  const handleEditPersonnel = async (data: {
    first_name: string;
    last_name: string;
    role: number | null;
    department: number | null;
    employment_status: Personnel["employment_status"];
  }) => {
    if (!editingPersonnel) return;
    
    if (user?.role === "Project Staff" && currentProject) {
      const currentState = resolvePersonnelFields({
        first_name: editingPersonnel.first_name,
        last_name: editingPersonnel.last_name,
        role: editingPersonnel.role,
        department: editingPersonnel.department,
        employment_status: editingPersonnel.employment_status,
      });
      const proposedChanges = resolvePersonnelFields(data);

      // Check for field-level conflicts with pending requests
      const fieldsBeingChanged = getChangedFields(currentState, proposedChanges);
      
      const fieldLabels: Record<string, string> = {
        first_name: "First Name",
        last_name: "Last Name",
        role: "Role",
        department: "Department",
        employment_status: "Employment Status",
      };

      // Check pending requests for the same entity
      for (const pendingReq of pendingChangeRequests) {
        if (
          pendingReq.change_type === 'PERSONNEL' &&
          pendingReq.entity_id === editingPersonnel.id &&
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
          pendingReq.change_type === 'PERSONNEL' &&
          pendingReq.entity_id === editingPersonnel.id &&
          pendingReq.operation === 'DELETE'
        ) {
          throw new Error(
            "Cannot submit change request. This personnel has a pending delete request. Please wait for admin approval or rejection."
          );
        }
      }

      setPendingChangeRequest({
        changeType: 'PERSONNEL',
        operation: 'UPDATE',
        entityId: editingPersonnel.id,
        currentState,
        proposedChanges,
      });
      setIsSubmitChangeRequestModalOpen(true);
      setIsAddPersonnelModalOpen(false);
    } else {
      await personnel.updatePersonnel(editingPersonnel.id, data);
      setEditingPersonnel(null);
      setIsAddPersonnelModalOpen(false);
    }
  };

  const handleDeletePersonnel = async () => {
    if (!editingPersonnel) return;
    
    if (user?.role === "Project Staff" && currentProject) {
      // Check if there's already a pending DELETE request for this personnel
      const hasPendingDelete = pendingChangeRequests.some(
        (req) =>
          req.change_type === 'PERSONNEL' &&
          req.entity_id === editingPersonnel.id &&
          req.operation === 'DELETE'
      );

      if (hasPendingDelete) {
        throw new Error(
          "Cannot submit change request. This personnel already has a pending delete request. Please wait for admin approval or rejection."
        );
      }

      setPendingChangeRequest({
        changeType: 'PERSONNEL',
        operation: 'DELETE',
        entityId: editingPersonnel.id,
        currentState: resolvePersonnelFields({
          first_name: editingPersonnel.first_name,
          last_name: editingPersonnel.last_name,
          role: editingPersonnel.role,
          department: editingPersonnel.department,
          employment_status: editingPersonnel.employment_status,
        }),
        proposedChanges: {},
      });
      setIsSubmitChangeRequestModalOpen(true);
      setIsDeletePersonnelModalOpen(false);
    } else {
      await personnel.deletePersonnel(editingPersonnel.id);
      setEditingPersonnel(null);
    }
  };

  // Handlers for compensation
  const handleSaveCompensation = async (data: {
    type: Compensation["type"];
    budget_item: number;
    personnel: number;
    reason: string | null;
    amount: number;
    date_effective: string;
  }) => {
    try {
      // Ensure budget_item is valid (not null or 0)
      if (!data.budget_item || data.budget_item === 0) {
        throw new Error("Budget item is required");
      }

      const payload = {
        ...data,
        amount: data.amount.toString(),
        reason: data.reason || "",
        budget_item: data.budget_item,
      };

      // Helper to resolve personnel ID to name
      const getPersonnelName = (personnelId: number): string => {
        const person = personnel.personnel.find(p => p.id === personnelId);
        if (person) {
          return `${person.first_name} ${person.last_name}`.trim();
        }
        return "";
      };

      if (user?.role === "Project Staff" && currentProject) {
        // Show change request modal for Project Staff
        if (editingCompensation) {
          // Edit Mode - resolve personnel names
          const currentPersonnelName = getPersonnelName(editingCompensation.personnel);
          const proposedPersonnelName = getPersonnelName(data.personnel);
          
          const currentState = {
            type: editingCompensation.type,
            budget_item: editingCompensation.budget_item,
            personnel: editingCompensation.personnel,
            personnel_name: currentPersonnelName,
            reason: editingCompensation.reason,
            amount: editingCompensation.amount,
            date_effective: editingCompensation.date_effective,
          };
          const proposedChanges = {
            ...payload,
            personnel_name: proposedPersonnelName,
          };

          // Check for field-level conflicts with pending requests
          const fieldsBeingChanged = getChangedFields(currentState, proposedChanges);
          
          const fieldLabels: Record<string, string> = {
            type: "Type",
            budget_item: "Budget Item",
            personnel: "Personnel",
            reason: "Reason",
            amount: "Amount",
            date_effective: "Date Effective",
          };

          // Check pending requests for the same entity
          for (const pendingReq of pendingChangeRequests) {
            if (
              pendingReq.change_type === 'COMPENSATION' &&
              pendingReq.entity_id === editingCompensation.id &&
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
              pendingReq.change_type === 'COMPENSATION' &&
              pendingReq.entity_id === editingCompensation.id &&
              pendingReq.operation === 'DELETE'
            ) {
              throw new Error(
                "Cannot submit change request. This compensation has a pending delete request. Please wait for admin approval or rejection."
              );
            }
          }

          setPendingChangeRequest({
            changeType: 'COMPENSATION',
            operation: 'UPDATE',
            entityId: editingCompensation.id,
            currentState,
            proposedChanges,
          });
        } else {
          // Create Mode - resolve personnel name
          const proposedPersonnelName = getPersonnelName(data.personnel);
          
          // Check if there's already a pending CREATE request for the same personnel and type
          const hasPendingCreate = pendingChangeRequests.some(
            (req) =>
              req.change_type === 'COMPENSATION' &&
              req.operation === 'CREATE' &&
              req.status === 'PENDING' &&
              req.proposed_changes?.personnel === data.personnel &&
              req.proposed_changes?.type === data.type
          );

          if (hasPendingCreate) {
            const typeLabel = data.type === 'SALARY' ? 'Salary' : 'Honoraria';
            throw new Error(
              `Cannot submit change request. There is already a pending ${typeLabel} compensation request for this personnel. Please wait for admin approval or rejection before submitting another request.`
            );
          }
          
          setPendingChangeRequest({
            changeType: 'COMPENSATION',
            operation: 'CREATE',
            entityId: null,
            currentState: null,
            proposedChanges: {
              ...payload,
              personnel_name: proposedPersonnelName,
            },
          });
        }
        // Close compensation modal and open change request modal
        setIsEditCompensationModalOpen(false);
        setIsSubmitChangeRequestModalOpen(true);
      } else {
        // Admin can save directly
        if (editingCompensation) {
          await updateCompensation(editingCompensation.id, payload);
        } else {
          await addCompensation(payload);
        }
        // Refresh compensation list to ensure UI is up to date
        await fetchCompensation();
        setIsEditCompensationModalOpen(false);
        setEditingPersonnel(null);
        setEditingCompensation(null);
        setDefaultCompensationType(null);
      }
    } catch (error) {
      console.error("Error saving compensation", error);
      // Re-throw error so modal can handle it
      throw error;
    }
  };

  const handleDeleteCompensation = async () => {
    if (!editingCompensation) return;
    
    // Helper to resolve personnel ID to name
    const getPersonnelName = (personnelId: number): string => {
      const person = personnel.personnel.find(p => p.id === personnelId);
      if (person) {
        return `${person.first_name} ${person.last_name}`.trim();
      }
      return "";
    };
    
    if (user?.role === "Project Staff" && currentProject) {
      const personnelName = getPersonnelName(editingCompensation.personnel);
      
      setPendingChangeRequest({
        changeType: 'COMPENSATION',
        operation: 'DELETE',
        entityId: editingCompensation.id,
        currentState: {
          type: editingCompensation.type,
          budget_item: editingCompensation.budget_item,
          personnel: editingCompensation.personnel,
          personnel_name: personnelName,
          reason: editingCompensation.reason,
          amount: editingCompensation.amount,
          date_effective: editingCompensation.date_effective,
        },
        proposedChanges: {},
      });
      setIsSubmitChangeRequestModalOpen(true);
      setIsDeleteCompensationModalOpen(false);
    } else {
      await deleteCompensation(editingCompensation.id);
      setEditingPersonnel(null);
    }
  };

  // Add honoraria
  const handleAddHonoraria = (person: Personnel) => {
    setEditingPersonnel(person);
    setEditingCompensation(null);
    setDefaultCompensationType("HONORARIA");
    setIsEditCompensationModalOpen(true);
  };

  // Add salary
  const handleAddSalary = (person: Personnel) => {
    setEditingPersonnel(person);
    setEditingCompensation(null);
    setDefaultCompensationType("SALARY");
    setIsEditCompensationModalOpen(true);
  };

  // Add compensation (generic, for empty state)
  const handleAddCompensation = (person: Personnel) => {
    setEditingPersonnel(person);
    setEditingCompensation(null);
    setDefaultCompensationType("SALARY");
    setIsEditCompensationModalOpen(true);
  };

  // Edit salary or honoraria
  const handleEditCompensation = (
    person: Personnel,
    compensationId: number
  ) => {
    const compItem = compensationList.find((c) => c.id === compensationId);
    if (!compItem) return;

    setEditingPersonnel(person);
    setEditingCompensation(compItem);
    setDefaultCompensationType(null); // Clear default type when editing
    setIsEditCompensationModalOpen(true);
  };

  // Delete salary or honoraria
  const handleDeleteCompensationItem = async (
    person: Personnel,
    compensationId: number
  ) => {
    const compItem = compensationList.find((c) => c.id === compensationId);
    if (!compItem) return;

    setEditingPersonnel(person);
    setEditingCompensation(compItem);
    setIsDeleteCompensationModalOpen(true);
  };

  // Helper wrappers to match accordion props
  const handleEditSalary = (p: Personnel, id: number) =>
    handleEditCompensation(p, id);
  const handleEditHonoraria = (p: Personnel, id: number) =>
    handleEditCompensation(p, id);

  const handleDeleteSalary = (p: Personnel, id: number) =>
    handleDeleteCompensationItem(p, id);
  const handleDeleteHonoraria = (p: Personnel, id: number) =>
    handleDeleteCompensationItem(p, id);

  // Role handlers
  // Adapter for creating a role from the modal
  const handleCreateRole = async (name: string) => {
    return await addRole({ name });
  };

  // Department handlers
  const handleCreateDepartment = async (name: string) => {
    return await addDepartment({ name });
  };

  // Personnel operations
  // Fetch compensations when accordion expands
  const handleExpandPersonnel = async () => {
    if (!currentProject) return;
    if (compensationList.length === 0 && !loadingCompensation) {
      await fetchCompensation();
    }
  };

  // Get filtered personnel
  const getFilteredPersonnel = () => {
    return filters.filterPersonnel(personnel.personnel);
  };

  const filteredPersonnel = getFilteredPersonnel();

  const compensationByPersonnel = useMemo(() => {
    const map: Record<number, typeof compensationList> = {};
    compensationList.forEach((item) => {
      if (!map[item.personnel]) {
        map[item.personnel] = [];
      }
      map[item.personnel].push(item);
    });
    return map;
  }, [compensationList]);

  const personnelServicesBudgetId = useMemo(() => {
    const psItem = budgetLineItems.find((item) => item.name === "PS");
    return psItem ? psItem.id : null;
  }, [budgetLineItems]);

  if (!currentProject) {
    return (
      <div className="p-4 sm:p-6">
        <p className="text-muted-foreground">No project selected.</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex gap-2 border-b pb-3">
        <Button
          variant={activeSection === "PERSONNEL" ? "default" : "outline"}
          onClick={() => setActiveSection("PERSONNEL")}
        >
          Personnel
        </Button>
        <Button
          variant={activeSection === "MEMBERS" ? "default" : "outline"}
          onClick={() => setActiveSection("MEMBERS")}
        >
          Project Members
        </Button>
      </div>

      {activeSection === "PERSONNEL" ? (
      <>
      {/* Header */}
      <PersonnelHeader
        projectName={currentProject.name}
        onAddPersonnel={handleOpenAddPersonnelModal}
        userRole={user?.role}
      />

      {/* Search and Filters */}
      <PersonnelFilters filters={filters} departments={departments} />

      {compensationError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          Unable to load compensation details. Please try again.
        </div>
      )}

      {/* Personnel Accordion */}
      <div className="space-y-4">
        <Accordion type="multiple" className="w-full space-y-4">
          {filteredPersonnel.map((person) => {
            const compensations = compensationByPersonnel[person.id] || [];

            return (
              <PersonnelAccordion
                key={person.id}
                personnel={person}
                compensations={compensations}
                isLoading={loadingCompensation}
                isBudgetReady={!!personnelServicesBudgetId}
                onExpand={handleExpandPersonnel}
                onEditPersonnel={handleOpenEditPersonnelModal}
                onDeletePersonnel={handleOpenDeletePersonnelModal}
                onEditSalary={handleEditSalary}
                onDeleteSalary={handleDeleteSalary}
                onAddSalary={handleAddSalary}
                onAddHonoraria={handleAddHonoraria}
                onEditHonoraria={handleEditHonoraria}
                onDeleteHonoraria={handleDeleteHonoraria}
                onAddCompensation={handleAddCompensation}
                showActions={user?.role === "Project Staff"}
                hideFinancialValues={false} // Executives can now view amounts
              />
            );
          })}
        </Accordion>
      </div>

      {/* Empty State */}
      {!personnel.loadingPersonnel && filteredPersonnel.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">
            {personnel.personnel.length === 0
              ? "No personnel added yet."
              : "No personnel match your filters."}
          </p>
        </div>
      )}

      {/* Loading State */}
      {personnel.loadingPersonnel && (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">Loading personnel...</p>
        </div>
      )}

      {/* Modals */}
      {/* Add/Edit Personnel */}
      <AddPersonnelModal
        isOpen={isAddPersonnelModalOpen}
        onClose={() => {
          setIsAddPersonnelModalOpen(false);
          setEditingPersonnel(null);
        }}
        personnel={editingPersonnel}
        onSubmit={
          editingPersonnel ? handleEditPersonnel : handleCreatePersonnel
        }
        // Pass data
        roles={roles}
        departments={departments}
        // Pass Loading States
        // Disable dropdowns if fetching lists OR saving personnel
        isLoadingOptions={loadingRole || loadingDepartment}
        isSubmittingMain={personnel.loadingPersonnel}
        // Pass the Bridge Functions
        onCreateRole={handleCreateRole}
        onCreateDepartment={handleCreateDepartment}
      />

      {/* Delete Personnel */}
      <DeletePersonnelModal
        isOpen={isDeletePersonnelModalOpen}
        onClose={() => {
          setIsDeletePersonnelModalOpen(false);
          setEditingPersonnel(null);
        }}
        onConfirm={handleDeletePersonnel}
        personnelFirstName={editingPersonnel?.first_name}
        personnelLastName={editingPersonnel?.last_name}
      />

      {/* Integrated Add/Edit Compensation Modal */}
      {editingPersonnel && (
        <EditCompensationModal
          isOpen={isEditCompensationModalOpen}
          onClose={() => {
            setIsEditCompensationModalOpen(false);
            setEditingCompensation(null);
            setDefaultCompensationType(null);
            // Only clear editingPersonnel if we're not opening change request modal
            if (!isSubmitChangeRequestModalOpen) {
              setEditingPersonnel(null);
            }
          }}
          onSubmit={handleSaveCompensation}
          compensation={editingCompensation}
          personnel={editingPersonnel}
          defaultBudgetItemId={personnelServicesBudgetId}
          defaultType={defaultCompensationType}
        />
      )}

      {/* Delete Compensation */}
      {editingCompensation && (
        <DeleteCompensationModal
          isOpen={isDeleteCompensationModalOpen}
          onClose={() => {
            setIsDeleteCompensationModalOpen(false);
            setEditingCompensation(null);
            setEditingPersonnel(null);
          }}
          onConfirm={handleDeleteCompensation}
          compensation={editingCompensation}
        />
      )}

      {/* Change Request Submission Modal */}
      {/* Only show for UPDATE/DELETE operations, not CREATE for roles/departments (but allow CREATE for personnel) */}
      {pendingChangeRequest && 
       currentProject && 
       !(pendingChangeRequest.operation === 'CREATE' && 
         (pendingChangeRequest.changeType === 'ROLE' || 
          pendingChangeRequest.changeType === 'DEPARTMENT')) && (
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
            // Clean up editing state
            setEditingPersonnel(null);
            setEditingCompensation(null);
            setDefaultCompensationType(null);
            // Refresh personnel data
            await personnel.fetchPersonnel();
            await fetchCompensation();
          }}
        />
      )}
      </>
      ) : (
        <ProjectMembersTab
          projectId={currentProject.id}
          projectName={currentProject.name}
          user={user}
        />
      )}
    </div>
  );
};

export default PersonnelLayout;
