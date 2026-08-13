export type TaskStatus = "suggested" | "accepted" | "in_progress" | "completed" | "deferred";
export type Condition = "good" | "monitor" | "needs_attention" | "unknown";

export interface MaintenanceTask { id: string; title: string; category: string; priority: string; penalty: number; status: TaskStatus; source: string; notes: string; }
export interface FleetVehicle { id: string; year: number; make: string; model: string; trim: string; mileage: number; vin?: string; primaryUse: string; annualMileage?: number; notes: string; readiness: number; tasks: MaintenanceTask[]; }
export interface FleetVehicleInput { year: number; make: string; model: string; trim: string; mileage: number; vin?: string; primaryUse: string; annualMileage?: number; notes: string; answers: Array<{ category: string; label: string; condition: Condition }>; customItems: string[]; }
