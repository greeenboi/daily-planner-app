export interface PlannerTask {
    id: string;
    title: string;
    start: string; // ISO
    end: string;   // ISO
    color?: string | null;
    allDay?: boolean;
    priority?: string;
}