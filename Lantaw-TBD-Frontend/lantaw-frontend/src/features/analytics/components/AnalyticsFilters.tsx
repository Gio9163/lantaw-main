import React from "react";
import { Label } from "../../../components/common/label";
import { Input } from "../../../components/common/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/common/select";
import type { AnalyticsFilters } from "../types/analytics";

interface AnalyticsFiltersProps {
  filters: AnalyticsFilters;
  onFiltersChange: (filters: AnalyticsFilters) => void;
}

export const AnalyticsFiltersComponent: React.FC<AnalyticsFiltersProps> = ({
  filters,
  onFiltersChange,
}) => {
  const handleCategoryChange = (category: string) => {
    onFiltersChange({
      ...filters,
      category: category as AnalyticsFilters["category"],
    });
  };

  const handleStartDateChange = (startDate: string) => {
    onFiltersChange({
      ...filters,
      startDate: startDate || null,
    });
  };

  const handleEndDateChange = (endDate: string) => {
    onFiltersChange({
      ...filters,
      endDate: endDate || null,
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Budget Category Filter */}
      <div>
        <Label htmlFor="category-filter" className="mb-2">
          Budget Category
        </Label>
        <Select value={filters.category} onValueChange={handleCategoryChange}>
          <SelectTrigger id="category-filter">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Categories</SelectItem>
            <SelectItem value="PS">Personnel Services (PS)</SelectItem>
            <SelectItem value="MOOE">MOOE</SelectItem>
            <SelectItem value="CO">Capital Outlay (CO)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Start Date Filter */}
      <div>
        <Label htmlFor="start-date-filter" className="mb-2">
          Start Date
        </Label>
        <Input
          id="start-date-filter"
          type="date"
          value={filters.startDate || ""}
          onChange={(e) => handleStartDateChange(e.target.value)}
        />
      </div>

      {/* End Date Filter */}
      <div>
        <Label htmlFor="end-date-filter" className="mb-2">
          End Date
        </Label>
        <Input
          id="end-date-filter"
          type="date"
          value={filters.endDate || ""}
          onChange={(e) => handleEndDateChange(e.target.value)}
          min={filters.startDate || undefined}
        />
      </div>
    </div>
  );
};

