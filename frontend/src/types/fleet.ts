export type TaskStatus =
  "suggested" | "accepted" | "in_progress" | "completed" | "deferred";
export type Condition = "good" | "monitor" | "needs_attention" | "unknown";
export type VehiclePurpose = "personal" | "working_on" | "flip";

export interface MaintenanceTask {
  id: string;
  title: string;
  category: string;
  priority: string;
  penalty: number;
  status: TaskStatus;
  source: string;
  notes: string;
}
export interface FleetVehicle {
  id: string;
  year: number;
  make: string;
  model: string;
  trim: string;
  mileage: number;
  vin?: string;
  primaryUse: string;
  annualMileage?: number;
  notes: string;
  purpose: VehiclePurpose;
  ownerName?: string;
  acquisitionPriceCents?: number;
  targetSalePriceCents?: number;
  readiness: number;
  tasks: MaintenanceTask[];
}
export interface FleetVehicleInput {
  year: number;
  make: string;
  model: string;
  trim: string;
  mileage: number;
  vin?: string;
  primaryUse: string;
  annualMileage?: number;
  notes: string;
  purpose: VehiclePurpose;
  ownerName?: string;
  acquisitionPriceCents?: number;
  targetSalePriceCents?: number;
  answers: Array<{ category: string; label: string; condition: Condition }>;
  customItems: string[];
}

export interface MetricSummary {
  key: string;
  label: string;
  unit: string;
  samples: number;
  min: number;
  average: number;
  max: number;
}
export interface SessionImport {
  vehicleId: string;
  externalSessionId: string;
  label: string;
  startedAt: string;
  durationMs: number;
  samples: number;
  obdRequests: number;
  obdErrors: number;
  source: "vehicle" | "simulator" | "unknown";
  metrics: MetricSummary[];
  recordedMileage?: number;
}
export interface TelemetrySession extends Omit<SessionImport, "vehicleId"> {
  id: string;
  vehicleId: string;
  importedAt: string;
}
export interface DriveReport {
  id: string;
  sessionId: string;
  publicToken: string;
  title: string;
  overview: string;
  observations: string[];
  status: "draft" | "published" | "revoked";
  publishedAt?: string;
  vehicleLabel: string;
  sessionLabel: string;
  startedAt: string;
  source: string;
  metrics: MetricSummary[];
}
export interface MirageAIVehicleDraft { year?: number; make?: string; model?: string; trim?: string; vin?: string; mileage?: number; profileId?: string; }
export interface MirageAIAnalysis { title: string; overview: string; observations: string[]; suggestions: string[]; vehicle: MirageAIVehicleDraft; }
