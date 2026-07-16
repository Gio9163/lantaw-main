import { useState, useEffect, useCallback } from "react";
import type { Role } from "../../../types/role";
import { roleApi } from "../services/personnelApi";

interface UseRoleReturn {
    // Data
    role: Role[];

    // Loading states
    loadingRole: boolean;

    // Role operations
    fetchRole: () => Promise<void>;

    addRole: (data: {
        name: string;
    }) => Promise<Role | undefined>;

    // Error handling
    error: Error | null;
}

export const useRole = (projectId: number): UseRoleReturn => {
    const [role, setRole] = useState<Role[]>([]);
    const [loadingRole, setLoadingRole] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    // Fetch roles
    const fetchRole = useCallback(async () => {
        if (!projectId) return;
        setLoadingRole(true);
        setError(null);
        
        try {
            const data = await roleApi.getAll(projectId);
            setRole(data);
        } catch (err) {
            const error = err instanceof Error ? err : new Error("Failed to fetch roles");
            setError(error);
            console.error("Failed to fetch roles:", error);
        } finally {
            setLoadingRole(false);
        }
    }, [projectId]);

    // Add role
    const addRole = useCallback(
        async (
            data: {
                name: string;
            }
        ) => {
            if (!projectId) return;
            setError(null);

            try {
                const newRole = await roleApi.create(projectId, data);
                setRole((prev) => [...prev, newRole]);
                return newRole;
            } catch (err) {
                const error = err instanceof Error ? err : new Error("Failed to add role");
                setError(error);
                console.error("Failed to add role:", error);
                throw error;
            }
        }, [projectId]);
    
    useEffect(() => {
        fetchRole();
    }, [fetchRole]);

    return {
        role,
        loadingRole,
        fetchRole,
        addRole,
        error,
    }
}