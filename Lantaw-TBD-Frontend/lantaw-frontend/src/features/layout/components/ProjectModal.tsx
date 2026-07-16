import React, { useEffect, useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../../components/common/dialog";
import { Label } from "../../../components/common/label";
import { Input } from "../../../components/common/input";
import { TextArea } from "../../../components/common/textarea";
import { Button } from "../../../components/common/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/common/select";

interface ProjectFormData {
  name: string;
  projectLeader: string;
  description: string;
  totalGrant: string;
  duration: string;
  startDate: string;
  endDate: string;
  projectStaff: string;
}

interface BudgetItem {
  id?: number;
  category: 'PS' | 'MOOE' | 'CO';
  description: string;
  amount: string;
}

type BudgetCategory = {
  ps: BudgetItem[];
  mooe: BudgetItem[];
  co: BudgetItem[];
};

interface ProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEdit?: boolean;
  formData: ProjectFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProjectFormData>>;
  onSubmit: () => void;
  checkStaffExists?: (email: string) => Promise<boolean>;
  userRole?: string;
  error?: string;
  initialBudgetItems?: BudgetCategory;
  onBudgetItemsChange?: (budgetItems: BudgetCategory) => void;
}

type FormErrors = Partial<Record<keyof ProjectFormData, string>>;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Helper function to calculate end date from start date + duration
// End date is calculated as the day BEFORE the anniversary date
// e.g., Start: Feb 2, 2026, Duration: 1 year → End: Feb 1, 2027
const calculateEndDate = (startDate: string, duration: string): string => {
  if (!startDate || !duration) return "";
  // Parse the date string to avoid timezone issues
  const [year, month, day] = startDate.split('-').map(Number);
  const start = new Date(year, month - 1, day); // month is 0-indexed
  start.setFullYear(start.getFullYear() + parseInt(duration));
  // Subtract 1 day to get the day before the anniversary
  start.setDate(start.getDate() - 1);
  // Format as YYYY-MM-DD without timezone conversion
  const endYear = start.getFullYear();
  const endMonth = String(start.getMonth() + 1).padStart(2, '0');
  const endDay = String(start.getDate()).padStart(2, '0');
  return `${endYear}-${endMonth}-${endDay}`;
};

