import { useState, useEffect, useCallback } from "react";
import type { Compensation } from "../../../types/compensation";
import { compensationApi } from "../services/personnelApi";

interface UseCompensationReturn {
    //Data
    compensation: Compensation[];

    // Loading states
    loadingCompensation: boolean;

    // Compensation operations
    fetchCompensation: () => Promise<void>;

    addCompensation: (data: {
        type: Compensation["type"];
        budget_item: number;
        personnel: number;
        reason: string;
        amount: string;
        date_effective: string;
    }) => Promise<Compensation | undefined>;

    updateCompensation: (compensationId: number, data: {
        type: Compensation["type"];
        budget_item: number;
        personnel: number;
        reason: string;
        amount: string;
        date_effective: string;
    }) => Promise<void>;

    deleteCompensation: (compensationId: number) => Promise<void>;

    // Error handling
    error: Error | null;
}

export const useCompensation = (projectId: number): UseCompensationReturn => {
    const [compensation, setCompensation] = useState<Compensation[]>([]);
    const [loadingCompensation, setLoadingCompensation] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    // Fetch compensation
    const fetchCompensation = useCallback(async () => {
        if (!projectId) return;

        setLoadingCompensation(true);
        setError(null);
        try {
            const data = await compensationApi.getAll(projectId);
            setCompensation(data);
        } catch (err) {
            const error = err instanceof Error ? err : new Error("Failed to fetch compensation details");
            setError(error);
            console.error("Failed to fetch compensation details:", error);
        } finally {
            setLoadingCompensation(false);
        }
    }, [projectId]);

    // Add compensation
    const addCompensation = useCallback(
        async (
            data: {
                type: Compensation["type"];
                budget_item: number | null;
                personnel: number;
                reason: string | null;
                amount: string;
                date_effective: string;
            }
        ) => {
            if (!projectId) return;
            setError(null);

            try {
                const newCompensation = await compensationApi.create(projectId, data);
                setCompensation((prev) => [...prev, newCompensation]);
                return newCompensation;
            } catch (err: any) {
                console.error("Failed to add compensation item:", err);
                console.error("Error response:", err?.response?.data);
                const errorMessage = err?.response?.data 
                    ? (typeof err.response.data === 'string' 
                        ? err.response.data 
                        : JSON.stringify(err.response.data))
                    : err?.message || "Failed to add compensation item";
                const error = new Error(errorMessage);
                setError(error);
                throw error;
            }
        }, [projectId]);
    
    // Update compensation
    const updateCompensation = useCallback(
        async (
            compensationId: number,
            data: {
                type: Compensation["type"];
                budget_item: number;
                personnel: number;
                reason: string;
                amount: string;
                date_effective: string;
            }
        ) => {
            if (!projectId || !compensationId) return;
            setError(null);

            try {
                const updatedCompensation = await compensationApi.update(projectId, compensationId, data);
                setCompensation((prev) =>
                    prev.map((p) => (p.id === compensationId ? updatedCompensation : p))
                );
            } catch (err) {
                const error = err instanceof Error ? err : new Error("Failed to add compensation item");
                setError(error);
                console.error("Failed to update compensation item:", error);
                throw error;
            }
        }, [projectId]);

    // Delete compensation
    const deleteCompensation = useCallback(async (compensationId: number) => {
        if (!projectId) return;
        setError(null);

        try {
            await compensationApi.delete(projectId, compensationId);
            setCompensation((prev) => prev.filter((p) => p.id !== compensationId));
        } catch (err) {
            const error = err instanceof Error ? err : new Error("Failed to delete compensation item");
            setError(error);
            console.error("Failed to delete compensation item:", error);
            throw error;
        }
    }, [projectId]);

    useEffect(() => {
        fetchCompensation();
    }, [fetchCompensation]);

    return {
        compensation,
        loadingCompensation,
        fetchCompensation,
        addCompensation,
        updateCompensation,
        deleteCompensation,
        error,
    };
}
