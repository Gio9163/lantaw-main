// Handles all search and filter controls for personnel.

import React from "react";
import { Card, CardContent } from "../../../components/common/card";
import { Input } from "../../../components/common/input";
import { Button } from "../../../components/common/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/common/select";
import { Search, Filter, X } from "lucide-react";
import type { UsePersonnelFiltersReturn } from "../hooks/usePersonnelFilter";
import type { Department } from "../../../types/department";

interface PersonnelFiltersProps {
  filters: UsePersonnelFiltersReturn;
  departments: Department[];
}

export const PersonnelFilters: React.FC<PersonnelFiltersProps> = ({
  filters,
  departments = [],
}) => {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search Bar */}
          <div className="flex-1 relative min-w-0">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search personnel..."
              value={filters.filters.searchQuery}
              onChange={(e) => filters.setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0 hidden sm:block" />
            {/* Employment Status */}
            <Select
              value={filters.filters.employmentStatusFilter}
              onValueChange={filters.setEmploymentStatusFilter}
            >
              <SelectTrigger className="w-full min-w-0 sm:w-48">
                <SelectValue placeholder="Employment Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="TERMINATED">Terminated</SelectItem>
              </SelectContent>
            </Select>

            {/* Department Select */}
            <Select
              value={filters.filters.departmentFilter}
              onValueChange={filters.setDepartmentFilter}
            >
              <SelectTrigger className="w-full min-w-0 sm:w-48">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={String(dept.id)}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Clear Filters Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={filters.clearFilters}
              className="text-xs shrink-0 w-full sm:w-auto"
            >
              <X className="h-3 w-3 mr-1 shrink-0" />
              Clear
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
