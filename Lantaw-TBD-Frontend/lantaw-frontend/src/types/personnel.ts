export interface Personnel {
    id: number;
    first_name: string;
    last_name: string;
    role: number | null;
    role_name: string;
    department: number | null;
    department_name: string;
    employment_status: "ACTIVE" | "INACTIVE" | "TERMINATED";
}