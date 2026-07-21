import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../../../components/common/dialog";
import { Button } from "../../../../components/common/button";
import { Label } from "../../../../components/common/label";
import { Input } from "../../../../components/common/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../components/common/select";
import { CreatableSelect } from "./CreatableSelect";
import type { Personnel } from "../../../../types/personnel";
import type { Role } from "../../../../types/role";
import type { Department } from "../../../../types/department";
import { getApiErrorMessage } from "../../../../utils/apiError";

interface AddPersonnelModalProps {
  isOpen: boolean;
  onClose: () => void;

  // Data props
  personnel: Personnel | null; // null = create, defined = edit
  roles: Role[];
  departments: Department[];

  // Loading states
  isLoadingOptions?: boolean; // To disable inputs while fetching
  isSubmittingMain: boolean; // Separate from internal options creation

  // Actions
  onSubmit: (data: {
    first_name: string;
    last_name: string;
    role: number | null;
    department: number | null;
    employment_status: Personnel["employment_status"];
  }) => Promise<void>;

  // Pass to hook
  onCreateRole: (name: string) => Promise<Role | undefined>;
  onCreateDepartment: (name: string) => Promise<Department | undefined>;
}

export const AddPersonnelModal: React.FC<AddPersonnelModalProps> = ({
  isOpen,
  onClose,
  personnel,
  onSubmit,
  roles,
  departments,
  isLoadingOptions = false,
  isSubmittingMain,
  onCreateRole,
  onCreateDepartment,
}) => {
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    role: null as number | null,
    department: null as number | null,
    employment_status: "ACTIVE" as Personnel["employment_status"],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null); // Clear error when modal opens
      if (personnel) {
        setFormData({
          first_name: personnel.first_name,
          last_name: personnel.last_name,
          role: personnel.role || null,
          department: personnel.department || null,
          employment_status: personnel.employment_status,
        });
      } else {
        // Reset to default
        setFormData({
          first_name: "",
          last_name: "",
          role: null,
          department: null,
          employment_status: "ACTIVE",
        });
      }
    }
  }, [isOpen, personnel]);

  const handleSubmit = async () => {
    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      setError("First name and last name are required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        role: formData.role ?? null,  // Ensure null, not undefined
        department: formData.department ?? null,  // Ensure null, not undefined
        employment_status: formData.employment_status,
      });
      // Only close on success
      onClose();
    } catch (error: unknown) {
      console.error("Failed to save personnel:", error);
      setError(getApiErrorMessage(error, "Failed to save personnel. Please try again.", ["role", "department"]));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {personnel ? "Edit Personnel" : "Add New Personnel"}
          </DialogTitle>
          <DialogDescription>
            {personnel
              ? "Update the personnel information below."
              : "Fill in the details to add a new personnel member to this project."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="personnel-first-name" className="mb-2">
                First Name
              </Label>
              <Input
                id="personnel-first-name"
                value={formData.first_name}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    first_name: e.target.value,
                  }))
                }
                placeholder="Enter first name..."
                disabled={isSubmitting}
              />
            </div>
            <div>
              <Label htmlFor="personnel-last-name" className="mb-2">
                Last Name
              </Label>
              <Input
                id="personnel-last-name"
                value={formData.last_name}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    last_name: e.target.value,
                  }))
                }
                placeholder="Enter last name..."
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Role */}
            <CreatableSelect
              label="Role"
              options={roles}
              value={formData.role}
              onChange={(id) => setFormData((prev) => ({ ...prev, role: id }))}
              onCreate={async (name) => {
                const newRole = await onCreateRole(name);
                return newRole ? { id: newRole.id, name: newRole.name } : null;
              }}
              disabled={isLoadingOptions || isSubmittingMain}
            />

            {/* Department */}
            <CreatableSelect
              label="Department"
              options={departments}
              value={formData.department}
              onChange={(id) =>
                setFormData((prev) => ({ ...prev, department: id }))
              }
              onCreate={async (name) => {
                const newDepartment = await onCreateDepartment(name);
                return newDepartment
                  ? { id: newDepartment.id, name: newDepartment.name }
                  : null;
              }}
              disabled={isLoadingOptions || isSubmittingMain}
            />
          </div>

          <div>
            <Label htmlFor="personnel-status" className="mb-2">
              Status
            </Label>
            <Select
              value={formData.employment_status}
              onValueChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  employment_status: value as Personnel["employment_status"],
                }))
              }
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span>Active</span>
                  </div>
                </SelectItem>
                <SelectItem value="INACTIVE">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                    <span>Inactive</span>
                  </div>
                </SelectItem>
                <SelectItem value="TERMINATED">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span>Terminated</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmittingMain || isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmittingMain || isSubmitting}>
            {(isSubmittingMain || isSubmitting)
              ? "Saving..."
              : personnel
              ? "Update Personnel"
              : "Create Personnel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
