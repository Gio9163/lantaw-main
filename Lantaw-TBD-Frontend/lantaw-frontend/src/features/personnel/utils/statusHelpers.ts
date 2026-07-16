// Provide consistent styling and color schemes for different status types across the personnel feature.


export interface StatusStyle {
    text: string;
}

// Get styling for compensation type. 
export const getCompensationTypeColor = (type: string): StatusStyle => {
    switch (type) {
        case "SALARY":
            return {
                text: "text-green-700",
            };
        case "HONORARIUM":
            return {
                text: "text-red-700",
            };
        default:
            return {
                text: "text-gray-700",
            };
    }
}

// Get styling for badge employment status
export const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-50 text-green-700 border-green-200";
      case "INACTIVE":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "TERMINATED":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };


// Get styling for status text employment status
export const getStatusMarkerColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-500";
      case "INACTIVE":
        return "bg-yellow-500";
      case "TERMINATED":
        return "bg-red-500";
      default:
        return "bg-gray-400";
    }
  };