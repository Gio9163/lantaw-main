import { useState, useEffect, useCallback } from "react";
import type { Personnel } from "../../../types/personnel";
import { personnelApi } from "../services/personnelApi";

interface UsePersonnelReturn {
    // Data
    personnel: Personnel[];

    // Loading states
    loadingPersonnel: boolean;

    // Personnel operations
    fetchPersonnel: () => Promise<void>; 
    
    addPersonnel: (data: {
        first_name: string;
        last_name: string;
        role: number | null;
        department: number | null;
        employment_status: Personnel["employment_status"];
    }) => Promise<Personnel | undefined>; // Added undefined because of the early return check
    
    updatePersonnel: (personnelId: number, data: {
        first_name: string;
        last_name: string;
        role: number | null;
        department: number | null;
        employment_status: Personnel["employment_status"];
    }) => Promise<void>;
    
    deletePersonnel: (personnelId: number) => Promise<void>; 

    // Error handling
    error: Error | null;
}

export const usePersonnel = (projectId: number | null): UsePersonnelReturn => {
    const [personnel, setPersonnel] = useState<Personnel[]>([]);
    const [loadingPersonnel, setLoadingPersonnel] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    // Fetch personnel
    const fetchPersonnel = useCallback(async () => {
        if (!projectId) return;

        setLoadingPersonnel(true);
        setError(null);
        try {
            const data = await personnelApi.getAll(projectId);
            // Ensure role_name and department_name are set for all personnel
            const dataWithDefaults = data.map(p => ({
                ...p,
                role_name: p.role_name || "",
                department_name: p.department_name || "",
            }));
            setPersonnel(dataWithDefaults);
        } catch (err) {
            const error = err instanceof Error ? err : new Error("Failed to fetch personnel");
            setError(error);
            console.error("Failed to fetch personnel:", error);
        } finally {
            setLoadingPersonnel(false);
        }
    }, [projectId]);

    // Add personnel
    const addPersonnel = useCallback(async (data: {first_name: string; last_name: string; role: number | null; department: number | null; employment_status: Personnel["employment_status"]}) => {
        if (!projectId) return;

        setError(null);
        try {
            const newPersonnel = await personnelApi.create(projectId, data);
            // Ensure role_name and department_name are set (handle null cases)
            const personnelWithDefaults = {
                ...newPersonnel,
                role_name: newPersonnel.role_name || "",
                department_name: newPersonnel.department_name || "",
            };
            // Add to state - use functional update to ensure we're working with latest state
            setPersonnel((prev) => {
                // Check if personnel already exists (prevent duplicates)
                const exists = prev.some(p => p.id === personnelWithDefaults.id);
                if (exists) {
                    // Update existing instead of adding duplicate
                    return prev.map(p => p.id === personnelWithDefaults.id ? personnelWithDefaults : p);
                }
                return [...prev, personnelWithDefaults];
            });
            return personnelWithDefaults;
        } catch (err) {
            const error = err instanceof Error ? err : new Error("Failed to add personnel");
            setError(error);
            console.error("Failed to add personnel:", error);
            throw error;
        }
    }, [projectId]);

    // Update personnel
    const updatePersonnel = useCallback(async (personnelId: number, data: {first_name: string; last_name: string; role: number | null; department: number | null; employment_status: Personnel["employment_status"]}) => {
        if (!projectId) return;
        setError(null);

        try {
            const updatedPersonnel = await personnelApi.update(projectId, personnelId, data);
            setPersonnel((prev) =>
                prev.map((p) => (p.id === personnelId ? updatedPersonnel : p))
            );
        } catch (err) {
            const error = err instanceof Error ? err : new Error("Failed to update personnel");
            setError(error);
            console.error("Failed to update personnel:", error);
            throw error;
        }
    }, [projectId]);

    // Delete personnel
    const deletePersonnel = useCallback(async (personnelId: number) => {
        if (!projectId) return;
        setError(null);

        try {
            await personnelApi.delete(projectId, personnelId);
            setPersonnel((prev) => prev.filter((p) => p.id !== personnelId));
        } catch (err) {
            const error = err instanceof Error ? err : new Error("Failed to delete personnel");
            setError(error);
            console.error("Failed to delete personnel:", error);
            throw error;
        }
    }, [projectId]);

    useEffect(() => {
        fetchPersonnel();
    }, [fetchPersonnel]);

    return {
        personnel,
        loadingPersonnel,
        fetchPersonnel,
        addPersonnel,
        updatePersonnel,
        deletePersonnel,
        error,
    };
};