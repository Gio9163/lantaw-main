// Provide consistent styling and color schemes for different status types across the activities feature.

export type ProjectStatus = "ACTIVE" | "INACTIVE" | "DONE" | "ON_HOLD";
export type ActivityStatus = "ACTIVE" | "PENDING" | "COMPLETED";

export interface StatusStyle {
  bg: string;
  text: string;
  badge: string;
}

// Get styling for project status
export const getProjectStatusStyle = (status: string): StatusStyle => {
  switch (status) {
    case "ACTIVE":
      return {
        bg: "bg-green-500",
        text: "text-green-700",
        badge: "bg-green-50 text-green-700 border-green-200",
      };
    case "INACTIVE":
    case "ON_HOLD":
      return {
        bg: "bg-gray-400",
        text: "text-gray-700",
        badge: "bg-gray-50 text-gray-700 border-gray-200",
      };
    case "DONE":
    case "COMPLETED":
      return {
        bg: "bg-blue-500",
        text: "text-blue-700",
        badge: "bg-blue-50 text-blue-700 border-blue-200",
      };
    default:
      return {
        bg: "bg-gray-400",
        text: "text-gray-700",
        badge: "bg-gray-50 text-gray-700 border-gray-200",
      };
  }
};

// Get styling for activity status
export const getActivityStatusColor = (status: string): StatusStyle => {
  switch (status) {
    case "ACTIVE":
      return {
        bg: "bg-green-500",
        text: "text-green-700",
        badge: "bg-green-50 text-green-700 border-green-200",
      };
    case "PENDING":
      return {
        bg: "bg-gray-400",
        text: "text-gray-700",
        badge: "bg-gray-50 text-gray-700 border-gray-200",
      };
    case "COMPLETED":
      return {
        bg: "bg-blue-500",
        text: "text-blue-700",
        badge: "bg-blue-50 text-blue-700 border-blue-200",
      };
    default:
      return {
        bg: "bg-gray-400",
        text: "text-gray-700",
        badge: "bg-gray-50 text-gray-700 border-gray-200",
      };
  }
};

// Get badge color for budget line items
export const getBudgetBadgeColor = (
  itemName: string | null | undefined
): string => {
  if (!itemName) return "bg-gray-50 text-gray-700 border-gray-200";

  // Handle both string and object types
  const name = typeof itemName === "string" ? itemName : itemName;

  switch (name) {
    case "PS":
      return "bg-teal-50 text-teal-700 border-teal-200";
    case "MOOE":
      return "bg-orange-50 text-orange-700 border-orange-200";
    case "CO":
      return "bg-purple-50 text-purple-700 border-purple-200";
    default:
      return "bg-gray-50 text-gray-700 border-gray-200";
  }
};

