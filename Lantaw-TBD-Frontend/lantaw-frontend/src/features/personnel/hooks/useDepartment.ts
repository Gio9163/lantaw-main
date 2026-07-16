import { useState, useEffect, useCallback } from "react";
import { departmentApi } from "../services/personnelApi";
import type { Department } from "../../../types/department";

interface UseDepartmentReturn {
    // Data
    department: Department[];

    // Loading states
    loadingDepartment: boolean;

    // Role operations
    fetchDepartment: () => Promise<void>;

    addDepartment: (data: {
        name: string;
    }) => Promise<Department | undefined>;

    // Error handling
    error: Error | null;
}

export const useDepartment = (projectId: number): UseDepartmentReturn => {
    const [department, setDepartment] = useState<Department[]>([]);
    const [loadingDepartment, setLoadingDepartment] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    // Fetch departments
    const fetchDepartment = useCallback(async () => {
        if (!projectId) return;
        setLoadingDepartment(true);
        setError(null);
        
        try {
            const data = await departmentApi.getAll(projectId);
            setDepartment(data);
        } catch (err) {
            const error = err instanceof Error ? err : new Error("Failed to fetch departments");
            setError(error);
            console.error("Failed to fetch departments:", error);
        } finally {
            setLoadingDepartment(false);
        }
    }, [projectId]);

    // Add department
    const addDepartment = useCallback(
        async (
            data: {
                name: string;
            }
        ) => {
            if (!projectId) return;
            setError(null);

            try {
                const newDepartment = await departmentApi.create(projectId, data);
                setDepartment((prev) => [...prev, newDepartment]);
                return newDepartment;
            } catch (err) {
                const error = err instanceof Error ? err : new Error("Failed to add department");
                setError(error);
                console.error("Failed to add department:", error);
                throw error;
            }
        }, [projectId]);
    
    useEffect(() => {
        fetchDepartment();
    }, [fetchDepartment]);

    return {
        department,
        loadingDepartment,
        fetchDepartment,
        addDepartment,
        error,
    }
}