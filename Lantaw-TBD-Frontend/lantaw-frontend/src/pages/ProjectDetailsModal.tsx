import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/common/dialog";
import { getProjectedExpenseSummaryByBudgetItem } from "../features/dashboard/utils/budgetMetrics";
import { OVERVIEW_COLORS } from "../features/dashboard/utils/pieChartHelper";
import type { Activity } from "../types/activity";
import type { BudgetItem } from "../features/dashboard/utils/pieChartHelper";

interface Project {
  id: number;
  name: string;
  project_leader?: string;
}

interface ProjectDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  fetchAllActivitiesForProject: (projectId: number) => Promise<Activity[]>;
}

export default function ProjectDetailsModal({
  isOpen,
  onClose,
  project,
  fetchAllActivitiesForProject,
}: ProjectDetailsModalProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [budgetData, setBudgetData] = useState<BudgetItem[]>([]);

  // Fetch activities when modal opens
  useEffect(() => {
    if (isOpen && project) {
      setLoading(true);
      setError(null);
      fetchAllActivitiesForProject(project.id)
        .then((fetchedActivities) => {
          setActivities(fetchedActivities);
          // Calculate budget distribution
          const budget = getProjectedExpenseSummaryByBudgetItem(fetchedActivities);
          setBudgetData(budget);
        })
        .catch((err) => {
          console.error("Failed to fetch activities:", err);
          setError("Failed to load project details.");
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      // Reset state when modal closes
      setActivities([]);
      setBudgetData([]);
      setError(null);
    }
  }, [isOpen, project, fetchAllActivitiesForProject]);

  // Get individual budget amounts
  const psAmount = budgetData.find((item) => item.name === "Personnel Services")?.value || 0;
  const mooeAmount = budgetData.find((item) => item.name === "MOOE")?.value || 0;
  const coAmount = budgetData.find((item) => item.name === "Capital Outlay")?.value || 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{project.name}</DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-muted-foreground">Loading project details...</p>
          </div>
        )}

        {error && (
          <div className="py-4">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-6">
            {/* Budget Distribution Section */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Projected Budget Distribution</h2>
              
              {/* Budget Amounts Text */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-md">
                  <p className="text-sm text-muted-foreground mb-1">Personnel Services (PS)</p>
                  <p className="text-lg font-semibold">₱{psAmount.toLocaleString()}</p>
                </div>
                <div className="p-4 border rounded-md">
                  <p className="text-sm text-muted-foreground mb-1">
                    Maintenance and Other Operating Expenses (MOOE)
                  </p>
                  <p className="text-lg font-semibold">₱{mooeAmount.toLocaleString()}</p>
                </div>
                <div className="p-4 border rounded-md">
                  <p className="text-sm text-muted-foreground mb-1">Capital Outlay (CO)</p>
                  <p className="text-lg font-semibold">₱{coAmount.toLocaleString()}</p>
                </div>
              </div>

              {/* Donut Chart */}
              {budgetData.length > 0 ? (
                <div className="mt-6">
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <Pie
                        data={budgetData as any}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={140}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ₱${value.toLocaleString()}`}
                        labelLine={false}
                      >
                        {budgetData.map((_, index) => (
                          <Cell
                            key={`cell-overview-${index}`}
                            fill={OVERVIEW_COLORS[index % OVERVIEW_COLORS.length]}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  <p className="text-sm">No budget data available</p>
                </div>
              )}
            </div>

            {/* Activities List Section */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Activities</h2>
              {activities.length > 0 ? (
                <div className="border rounded-md">
                  <ul className="divide-y">
                    {activities.map((activity) => (
                      <li key={activity.id} className="px-4 py-3">
                        <p className="text-sm">{activity.title}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  <p className="text-sm">No activities found for this project</p>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

