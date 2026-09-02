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
export interface MaintenanceTaskInput {
  title: string;
  category: string;
  priority: "verify" | "routine" | "important" | "safety";
  penalty: number;
  status: TaskStatus;
  notes: string;
}
export type MaintenanceTaskUpdate = Partial<Omit<MaintenanceTaskInput, "status">> & {
  status: TaskStatus;
  completedMileage?: number;
};
export interface FleetVehicleShare {
  id: string;
  userId: string;
  email: string;
  displayName: string;
  permission: "viewer" | "editor";
  createdAt: string;
}
export interface FleetVehicle {
  id: string;
  year: number;
  make: string;
  model: string;
  nickname: string;
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
  accessRole: "owner" | "viewer" | "editor" | "admin";
  shares: FleetVehicleShare[];
}
export interface FleetVehicleInput {
  year: number;
  make: string;
  model: string;
  nickname?: string;
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
export type FleetVehicleUpdate = Omit<FleetVehicleInput, "answers" | "customItems">;

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
  detectedVehicle?: TelemetryVehicleIdentity;
}
export interface TelemetrySession extends Omit<SessionImport, "vehicleId"> {
  id: string;
  vehicleId: string;
  importedAt: string;
  status: "active" | "archived";
  archivedAt?: string;
}
export interface TelemetryVehicleIdentity {
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
  vin?: string;
  profileId?: string;
}
export interface TelemetryIntakeImport {
  externalSessionId: string;
  label: string;
  startedAt: string;
  durationMs: number;
  samples: number;
  obdRequests: number;
  obdErrors: number;
  source: SessionImport["source"];
  metrics: MetricSummary[];
  recordedMileage?: number;
  detectedVehicle: TelemetryVehicleIdentity;
}
export interface TelemetryIntakeSession extends TelemetryIntakeImport {
  id: string;
  status: "unassigned" | "assigned" | "archived";
  assignedVehicleId?: string;
  createdAt: string;
  updatedAt: string;
}
export interface BulkTelemetryImportResult {
  imported: TelemetrySession[];
  queued: TelemetryIntakeSession[];
  skipped: string[];
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
  assessments: MetricAssessment[];
  visibility: "private" | "customer" | "public";
  viewerUserId?: string;
}
export interface MetricAssessment { key: string; referenceLow: number; referenceHigh: number; status: "within" | "mixed" | "outside"; description: string; referenceType: "generic_guidance" | "vehicle_specific"; }
export interface MirageAIVehicleDraft { year?: number; make?: string; model?: string; trim?: string; vin?: string; mileage?: number; profileId?: string; }
export interface MirageAIAnalysis { title: string; overview: string; observations: string[]; suggestions: string[]; vehicle: MirageAIVehicleDraft; }

export type ProspectStatus =
  | "new"
  | "researching"
  | "inspecting"
  | "review"
  | "offer_candidate"
  | "auction_live"
  | "auction_ended"
  | "sold"
  | "declined"
  | "purchased";
export type ProspectAuctionStatus = "unknown" | "live" | "ended" | "sold";
export type ProspectChecklistResult = "pass" | "monitor" | "fail" | "unknown" | "not_applicable";

export interface ProspectChecklistItem {
  category: string;
  label: string;
  result: ProspectChecklistResult;
  notes: string;
}

export interface ProspectObdSnapshot {
  scannerUsed: boolean;
  scannerModel: string;
  codesPresent: "clear" | "codes_present" | "not_scanned" | "unknown";
  codeSummary: string;
  monitorsReady: "ready" | "not_ready" | "mixed" | "unknown";
  freezeFrameNotes: string;
  liveDataNotes: string;
}

export interface ProspectReport {
  id: string;
  createdByUserId: string;
  listingUrl: string;
  vehicleLabel: string;
  askingPriceCents?: number;
  mileage?: number;
  location: string;
  sellerName: string;
  vin?: string;
  status: ProspectStatus;
  summary: string;
  auctionStatus: ProspectAuctionStatus;
  auctionEndsAt?: string;
  checklist: ProspectChecklistItem[];
  obd: ProspectObdSnapshot;
  estimatedRepairCents?: number;
  recommendedOfferCents?: number;
  valueNotes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProspectAIAnalysis {
  vehicleLabel?: string;
  askingPriceCents?: number;
  mileage?: number;
  location?: string;
  sellerName?: string;
  vin?: string;
  status: ProspectStatus;
  summary: string;
  auctionStatus: ProspectAuctionStatus;
  auctionEndsAt?: string;
  estimatedRepairCents?: number;
  recommendedOfferCents?: number;
  valueNotes: string;
  confidence: "low" | "medium" | "high";
  sourceNotes: string[];
}

export type ProspectReportInput = Omit<ProspectReport, "id" | "createdByUserId" | "createdAt" | "updatedAt">;

export interface ProspectScrapeRequest {
  source: "carsandbids";
  maxPriceCents?: number;
  minYear?: number;
  maxYear?: number;
  transmission: "any" | "manual" | "automatic";
  makes: string[];
  maxResults: number;
}

export interface ProspectScrapeCandidate {
  listingUrl: string;
  vehicleLabel: string;
  askingPriceCents?: number;
  year?: number;
  make?: string;
  transmission?: string;
  summary: string;
  auctionStatus: ProspectAuctionStatus;
}

export interface ProspectScrapeResponse {
  candidates: ProspectScrapeCandidate[];
  sourceNotes: string[];
}
