import { useState, useMemo, useEffect } from "react";
import { Filter } from "lucide-react";
import { useProject } from "../../../context/ProjectContext";
import { useAuth } from "../../../context/AuthContext";
import { useActivities } from "../../activities/hooks/useActivities";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/common/card";
import { AnalyticsFiltersComponent } from "./AnalyticsFilters";
import { ActivityExpenseChart } from "./ActivityExpenseChart";
import { Button } from "../../../components/common/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../components/common/dialog";
import {
  filterActivitiesByCategory,
  filterActivitiesByDateRange,
  getActivityExpenseData,
  getFinancialSummary,
} from "../utils/analyticsFilters";
import type { AnalyticsFilters, ChartViewType } from "../types/analytics";
import type { Activity } from "../../../types/activity";

const AnalyticsLayout = () => {
  const { currentProject } = useProject();
  const { loading: authLoading } = useAuth();
  const activities = useActivities(currentProject?.id ?? null);
  const { objectives, activitiesMap, fetchActivities } = activities;

  // Fetch all activities for all objectives when component mounts or objectives change
  useEffect(() => {
    objectives.forEach((objective) => {
      // Fetch activities if they haven't been loaded yet
      if (!activitiesMap[objective.id]) {
        fetchActivities(objective.id);
      }
    });
  }, [objectives, activitiesMap, fetchActivities]);

  // Flatten all activities from all objectives
  const allActivities: Activity[] = useMemo(() => {
    return activities.objectives.flatMap((objective) => {
      // Use activitiesMap if available, otherwise fall back to objective.activities
      const objectiveActivities =
        activities.activitiesMap[objective.id] || objective.activities || [];
      return objectiveActivities.map((activity) => ({
        ...activity,
        objective: objective.id,
      }));
    });
  }, [activities.objectives, activities.activitiesMap]);

  const objectiveNames = useMemo(
    () =>
      new Map(
        activities.objectives.map((objective) => [objective.id, objective.title])
      ),
    [activities.objectives]
  );

  // Filter state
  const [filters, setFilters] = useState<AnalyticsFilters>({
    category: "ALL",
    startDate: null,
    endDate: null,
  });

  // Chart view type state
  const [chartViewType, setChartViewType] = useState<ChartViewType>("COLUMN");

  // Mobile filters modal
  const [filtersModalOpen, setFiltersModalOpen] = useState(false);

  // Apply filters to activities
  const filteredActivities = useMemo(() => {
    let filtered = allActivities;

    // Filter by category
    filtered = filterActivitiesByCategory(filtered, filters.category);

    // Filter by date range
    filtered = filterActivitiesByDateRange(
      filtered,
      filters.startDate,
      filters.endDate
    );

    return filtered;
  }, [allActivities, filters]);

  // Transform filtered activities to chart data
  const chartData = useMemo(() => {
    return getActivityExpenseData(filteredActivities, objectiveNames);
  }, [filteredActivities, objectiveNames]);

  const financialSummary = useMemo(
    () => getFinancialSummary(chartData),
    [chartData]
  );

  // Helper function to check if financial values should be hidden
  const hideFinancialValues = false; // Executives can now view amounts

  const isLoading =
    authLoading ||
    activities.loadingObjectives ||
    Object.values(activities.loadingActivities).some(Boolean);

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-4">
        <div className="bg-card border border-border rounded-lg p-6">
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="p-4 sm:p-6 space-y-4">
        <h2 className="text-2xl font-semibold">Analytics</h2>
        <div className="bg-card border border-border rounded-lg p-6">
          <p className="text-muted-foreground mb-4">
            No project selected. Please select a project from the sidebar or create a new one.
          </p>
        </div>
      </div>
    );
  }

  if (activities.error) {
    return (
      <div className="p-4 sm:p-6 space-y-4">
        <h2 className="text-2xl font-semibold">Analytics</h2>
        <div className="bg-card border border-border rounded-lg p-6 space-y-3">
          <p className="text-destructive">
            Unable to load activity financial data. Please try again.
          </p>
          <Button onClick={() => void activities.fetchObjectives()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Analytics</h2>
          <p className="text-sm text-muted-foreground">
            Track and analyze expenses by activities with advanced filtering
          </p>
        </div>

        {/* Mobile filter modal trigger */}
        <div className="sm:hidden">
          <Dialog
            open={filtersModalOpen}
            onOpenChange={setFiltersModalOpen}
          >
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="size-4" />
                <span>Filter</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Filter</DialogTitle>
              </DialogHeader>
              <div className="pt-2">
                <AnalyticsFiltersComponent
                  filters={filters}
                  onFiltersChange={setFilters}
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card className="hidden sm:flex">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <AnalyticsFiltersComponent
            filters={filters}
            onFiltersChange={setFilters}
          />
        </CardContent>
      </Card>

      {/* Chart */}
      <ActivityExpenseChart
        data={chartData}
        summary={financialSummary}
        hideFinancialValues={hideFinancialValues}
        viewType={chartViewType}
        onViewTypeChange={setChartViewType}
      />

      {/* Summary Info */}
      {filteredActivities.length === 0 && allActivities.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">
              No activities match the selected filters. Try adjusting your filter criteria.
            </p>
          </CardContent>
        </Card>
      )}

      {allActivities.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">
              No activities found for this project.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AnalyticsLayout;
