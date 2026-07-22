// Main orchestrator component for change requests management.

import { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useChangeRequests } from "../hooks/useChangeRequests";
import { useChangeRequestFilters } from "../hooks/useChangeRequestFilters";
import { ChangeRequestsHeader } from "./ChangeRequestsHeader";
import { ChangeRequestCard } from "./ChangeRequestCard";
import { ChangeRequestDetail } from "./ChangeRequestDetail";
import { ApproveChangeRequestModal } from "./modals/ApproveChangeRequestModal";
import { RejectChangeRequestModal } from "./modals/RejectChangeRequestModal";
import { RevertChangeRequestModal } from "./modals/RevertChangeRequestModal";
import { CancelChangeRequestModal } from "./modals/CancelChangeRequestModal";
import { EditResubmitChangeRequestModal } from "./modals/EditResubmitChangeRequestModal";
import { Card, CardContent } from "../../../components/common/card";
import { Pagination } from "../../../components/common/pagination";
import type { ChangeRequest, ChangeRequestResubmitData } from "../../../types/changeRequest";
import type { Project } from "../../../types/project";
import api from "../../../api/client";

interface ChangeRequestsLayoutProps {
  projectId?: number | null;
}

export const ChangeRequestsLayout: React.FC<ChangeRequestsLayoutProps> = ({
  projectId = null,
}) => {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";
  const isProjectStaff = user?.role === "Project Staff";
  const changeRequests = useChangeRequests(projectId);
  const filters = useChangeRequestFilters();

  // View state
  const [selectedRequest, setSelectedRequest] = useState<ChangeRequest | null>(null);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isRevertModalOpen, setIsRevertModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isResubmitModalOpen, setIsResubmitModalOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Fetch projects for Admin and Project Staff filters
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        let projectData: Project[] = [];
        
        if (isAdmin) {
          // Admin: fetch all projects
          const response = await api.get("/api/projects/");
          // Handle paginated response (Django REST Framework returns { results: [...] })
          projectData = Array.isArray(response.data) 
            ? response.data 
            : (response.data.results || []);
        } else if (isProjectStaff && user?.projects?.length) {
          // Project Staff: fetch only assigned projects
          const responses = await Promise.all(
            user.projects.map((id) => api.get(`/api/projects/${id}/`))
          );
          projectData = responses.map((res) => res.data);
        }
        
        setProjects(projectData);
      } catch (err) {
        console.error("Failed to fetch projects:", err);
        setProjects([]);
      }
    };
    
    if (isAdmin || isProjectStaff) {
      fetchProjects();
    }
  }, [isAdmin, isProjectStaff, user?.projects]);

  // Refetch when filters change
  useEffect(() => {
    changeRequests.fetchChangeRequests(projectId || undefined, filters.filters);
    // Reset to page 1 when filters change
    setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters.filters), projectId]);

  // Filtered change requests
  const filteredRequests = changeRequests.changeRequests.filter((req) => {
    if (filters.filters.status && req.status !== filters.filters.status) return false;
    if (filters.filters.change_type && req.change_type !== filters.filters.change_type) return false;
    if (filters.filters.operation && req.operation !== filters.filters.operation) return false;
    if (filters.filters.project && req.project !== filters.filters.project) return false;
    return true;
  });

  // Ensure current page is valid when filtered results change
  useEffect(() => {
    const totalPages = Math.ceil(filteredRequests.length / pageSize);
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    } else if (currentPage < 1 && filteredRequests.length > 0) {
      setCurrentPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredRequests.length, pageSize]);

  // Handlers
  const handleViewDetails = (request: ChangeRequest) => {
    setSelectedRequest(request);
  };

  const handleBackToList = () => {
    setSelectedRequest(null);
  };

  const handleApproveClick = (request: ChangeRequest) => {
    setSelectedRequest(request);
    setIsApproveModalOpen(true);
  };

  const handleRejectClick = (request: ChangeRequest) => {
    setSelectedRequest(request);
    setIsRejectModalOpen(true);
  };

  const handleRevertClick = (request: ChangeRequest) => {
    setSelectedRequest(request);
    setIsRevertModalOpen(true);
  };

  const handleCancelClick = (request: ChangeRequest) => {
    setSelectedRequest(request);
    setIsCancelModalOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    await changeRequests.approveChangeRequest(selectedRequest.project, selectedRequest.id);
    setIsApproveModalOpen(false);
    await changeRequests.fetchChangeRequests(projectId || undefined, filters.filters);
    const updatedRequest = await changeRequests.fetchChangeRequestById(selectedRequest.project, selectedRequest.id);
    if (updatedRequest) {
      setSelectedRequest(updatedRequest);
    }
  };

  const handleReject = async (reason: string) => {
    if (!selectedRequest) return;
    await changeRequests.rejectChangeRequest(selectedRequest.project, selectedRequest.id, reason);
    setIsRejectModalOpen(false);
    await changeRequests.fetchChangeRequests(projectId || undefined, filters.filters);
    const updatedRequest = await changeRequests.fetchChangeRequestById(selectedRequest.project, selectedRequest.id);
    if (updatedRequest) {
      setSelectedRequest(updatedRequest);
    }
  };

  const handleRevert = async (feedback: string) => {
    if (!selectedRequest) return;
    await changeRequests.revertChangeRequest(
      selectedRequest.project,
      selectedRequest.id,
      feedback
    );
    setIsRevertModalOpen(false);
    await changeRequests.fetchChangeRequests(projectId || undefined, filters.filters);
    const updatedRequest = await changeRequests.fetchChangeRequestById(
      selectedRequest.project,
      selectedRequest.id
    );
    if (updatedRequest) setSelectedRequest(updatedRequest);
  };

  const handleArchive = async (request: ChangeRequest) => {
    await changeRequests.archiveChangeRequest(request.project, request.id);
    if (selectedRequest?.id === request.id) {
      setSelectedRequest(null);
    }
    await changeRequests.fetchChangeRequests(projectId || undefined, filters.filters);
  };

  const handleResubmit = async (data: ChangeRequestResubmitData) => {
    if (!selectedRequest) return;
    await changeRequests.resubmitChangeRequest(selectedRequest.project, selectedRequest.id, data);
    setIsResubmitModalOpen(false);
    const updatedRequest = await changeRequests.fetchChangeRequestById(selectedRequest.project, selectedRequest.id);
    if (updatedRequest) {
      setSelectedRequest(updatedRequest);
    }
    await changeRequests.fetchChangeRequests(projectId || undefined, filters.filters);
  };

  const handleCancel = async (reason: string) => {
    if (!selectedRequest) return;
    await changeRequests.cancelChangeRequest(selectedRequest.project, selectedRequest.id, reason);
    setIsCancelModalOpen(false);
    await changeRequests.fetchChangeRequests(projectId || undefined, filters.filters);
    const updatedRequest = await changeRequests.fetchChangeRequestById(selectedRequest.project, selectedRequest.id);
    if (updatedRequest) {
      setSelectedRequest(updatedRequest);
    }
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredRequests.length / pageSize);
  const paginatedRequests = filteredRequests.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Handle page size change
  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    // Recalculate current page to ensure it doesn't exceed total pages
    const newTotalPages = Math.ceil(filteredRequests.length / newPageSize);
    if (currentPage > newTotalPages) {
      setCurrentPage(newTotalPages > 0 ? newTotalPages : 1);
    }
  };

  // Detail view
  if (selectedRequest) {
    return (
      <>
        <ChangeRequestDetail
          changeRequest={selectedRequest}
          onBack={handleBackToList}
          onApprove={isAdmin ? () => handleApproveClick(selectedRequest) : undefined}
          onReject={isAdmin ? () => handleRejectClick(selectedRequest) : undefined}
          onArchive={isAdmin ? () => handleArchive(selectedRequest) : undefined}
          onRevert={isAdmin ? () => handleRevertClick(selectedRequest) : undefined}
          onResubmit={isProjectStaff ? () => setIsResubmitModalOpen(true) : undefined}
          onCancel={isProjectStaff ? () => handleCancelClick(selectedRequest) : undefined}
          showActions={isAdmin}
        />
        {isAdmin && (
          <>
            <ApproveChangeRequestModal
              open={isApproveModalOpen}
              onOpenChange={setIsApproveModalOpen}
              changeRequest={selectedRequest}
              onApprove={handleApprove}
            />
            <RejectChangeRequestModal
              open={isRejectModalOpen}
              onOpenChange={setIsRejectModalOpen}
              changeRequest={selectedRequest}
              onReject={handleReject}
            />
            <RevertChangeRequestModal
              open={isRevertModalOpen}
              onOpenChange={setIsRevertModalOpen}
              changeRequest={selectedRequest}
              onRevert={handleRevert}
            />
          </>
        )}
        {isProjectStaff && (
          <>
            <EditResubmitChangeRequestModal
              open={isResubmitModalOpen}
              onOpenChange={setIsResubmitModalOpen}
              changeRequest={selectedRequest}
              onResubmit={handleResubmit}
            />
            <CancelChangeRequestModal
              open={isCancelModalOpen}
              onOpenChange={setIsCancelModalOpen}
              changeRequest={selectedRequest}
              onCancel={handleCancel}
            />
          </>
        )}
      </>
    );
  }

  // List view
  return (
    <div className="space-y-6">
      <ChangeRequestsHeader
        filters={filters}
        isAdmin={isAdmin}
        projects={projects}
        pageSize={pageSize}
        onPageSizeChange={handlePageSizeChange}
      />

      {changeRequests.loading ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Loading change requests...</p>
          </CardContent>
        </Card>
      ) : changeRequests.error ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-destructive">
              Error: {changeRequests.error.message}
            </p>
          </CardContent>
        </Card>
      ) : filteredRequests.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              {Object.keys(filters.filters).length > 0
                ? "No change requests match the selected filters."
                : "No change requests found."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            {paginatedRequests.map((request) => (
              <ChangeRequestCard
                key={request.id}
                changeRequest={request}
                onViewDetails={handleViewDetails}
                onApprove={isAdmin ? handleApproveClick : undefined}
                onReject={isAdmin ? handleRejectClick : undefined}
                onArchive={isAdmin ? handleArchive : undefined}
                onRevert={isAdmin ? handleRevertClick : undefined}
                onCancel={isProjectStaff ? handleCancelClick : undefined}
                showActions={isAdmin}
              />
            ))}
          </div>

          {/* Pagination */}
          {filteredRequests.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredRequests.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
            />
          )}
        </>
      )}

      {isAdmin && selectedRequest && (
        <>
          <ApproveChangeRequestModal
            open={isApproveModalOpen}
            onOpenChange={setIsApproveModalOpen}
            changeRequest={selectedRequest}
            onApprove={handleApprove}
          />
          <RejectChangeRequestModal
            open={isRejectModalOpen}
            onOpenChange={setIsRejectModalOpen}
            changeRequest={selectedRequest}
            onReject={handleReject}
          />
        </>
      )}
      {isProjectStaff && selectedRequest && (
        <CancelChangeRequestModal
          open={isCancelModalOpen}
          onOpenChange={setIsCancelModalOpen}
          changeRequest={selectedRequest}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
};
