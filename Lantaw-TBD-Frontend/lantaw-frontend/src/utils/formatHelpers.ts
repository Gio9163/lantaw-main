// Helper function to check if financial values should be hidden for executives
export const shouldHideFinancialValues = (_userRole?: string): boolean => {
  return false; // Executives can now view amounts
};

// Formats a string or number into Philippine Peso currency.
// Handles null/undefined by defaulting to 0.
// If hideForExecutive is true, returns "---" instead of the formatted amount.
export const formatCurrency = (
  amount: string | number | null,
  hideForExecutive: boolean = false
): string => {
  if (hideForExecutive) {
    return "---";
  }
  const val = Number(amount || 0);
  return new Intl.NumberFormat('en-PH', { 
    style: 'currency', 
    currency: 'PHP' 
  }).format(val);
};

// Formats a date string into a local date string.
export  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

// Formats a date string with time into a local date-time string.
// Format: "MMM DD, YYYY, HH:MM AM/PM" (e.g., "Dec 20, 2024, 02:30 PM")
// Properly handles UTC timestamps from backend and converts to user's local timezone
export const formatDateTime = (dateString: string | null): string => {
  if (!dateString || dateString === null || dateString === "null") return "Never";
  try {
    // Parse the date string - JavaScript Date automatically handles UTC if the string includes 'Z' or timezone info
    // If the string doesn't have timezone info, assume it's UTC from the backend
    let date: Date;
    if (dateString.includes('Z') || dateString.includes('+') || dateString.includes('-', 10)) {
      // String already has timezone info (e.g., "2024-12-20T14:30:00Z" or "2024-12-20T14:30:00+00:00")
      date = new Date(dateString);
    } else {
      // Assume UTC if no timezone specified (backend sends UTC timestamps)
      // Add 'Z' to indicate UTC
      date = new Date(dateString + (dateString.endsWith('Z') ? '' : 'Z'));
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return "Never";
    }
    
    // Convert to user's local timezone and format
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Never";
  }
};