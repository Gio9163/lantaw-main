export interface Compensation {
    id: number;
    type: "SALARY" | "HONORARIA";
    budget_item: number;
    budget_item_name: string | null;
    personnel: number;
    personnel_first_name: string;
    personnel_last_name: string;
    role_name: string;
    reason: string;
    monthly_rate: string | null;
    monthly_salary: string;
    honoraria: string;
    duration_months: number | null;
    amount: string | null;
    total_compensation: string;
    date_effective: string;
    date_modified: string;
}

export interface CompensationCreateData {
    type: "SALARY" | "HONORARIA";
    budget_item: number | null;    
    personnel: number;     
    reason: string | null;
    monthly_rate?: string | null;
    duration_months?: number | null;
    amount: string;
    date_effective: string;
}
