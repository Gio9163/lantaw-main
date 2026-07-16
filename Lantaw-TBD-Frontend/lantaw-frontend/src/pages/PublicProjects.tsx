import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { Button } from "../components/common/button";
import { Input } from "../components/common/input";
import { useAuth } from "../context/AuthContext";
import type { Activity } from "../types/activity";
import type { Objective } from "../types/objective";
import ProjectDetailsModal from "./ProjectDetailsModal";

interface Project {
  id: number;
  name: string;
  project_leader?: string;
}

type ActivityStatus = "Active" | "Inactive" | "Completed" | "Unknown";

export default function PublicProjects() {
  const navigate = useNavigate();
  const { loading: authLoading } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activityStatuses, setActivityStatuses] = useState<Record<number, ActivityStatus>>({});
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Function to fetch all activities for a project
  const fetchAllActivitiesForProject = async (projectId: number): Promise<Activity[]> => {
    try {
      // Fetch all objectives for the project
      const objectivesResponse = await api.get<{ results: Objective[] }>(
        `/api/projects/${projectId}/objectives/`
      );
      const objectives = Array.isArray(objectivesResponse.data)
        ? objectivesResponse.data
        : (objectivesResponse.data?.results || []);

      // Fetch activities for each objective in parallel
      const activityPromises = objectives.map(async (objective) => {
        try {
          const activitiesResponse = await api.get<{ results: Activity[] }>(
            `/api/projects/${projectId}/objectives/${objective.id}/activities/`
          );
          return Array.isArray(activitiesResponse.data)
            ? activitiesResponse.data
            : (activitiesResponse.data?.results || []);
        } catch (err) {
          console.error(`Failed to fetch activities for objective ${objective.id}:`, err);
          return [];
        }
      });

      const activitiesArrays = await Promise.all(activityPromises);
      // Flatten all activities into a single array
      return activitiesArrays.flat();
    } catch (err) {
      console.error(`Failed to fetch activities for project ${projectId}:`, err);
      return [];
    }
  };

  // Function to calculate activity status based on all activities
  const calculateActivityStatus = (activities: Activity[]): ActivityStatus => {
    if (activities.length === 0) {
      return "Inactive";
    }

    // Check if any activity is ACTIVE
    const hasActive = activities.some((activity) => activity.activity_status === "ACTIVE");
    if (hasActive) {
      return "Active";
    }

    // Check if all activities are COMPLETED
    const allCompleted = activities.every(
      (activity) => activity.activity_status === "COMPLETED"
    );
    if (allCompleted) {
      return "Completed";
    }

    // Check if all activities are PENDING
    const allPending = activities.every(
      (activity) => activity.activity_status === "PENDING"
    );
    if (allPending) {
      return "Inactive";
    }

    // Mixed statuses - find the most common status
    const statusCounts: Record<string, number> = {};
    activities.forEach((activity) => {
      const status = activity.activity_status;
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    const mostCommonStatus = Object.entries(statusCounts).reduce((a, b) =>
      a[1] > b[1] ? a : b
    )[0];

    // Map status to display value
    if (mostCommonStatus === "COMPLETED") {
      return "Completed";
    } else if (mostCommonStatus === "PENDING") {
      return "Inactive";
    } else {
      return "Active";
    }
  };

  // First effect: Fetch projects (always runs)
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await api.get("/api/projects-public/");
        const data = response.data;
        const items: Project[] = Array.isArray(data) ? data : [];
        setProjects(items);
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch projects", err);
        setError("Unable to load projects.");
        setLoading(false);
      }
    };

    fetchProjects();
  }, []); // No dependencies - always fetch projects

  // Second effect: Fetch activities (runs after auth is determined and projects are loaded)
  useEffect(() => {
    // Don't fetch if auth is still loading or if no projects
    if (authLoading || projects.length === 0) {
      return;
    }

    // Fetch activities for all users (public access)
    setLoadingActivities(true);
    const fetchActivities = async () => {
      try {
        const activityPromises = projects.map(async (project) => {
          const activities = await fetchAllActivitiesForProject(project.id);
          const status = calculateActivityStatus(activities);
          return { projectId: project.id, status };
        });

        const results = await Promise.all(activityPromises);
        const statusMap: Record<number, ActivityStatus> = {};
        results.forEach(({ projectId, status }) => {
          statusMap[projectId] = status;
        });
        setActivityStatuses(statusMap);
      } catch (err) {
        console.error("Failed to fetch activity statuses:", err);
        // Set all to Unknown on error
        const unknownMap: Record<number, ActivityStatus> = {};
        projects.forEach((project) => {
          unknownMap[project.id] = "Unknown";
        });
        setActivityStatuses(unknownMap);
      } finally {
        setLoadingActivities(false);
      }
    };

    fetchActivities();
  }, [authLoading, projects]); // Depend on auth loading state and projects

  // Filter projects based on search query
  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) {
      return projects;
    }
    const query = searchQuery.toLowerCase().trim();
    return projects.filter(
      (project) =>
        project.name.toLowerCase().includes(query) ||
        (project.project_leader?.toLowerCase().includes(query) ?? false)
    );
  }, [projects, searchQuery]);

  const handleProjectClick = (project: Project) => {
    setSelectedProject(project);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProject(null);
  };

  const getStatusStyle = (status: ActivityStatus | undefined) => {
    if (!status || status === "Unknown") {
      return "text-muted-foreground";
    }

    switch (status) {
      case "Active":
        return "text-green-600 font-medium";
      case "Completed":
        return "text-blue-600 font-medium";
      case "Inactive":
        return "text-gray-600";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="flex items-center justify-between px-8 py-6 border-b">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate("/")}>
            Back
          </Button>
        
        </div>
      
      </header>

      <main className="flex-1 flex flex-col items-center justify-start px-4 py-10">
        <div className="w-full max-w-2xl">
          <h1 className="text-2xl font-bold mb-4">Projects :</h1>

          {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
          {error && <p className="text-sm text-red-500">{error}</p>}

          {!loading && !error && projects.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No projects found.
            </p>
          )}

          {!loading && !error && projects.length > 0 && (
            <div className="mb-4">
              <Input
                type="text"
                placeholder="Search by project name or leader..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
          )}

          {!loading && !error && filteredProjects.length === 0 && projects.length > 0 && (
            <p className="text-sm text-muted-foreground">
              No projects match your search.
            </p>
          )}

          {!loading && !error && filteredProjects.length > 0 && (
            <div className="w-full">
              {/* Mobile: stacked cards */}
              <div className="sm:hidden space-y-3">
                {filteredProjects.map((project) => {
                  const status = activityStatuses[project.id];

                  return (
                    <div
                      key={project.id}
                      className="rounded-md border bg-card p-4"
                    >
                      <button
                        type="button"
                        onClick={() => handleProjectClick(project)}
                        className="text-left font-medium text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded"
                      >
                        {project.name}
                      </button>

                      <div className="mt-3 flex items-center justify-between gap-4">
                        <div className="text-sm text-muted-foreground">
                          Activities
                        </div>
                        <div className="text-sm">
                          {loadingActivities ? (
                            <span className="text-muted-foreground">Loading...</span>
                          ) : (
                            <span className={getStatusStyle(status)}>
                              {status || "-"}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-2 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground mr-1">
                          Leader:
                        </span>
                        {project.project_leader || "-"}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop: table */}
              <div className="hidden sm:block overflow-x-auto rounded-md border bg-card [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:bg-muted">
                <table className="w-full min-w-[500px]">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        NAME
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        ACTIVITIES
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        LEADER
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProjects.map((project) => {
                      const status = activityStatuses[project.id];

                      return (
                        <tr key={project.id} className="border-t">
                          <td className="px-4 py-3 text-sm">
                            <button
                              onClick={() => handleProjectClick(project)}
                              className="text-left hover:underline cursor-pointer font-medium text-primary"
                            >
                              {project.name}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {loadingActivities ? (
                              <span className="text-muted-foreground">Loading...</span>
                            ) : (
                              <span className={getStatusStyle(status)}>
                                {status || "-"}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {project.project_leader || "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {selectedProject && (
        <ProjectDetailsModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          project={selectedProject}
          fetchAllActivitiesForProject={fetchAllActivitiesForProject}
        />
      )}
    </div>
  );
}