const ProjectModal: React.FC<ProjectModalProps> = ({
  open,
  onOpenChange,
  isEdit = false, // Default to false (create mode)
  formData,
  setFormData,
  onSubmit,
  checkStaffExists,
  userRole: _userRole,
  error,
  initialBudgetItems,
  onBudgetItemsChange,
}) => {
  const hideFinancialValues = false; // Executives can now view amounts
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [checkingStaff, setCheckingStaff] = useState(false);
  
  // Budget items state
  const [budgetItems, setBudgetItems] = useState<BudgetCategory>({
    ps: [],
    mooe: [],
    co: [],
  });
  const [addingItemTo, setAddingItemTo] = useState<'ps' | 'mooe' | 'co' | null>(null);
  const [editingItem, setEditingItem] = useState<{ category: 'ps' | 'mooe' | 'co', index: number } | null>(null);
  const [newItemDescription, setNewItemDescription] = useState('');
  const [newItemAmount, setNewItemAmount] = useState('');
  const [editItemDescription, setEditItemDescription] = useState('');
  const [editItemAmount, setEditItemAmount] = useState('');
  const isInitializingRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const prevInitialBudgetItemsRef = useRef<string>('');

  useEffect(() => {
    // Reset errors when modal open/close
    if (!open) {
      setFormErrors({});
      setAddingItemTo(null);
      setEditingItem(null);
      setNewItemDescription('');
      setNewItemAmount('');
      setEditItemDescription('');
      setEditItemAmount('');
      hasInitializedRef.current = false;
      isInitializingRef.current = false;
      prevInitialBudgetItemsRef.current = '';
    } else if (open) {
      // Initialize when modal opens
      if (!hasInitializedRef.current) {
        // First time opening - initialize
        isInitializingRef.current = true;
        if (isEdit && initialBudgetItems) {
          // Load initial budget items when editing
          const itemsStr = JSON.stringify(initialBudgetItems);
          prevInitialBudgetItemsRef.current = itemsStr;
          setBudgetItems(initialBudgetItems);
        } else if (!isEdit) {
          // Reset budget items for new project
          setBudgetItems({ ps: [], mooe: [], co: [] });
        }
        hasInitializedRef.current = true;
        isInitializingRef.current = false;
      } else if (isEdit && initialBudgetItems) {
        // Modal is already open, check if initialBudgetItems changed (data loaded after modal opened)
        const newItemsStr = JSON.stringify(initialBudgetItems);
        const prevItemsStr = prevInitialBudgetItemsRef.current;
        
        // Only update if:
        // 1. The initialBudgetItems actually changed (different from previous)
        // 2. Current budgetItems is empty (meaning we haven't loaded data yet)
        // 3. We're not currently initializing
        const currentItemsEmpty = budgetItems.ps.length === 0 && 
                                  budgetItems.mooe.length === 0 && 
                                  budgetItems.co.length === 0;
        
        if (newItemsStr !== prevItemsStr && currentItemsEmpty && !isInitializingRef.current) {
          isInitializingRef.current = true;
          prevInitialBudgetItemsRef.current = newItemsStr;
          setBudgetItems(initialBudgetItems);
          isInitializingRef.current = false;
        } else if (newItemsStr !== prevItemsStr) {
          // Update the ref even if we don't update state, to track the change
          prevInitialBudgetItemsRef.current = newItemsStr;
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isEdit, initialBudgetItems]);
  
  // Sync budget items changes to parent component (only after initialization)
  useEffect(() => {
    if (onBudgetItemsChange && hasInitializedRef.current && !isInitializingRef.current) {
      onBudgetItemsChange(budgetItems);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [budgetItems]);
  
  // Calculate category subtotal
  const calculateCategorySubtotal = (category: 'ps' | 'mooe' | 'co'): number => {
    return budgetItems[category].reduce((sum, item) => {
      const amount = parseFloat(item.amount) || 0;
      return sum + amount;
    }, 0);
  };
  
  // Calculate total grant amount
  const calculateTotalGrant = (): number => {
    return calculateCategorySubtotal('ps') + 
           calculateCategorySubtotal('mooe') + 
           calculateCategorySubtotal('co');
  };
  
  // Sync totalGrant with calculated total
  useEffect(() => {
    const total = calculateTotalGrant();
    setFormData((prev) => {
      if (prev.totalGrant !== total.toString()) {
        return { ...prev, totalGrant: total.toString() };
      }
      return prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [budgetItems]);

  // Auto-calculate End Date when Start Date or Duration changes
  useEffect(() => {
    if (formData.startDate && formData.duration) {
      const calculatedEndDate = calculateEndDate(formData.startDate, formData.duration);
      if (calculatedEndDate) {
        // Check if calculated end date has the same DAY (day of month) as start date
        const startDay = formData.startDate.split('-')[2];
        const calculatedEndDay = calculatedEndDate.split('-')[2];
        let finalEndDate = calculatedEndDate;
        
        if (startDay === calculatedEndDay) {
          // Parse date to avoid timezone issues and subtract 1 more day
          const [year, month, day] = calculatedEndDate.split('-').map(Number);
          const end = new Date(year, month - 1, day);
          end.setDate(end.getDate() - 1);
          const endYear = end.getFullYear();
          const endMonth = String(end.getMonth() + 1).padStart(2, '0');
          const endDayAdjusted = String(end.getDate()).padStart(2, '0');
          finalEndDate = `${endYear}-${endMonth}-${endDayAdjusted}`;
        }
        
        // Update end date (only if it changed to avoid infinite loops)
        setFormData((prev) => {
          if (prev.endDate !== finalEndDate) {
            return { ...prev, endDate: finalEndDate };
          }
          return prev;
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.startDate, formData.duration]);

  // Auto-adjust End Date if it's on the same DAY as Start Date (for manual edits or edge cases)
  useEffect(() => {
    if (formData.startDate && formData.endDate) {
      // Check if the DAY (day of month) is the same
      const startDay = formData.startDate.split('-')[2]; // Extract day (YYYY-MM-DD format)
      const endDay = formData.endDate.split('-')[2]; // Extract day (YYYY-MM-DD format)
      
      if (startDay === endDay) {
        // Update error message with countdown starting at 5
        setFormErrors((prev) => ({
          ...prev,
          endDate: "End date cannot be on the same day of the month as start date. Auto-adjusting in 5...",
        }));
        
        // Countdown timer from 5 to 0
        let countdown = 5;
        const countdownInterval = setInterval(() => {
          countdown -= 1;
          setFormErrors((prev) => ({
            ...prev,
            endDate: `End date cannot be on the same day of the month as start date. Auto-adjusting in ${countdown}...`,
          }));
          
          if (countdown <= 0) {
            clearInterval(countdownInterval);
            // Parse date to avoid timezone issues
            const [year, month, day] = formData.endDate.split('-').map(Number);
            const end = new Date(year, month - 1, day);
            end.setDate(end.getDate() - 1);
            const endYear = end.getFullYear();
            const endMonth = String(end.getMonth() + 1).padStart(2, '0');
            const endDayAdjusted = String(end.getDate()).padStart(2, '0');
            const adjustedEndDate = `${endYear}-${endMonth}-${endDayAdjusted}`;
            
            setFormData((prev) => {
              // Check if day is still the same before adjusting
              const prevStartDay = prev.startDate?.split('-')[2];
              const prevEndDay = prev.endDate?.split('-')[2];
              if (prevStartDay === prevEndDay && prev.endDate !== adjustedEndDate) {
                return { ...prev, endDate: adjustedEndDate };
              }
              return prev;
            });
            
            // Clear error after adjustment
            setTimeout(() => {
              setFormErrors((prev) => ({ ...prev, endDate: "" }));
            }, 500);
          }
        }, 1000); // Update every second
        
        return () => {
          clearInterval(countdownInterval);
        };
      } else {
        // Clear error if days are no longer the same
        if (formErrors.endDate?.includes("End date cannot be on the same day of the month as start date")) {
          setFormErrors((prev) => ({ ...prev, endDate: "" }));
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.startDate, formData.endDate]);

  // Auto-adjust End Date if it's later than calculated end date from Duration
  useEffect(() => {
    if (formData.startDate && formData.endDate && formData.duration) {
      const calculatedEndDate = calculateEndDate(formData.startDate, formData.duration);
      
      if (calculatedEndDate && new Date(formData.endDate) > new Date(calculatedEndDate)) {
        // Update error message with countdown starting at 5
        setFormErrors((prev) => ({
          ...prev,
          endDate: "End date cannot be later than the calculated end date based on the selected duration. Auto-adjusting in 5...",
        }));
        
        // Countdown timer from 5 to 0
        let countdown = 5;
        const countdownInterval = setInterval(() => {
          countdown -= 1;
          setFormErrors((prev) => ({
            ...prev,
            endDate: `End date cannot be later than the calculated end date based on the selected duration. Auto-adjusting in ${countdown}...`,
          }));
          
          if (countdown <= 0) {
            clearInterval(countdownInterval);
            // Adjust end date to the calculated end date
            setFormData((prev) => {
              // Recalculate to ensure we have the latest calculated date
              const latestCalculatedEndDate = calculateEndDate(prev.startDate, prev.duration);
              if (latestCalculatedEndDate && prev.endDate !== latestCalculatedEndDate) {
                return { ...prev, endDate: latestCalculatedEndDate };
              }
              return prev;
            });
            
            // Clear error after adjustment
            setTimeout(() => {
              setFormErrors((prev) => ({ ...prev, endDate: "" }));
            }, 500);
          }
        }, 1000); // Update every second
        
        return () => {
          clearInterval(countdownInterval);
        };
      } else {
        // Clear error if end date is no longer later than calculated date
        if (formErrors.endDate?.includes("End date cannot be later than the calculated end date based on the selected duration")) {
          setFormErrors((prev) => ({ ...prev, endDate: "" }));
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.startDate, formData.endDate, formData.duration]);

  // Sync field validation
  const validateField = (field: keyof ProjectFormData, value: string) => {
    let error = "";

    if (field === "projectLeader") {
      if (!value.trim()) error = "Project leader is required.";
    }

    if (field === "name") {
      if (!value.trim()) error = "Project name is required.";
    }

    if (field === "duration") {
      if (!value.trim()) error = "Duration is required.";
    }

    if (field === "totalGrant") {
      if (value === "") {
        // allow blank (treated as 0) but you can require it if you want
        error = "";
      } else {
        const n = Number(value);
        if (isNaN(n)) error = "Grant must be a number.";
        else if (n < 0) error = "Grant cannot be negative.";
      }
    }

    if (field === "startDate" || field === "endDate") {
      const start = field === "startDate" ? value : formData.startDate;
      const end = field === "endDate" ? value : formData.endDate;

      if (start && end) {
        // Check if the DAY (day of month) is the same - not allowed
        const startDay = start.split('-')[2]; // Extract day (YYYY-MM-DD format)
        const endDay = end.split('-')[2]; // Extract day (YYYY-MM-DD format)
        if (startDay === endDay) {
          error =
            field === "startDate"
              ? "Start date and end date cannot be on the same day of the month."
              : "End date cannot be on the same day of the month as start date.";
        }
        // Check if end date is later than calculated end date from duration
        else if (formData.duration && formData.startDate && field === "endDate") {
          const calculatedEndDate = calculateEndDate(formData.startDate, formData.duration);
          if (calculatedEndDate && new Date(end) > new Date(calculatedEndDate)) {
            error = "End date cannot be later than the calculated end date based on the selected duration.";
          }
        }
        // If start > end => invalid
        else if (new Date(start) > new Date(end)) {
          error =
            field === "startDate"
              ? "Start date must be on or before end date."
              : "End date must be on or after start date.";
        }
      }
    }

    if (!isEdit && field === "projectStaff") {
      if (!value.trim()) error = "Project staff email is required.";
      else if (!emailRegex.test(value.trim())) error = "Invalid email format.";
    }

    setFormErrors((prev) => ({ ...prev, [field]: error }));
    return error;
  };

  const handleChange =
    (field: keyof ProjectFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = e.target.value;
      
      // Update the field value first
      setFormData((prev) => ({ ...prev, [field]: value }));
      
      // Then validate - this will show error if dates are equal
      validateField(field, value);
    };

  const handleDurationChange = (value: string) => {
    setFormData((prev) => ({ ...prev, duration: value }));
    validateField("duration", value);
  };

  // When staff input loses focus, do an existence check
  const handleStaffBlur = async () => {
    if (isEdit || !checkStaffExists) return;

    const email = formData.projectStaff.trim();
    // Run synchronous validation
    const syncError = validateField("projectStaff", email);
    if (syncError) return;

    setCheckingStaff(true);
    const exists = await checkStaffExists(email);
    setCheckingStaff(false);
    if (!exists) {
      setFormErrors((prev) => ({
        ...prev,
        projectStaff: "Staff does not exist in the system.",
      }));
    } else {
      setFormErrors((prev) => ({ ...prev, projectStaff: "" }));
    }
  };
  
  // Budget item handlers
  const handleAddItem = (category: 'ps' | 'mooe' | 'co') => {
    setAddingItemTo(category);
    setNewItemDescription('');
    setNewItemAmount('');
  };
  
  const handleCancelAddItem = () => {
    setAddingItemTo(null);
    setNewItemDescription('');
    setNewItemAmount('');
  };
  
  const handleConfirmAddItem = () => {
    if (!addingItemTo) return;
    
    // Validate
    if (!newItemDescription.trim()) {
      return;
    }
    const amount = parseFloat(newItemAmount);
    if (isNaN(amount) || amount < 0) {
      return;
    }
    
    // Add item
    const categoryMap = { ps: 'PS', mooe: 'MOOE', co: 'CO' } as const;
    const newItem: BudgetItem = {
      category: categoryMap[addingItemTo],
      description: newItemDescription.trim(),
      amount: newItemAmount,
    };
    
    setBudgetItems((prev) => ({
      ...prev,
      [addingItemTo]: [...prev[addingItemTo], newItem],
    }));
    
    handleCancelAddItem();
  };
  
  const handleEditItem = (category: 'ps' | 'mooe' | 'co', index: number) => {
    const item = budgetItems[category][index];
    setEditingItem({ category, index });
    setEditItemDescription(item.description);
    setEditItemAmount(item.amount);
  };
  
  const handleCancelEditItem = () => {
    setEditingItem(null);
    setEditItemDescription('');
    setEditItemAmount('');
  };
  
  const handleSaveEditItem = () => {
    if (!editingItem) return;
    
    // Validate
    if (!editItemDescription.trim()) {
      return;
    }
    const amount = parseFloat(editItemAmount);
    if (isNaN(amount) || amount < 0) {
      return;
    }
    
    // Update item
    setBudgetItems((prev) => {
      const updated = [...prev[editingItem.category]];
      updated[editingItem.index] = {
        ...updated[editingItem.index],
        description: editItemDescription.trim(),
        amount: editItemAmount,
      };
      return {
        ...prev,
        [editingItem.category]: updated,
      };
    });
    
    handleCancelEditItem();
  };
  
  const handleDeleteItem = (category: 'ps' | 'mooe' | 'co', index: number) => {
    setBudgetItems((prev) => {
      const updated = [...prev[category]];
      updated.splice(index, 1);
      return {
        ...prev,
        [category]: updated,
      };
    });
  };
  
  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Full-form validation before submission
  const validateAll = async (): Promise<boolean> => {
    const fields: (keyof ProjectFormData)[] = [
      "projectLeader",
      "name",
      "duration",
      "startDate",
      "endDate",
      "totalGrant",
    ];
    let hasError = false;

    for (const f of fields) {
      const value = (formData as any)[f] ?? "";
      const err = validateField(f, value);
      if (err) hasError = true;
    }

    // Explicit check for same DAY (day of month) - not allowed
    // Check both the current end date and the calculated end date from duration
    if (formData.startDate && formData.endDate) {
      const startDay = formData.startDate.split('-')[2]; // Extract day (YYYY-MM-DD format)
      const endDay = formData.endDate.split('-')[2]; // Extract day (YYYY-MM-DD format)
      
      // Check if current end date has same day as start date
      if (startDay === endDay) {
        setFormErrors((prev) => ({
          ...prev,
          endDate: "End date cannot be on the same day of the month as start date.",
        }));
        hasError = true;
      }
      
      // Also check if calculated end date from duration would have same day
      if (formData.duration && formData.startDate) {
        const calculatedEndDate = calculateEndDate(formData.startDate, formData.duration);
        if (calculatedEndDate) {
          const calculatedEndDay = calculatedEndDate.split('-')[2];
          if (startDay === calculatedEndDay) {
            setFormErrors((prev) => ({
              ...prev,
              endDate: "End date cannot be on the same day of the month as start date.",
            }));
            hasError = true;
          }
          
          // Check if manually set end date is later than calculated end date from duration
          if (new Date(formData.endDate) > new Date(calculatedEndDate)) {
            setFormErrors((prev) => ({
              ...prev,
              endDate: "End date cannot be later than the calculated end date based on the selected duration.",
            }));
            hasError = true;
          }
        }
      }
    }

    // if projectStaff has no sync error, run the async existence check
    if (
      !isEdit &&
      checkStaffExists &&
      !formErrors.projectStaff &&
      formData.projectStaff.trim()
    ) {
      // NOTE: For editing, you might want to skip the staff check if the staff email hasn't changed.
      // However, for simplicity and safety, we'll keep the check here.
      setCheckingStaff(true);
      const exists = await checkStaffExists(formData.projectStaff.trim());
      setCheckingStaff(false);
      if (!exists) {
        setFormErrors((prev) => ({
          ...prev,
          projectStaff: "Staff does not exist in the system.",
        }));
        hasError = true;
      }
    }

    return !hasError;
  };

  const handleSubmit = async () => {
    const ok = await validateAll();
    if (!ok) return;
    onSubmit();
  };

  // Helper to show styling for invalid fields
  const inputBaseClass =
    "block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-2";
  const errorInputClass = "border-red-500 focus:ring-red-300";
  const normalInputClass = "border-gray-200 focus:ring-blue-300";

  // Determine whether Create/Save button should be disabled
  const hasErrors = Object.values(formErrors).some((v) => v && v.length > 0);
  const requiredMissing = isEdit
    ? !formData.name.trim() || !formData.projectLeader.trim() || !formData.duration.trim()
    : !formData.name.trim() || !formData.projectLeader.trim() || !formData.duration.trim() || !formData.projectStaff.trim();

  // Conditionally determine the modal title and submit button text
  const modalTitle = isEdit ? "Edit Project" : "Create New Project";
  const submitButtonText = isEdit ? "Save Changes" : "Create Project";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          {/* Conditional Title */}
          <DialogTitle>{modalTitle}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the project details below."
              : "Fill in the details to create a new project."}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <div className="space-y-3 overflow-y-auto flex-1 min-h-0 pr-1">
          {/* Project Leader and Project Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="create-project-leader" className="mb-2">
                Project Leader
              </Label>
              <Input
                id="create-project-leader"
                value={formData.projectLeader}
                onChange={handleChange("projectLeader")}
                placeholder="Enter project leader name..."
                className={`${inputBaseClass} ${
                  formErrors.projectLeader ? errorInputClass : normalInputClass
                }`}
              />
              <div className="mt-1 min-h-[20px]">
                {formErrors.projectLeader ? (
                  <p className="text-xs text-red-600">{formErrors.projectLeader}</p>
                ) : null}
              </div>
            </div>

            <div>
              <Label htmlFor="create-project-name" className="mb-2">
                Project Name
              </Label>
              <Input
                id="create-project-name"
                value={formData.name}
                onChange={handleChange("name")}
                placeholder="Enter project name..."
                className={`${inputBaseClass} ${
                  formErrors.name ? errorInputClass : normalInputClass
                }`}
              />
              <div className="mt-1 min-h-[20px]">
                {formErrors.name ? (
                  <p className="text-xs text-red-600">{formErrors.name}</p>
                ) : null}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="create-project-description" className="mb-2">
              Description
            </Label>
            <TextArea
              id="create-project-description"
              value={formData.description}
              onChange={handleChange("description")}
              placeholder="Enter project description..."
              className="min-h-16"
            />
          </div>

          {/* Duration */}
          <div>
            <Label htmlFor="create-project-duration" className="mb-2">
              Duration
            </Label>
            <Select
              value={formData.duration}
              onValueChange={handleDurationChange}
            >
              <SelectTrigger
                id="create-project-duration"
                className={
                  formErrors.duration
                    ? "border-red-500 focus-visible:ring-red-300"
                    : ""
                }
              >
                <SelectValue placeholder="Select duration..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 year</SelectItem>
                <SelectItem value="2">2 years</SelectItem>
                <SelectItem value="3">3 years</SelectItem>
                <SelectItem value="4">4 years</SelectItem>
                <SelectItem value="5">5 years</SelectItem>
              </SelectContent>
            </Select>
            <div className="mt-1 min-h-[20px]">
              {formErrors.duration ? (
                <p className="text-xs text-red-600">{formErrors.duration}</p>
              ) : null}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="create-project-start-date" className="mb-2">
                Start Date
              </Label>
              <Input
                id="create-project-start-date"
                type="date"
                value={formData.startDate}
                onChange={handleChange("startDate")}
                className={`${inputBaseClass} ${
                  formErrors.startDate ? errorInputClass : normalInputClass
                }`}
              />
              <div className="mt-1 min-h-[20px]">
                {formErrors.startDate ? (
                  <p className="text-xs text-red-600">
                    {formErrors.startDate}
                  </p>
                ) : null}
              </div>
            </div>
            <div>
              <Label htmlFor="create-project-end-date" className="mb-2">
                End Date
              </Label>
              <Input
                id="create-project-end-date"
                type="date"
                value={formData.endDate}
                onChange={handleChange("endDate")}
                className={`${inputBaseClass} ${
                  formErrors.endDate ? errorInputClass : normalInputClass
                }`}
              />
              <div className="mt-1 min-h-[20px]">
                {formErrors.endDate ? (
                  <p className="text-xs text-red-600">
                    {formErrors.endDate}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          {/* Budget Breakdown Table */}
          {!hideFinancialValues && (
            <div>
              <Label className="mb-2">Budget Breakdown</Label>
              <div className="border rounded-md overflow-x-auto [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:bg-muted">
                <table className="w-full min-w-[500px]">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold w-1/3">Category</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Items</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(['ps', 'mooe', 'co'] as const).map((categoryKey) => {
                      const categoryLabels = { ps: 'Personnel Services (PS)', mooe: 'Maintenance and Other Operating Expenses (MOOE)', co: 'Capital Outlay (CO)' };
                      const categoryLabel = categoryLabels[categoryKey];
                      const items = budgetItems[categoryKey];
                      const subtotal = calculateCategorySubtotal(categoryKey);
                      const isAdding = addingItemTo === categoryKey;
                      const categoryItems = items.map((item, index) => {
                        const isEditing = editingItem?.category === categoryKey && editingItem?.index === index;
                        return { item, index, isEditing };
                      });
                      
                      return (
                        <tr key={categoryKey} className="border-t">
                          <td className="px-4 py-3 align-top">
                            <div className="font-medium text-sm">{categoryLabel}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Subtotal: {formatCurrency(subtotal)}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="space-y-2">
                              {categoryItems.map(({ item, index, isEditing }) => (
                                <div key={index} className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                                  {isEditing ? (
                                    <>
                                      <Input
                                        value={editItemDescription}
                                        onChange={(e) => setEditItemDescription(e.target.value)}
                                        placeholder="Description"
                                        className="flex-1 text-sm"
                                      />
                                      <Input
                                        type="text"
                                        value={editItemAmount}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          if (/^\d*\.?\d*$/.test(val)) {
                                            setEditItemAmount(val);
                                          }
                                        }}
                                        placeholder="Amount"
                                        className="w-32 text-sm"
                                      />
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={handleSaveEditItem}
                                        className="text-xs"
                                      >
                                        Save
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={handleCancelEditItem}
                                        className="text-xs"
                                      >
                                        Cancel
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <span className="flex-1 text-sm">{item.description}</span>
                                      <span className="text-sm font-medium">{formatCurrency(parseFloat(item.amount) || 0)}</span>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleEditItem(categoryKey, index)}
                                        className="text-xs h-7"
                                      >
                                        Edit
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleDeleteItem(categoryKey, index)}
                                        className="text-xs h-7 text-red-600 hover:text-red-700"
                                      >
                                        Delete
                                      </Button>
                                    </>
                                  )}
                                </div>
                              ))}
                              
                              {isAdding ? (
                                <div className="flex items-center gap-2 p-2 bg-blue-50 rounded border border-blue-200">
                                  <Input
                                    value={newItemDescription}
                                    onChange={(e) => setNewItemDescription(e.target.value)}
                                    placeholder="Description"
                                    className="flex-1 text-sm"
                                  />
                                  <Input
                                    type="text"
                                    value={newItemAmount}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (/^\d*\.?\d*$/.test(val)) {
                                        setNewItemAmount(val);
                                      }
                                    }}
                                    placeholder="Amount"
                                    className="w-32 text-sm"
                                  />
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={handleConfirmAddItem}
                                    className="text-xs"
                                    disabled={!newItemDescription.trim() || !newItemAmount || parseFloat(newItemAmount) < 0}
                                  >
                                    Confirm
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleCancelAddItem}
                                    className="text-xs"
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleAddItem(categoryKey)}
                                  className="text-xs mt-1"
                                >
                                  + Add Item
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 p-3 bg-muted/50 rounded-md">
                <div className="text-sm font-semibold">
                  Total Grant Amount: {formatCurrency(calculateTotalGrant())}
                </div>
              </div>
            </div>
          )}

          {/* Project Staff */}
          {checkStaffExists && (
            <div>
              <Label htmlFor="create-project-staff" className="mb-2">
                Project Staff (Email)
              </Label>
              <Input
                id="create-project-staff"
                type="email"
                value={formData.projectStaff}
                onChange={handleChange("projectStaff")}
                onBlur={handleStaffBlur}
                placeholder="staff@example.com"
                className={`${inputBaseClass} ${
                  formErrors.projectStaff ? errorInputClass : normalInputClass
                }`}
              />
              <div className="mt-1 min-h-[20px]">
                {checkingStaff ? (
                  <p className="text-xs text-muted-foreground">
                  Checking...
                </p>
                ) : formErrors.projectStaff ? (
                  <p className="text-xs text-red-600">
                    {formErrors.projectStaff}
                  </p>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={hasErrors || requiredMissing || checkingStaff}
          >
            {/* Conditional Button Text */}
            {submitButtonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectModal;
