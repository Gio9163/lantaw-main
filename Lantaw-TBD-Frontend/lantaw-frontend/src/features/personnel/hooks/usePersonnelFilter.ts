// Manage all filtering logic for personnel.

import { useState, useMemo } from "react";
import type { Personnel } from "../../../types/personnel";

export interface PersonnelFilters {
    searchQuery: string;
    departmentFilter: string;
    employmentStatusFilter: string;
}

export interface UsePersonnelFiltersReturn {
    filters: PersonnelFilters;
    setSearchQuery: (query: string) => void;
    setDepartmentFilter: (filter: string) => void;
    setEmploymentStatusFilter: (filter: string) => void;
    clearFilters: () => void;
    filterPersonnel: (personnel: Personnel[] | undefined) => Personnel[];
}

// Filter personnel based on current filter state
const applyFilters = (personnel: Personnel[], filters: PersonnelFilters): Personnel[] => {
    return personnel.filter((person) => {
        // Match personnel with first or last name
        const searchLower = filters.searchQuery.toLowerCase();
        const matchesSearch =
            person.first_name?.toLowerCase().includes(searchLower) ||
            person.last_name?.toLowerCase().includes(searchLower) ||
            (person.role_name && person.role_name.toLowerCase().includes(searchLower));
        
        // Match personnel with department_name
        const matchesDepartment =
            filters.departmentFilter === "all" ||
            person.department_name === filters.departmentFilter;

        // Match personnel with employment_status
        const matchesEmploymentStatus =
            filters.employmentStatusFilter === "all" ||
            person.employment_status === filters.employmentStatusFilter;

        return matchesSearch && matchesDepartment && matchesEmploymentStatus;
    });
};

export const usePersonnelFilters = (): UsePersonnelFiltersReturn => {
    const [searchQuery, setSearchQuery] = useState("");
    const [departmentFilter, setDepartmentFilter] = useState("all");
    const [employmentStatusFilter, setEmploymentStatusFilter] = useState("all");

    const filters: PersonnelFilters = useMemo(
        () => ({
            searchQuery,
            departmentFilter,
            employmentStatusFilter,
        }),
        [searchQuery, departmentFilter, employmentStatusFilter]
    );

    const clearFilters = () => {
        setSearchQuery("");
        setDepartmentFilter("all");
        setEmploymentStatusFilter("all");
    };

    const filterPersonnel = (personnel: Personnel[] | undefined): Personnel[] => {
        if (!personnel) return [];
        return applyFilters(personnel, filters);
    };

    return {
        filters,
        setSearchQuery,
        setDepartmentFilter,
        setEmploymentStatusFilter,
        clearFilters,
        filterPersonnel,
    }
}