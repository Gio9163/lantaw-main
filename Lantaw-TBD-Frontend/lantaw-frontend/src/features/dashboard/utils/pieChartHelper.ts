// Fixed types needed by pie chart
export interface BudgetItem {
    name: string;
    value: number;
    percentage: number;
}

export interface DetailItem {
    name: string;
    amount: number;
    percentage: number;
}

export type BudgetBreakdownGroup = Record<string, DetailItem[]>;

export const OVERVIEW_COLORS = ['#078080', '#f45d48', '#232323'];

// Helper to make color variations for the detailed chart breakdown 
export const generateColorVariations = (baseColor: string, count: number): string[] => {
    const colors = [];
    for (let i = 0; i < count; i++) {
        // Make the colors lighter/darker
        const opacity = 1 - (i * 0.2);
        colors.push(`${baseColor}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`);
    }
    return colors;
};

// Map budget item view to base color for the detailed chart breakdown 
export const getBaseColorForCategory = (view: 'PS' | 'MOOE' | 'CO'): string => {
    switch(view) {
        case 'PS': return OVERVIEW_COLORS[0];
        case 'MOOE': return OVERVIEW_COLORS[1];
        case 'CO': return OVERVIEW_COLORS[2];
        default: return '#cccccc'
    }
};

