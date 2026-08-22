import type { Vehicle, VehicleInput } from "@/types/vehicle";
import type {
  DriveReport,
  FleetVehicle,
  FleetVehicleInput,
  SessionImport,
  TaskStatus,
  TelemetrySession,
  MirageAIAnalysis,
  MirageAIVehicleDraft,
  MetricSummary,
} from "@/types/fleet";

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || "/api";

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: string;
}

export interface CustomerProfile { user: AuthUser; phone: string; preferredContact: "email" | "phone" | "text"; marketingOptIn: boolean; }

export interface ContactInquiry {
  name: string;
  email: string;
  subject: string;
  message: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    ...init,
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function login(
  email: string,
  password: string,
): Promise<AuthUser> {
  const response = await request<{ user: AuthUser }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return response.user;
}

export async function register(email: string, password: string, displayName: string): Promise<AuthUser> {
  const response = await request<{ user: AuthUser }>("/auth/register", { method: "POST", body: JSON.stringify({ email, password, displayName }) });
  return response.user;
}

export async function forgotPassword(email: string): Promise<void> {
  await request<{ message: string }>("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
}

export async function resetPassword(token: string, password: string): Promise<void> {
  await request<{ message: string }>("/auth/reset-password", { method: "POST", body: JSON.stringify({ token, password }) });
}

export async function sendContactInquiry(input: ContactInquiry): Promise<void> {
  await request<{ message: string }>("/contact", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function getProfile(): Promise<CustomerProfile> { return request<CustomerProfile>("/auth/profile"); }
export async function updateProfile(input: Omit<CustomerProfile, "user"> & { displayName: string }): Promise<CustomerProfile> {
  return request<CustomerProfile>("/auth/profile", { method: "PUT", body: JSON.stringify(input) });
}

export async function currentUser(): Promise<AuthUser | null> {
  try {
    const response = await request<{ user: AuthUser }>("/auth/me");
    return response.user;
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  await request<void>("/auth/logout", { method: "POST" });
}

export async function listUsers(): Promise<AuthUser[]> {
  return request<AuthUser[]>("/admin/users");
}

export async function promoteUser(userId: string): Promise<AuthUser> {
  return request<AuthUser>(`/admin/users/${userId}/promote`, { method: "PUT" });
}

export async function listFleet(): Promise<FleetVehicle[]> {
  return request<FleetVehicle[]>("/fleet");
}
export async function createFleetVehicle(
  input: FleetVehicleInput,
): Promise<FleetVehicle> {
  return request<FleetVehicle>("/fleet", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
export async function updateMaintenanceTask(
  id: string,
  status: TaskStatus,
  completedMileage?: number,
): Promise<FleetVehicle> {
  return request<FleetVehicle>(`/fleet/tasks/${id}`, {
    method: "PUT",
    body: JSON.stringify({ status, completedMileage }),
  });
}
export async function listTelemetrySessions(
  vehicleId?: string,
): Promise<TelemetrySession[]> {
  return request<TelemetrySession[]>(
    `/telemetry-sessions${vehicleId ? `?vehicleId=${encodeURIComponent(vehicleId)}` : ""}`,
  );
}
export async function importTelemetrySession(
  input: SessionImport,
): Promise<TelemetrySession> {
  return request<TelemetrySession>("/telemetry-sessions", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
export async function deleteTelemetrySession(sessionId: string): Promise<void> {
  await request<void>(`/telemetry-sessions/${sessionId}`, { method: "DELETE" });
}
export async function analyzeTelemetry(input: { vehicle: MirageAIVehicleDraft; sessionLabel: string; startedAt: string; durationMs: number; samples: number; obdRequests: number; obdErrors: number; source: string; metrics: MetricSummary[] }): Promise<MirageAIAnalysis> {
  return request<MirageAIAnalysis>("/mirage-ai/analyze", { method: "POST", body: JSON.stringify(input) });
}
export async function saveDriveReport(
  sessionId: string,
  draft: { title: string; overview: string; observations: string[] },
): Promise<DriveReport> {
  return request<DriveReport>(`/telemetry-sessions/${sessionId}/report`, {
    method: "PUT",
    body: JSON.stringify(draft),
  });
}
export async function publishDriveReport(
  sessionId: string,
  access: { visibility: "private" | "customer" | "public"; viewerUserId?: string },
): Promise<DriveReport> {
  return request<DriveReport>(`/telemetry-sessions/${sessionId}/publish`, {
    method: "POST",
    body: JSON.stringify(access),
  });
}
export async function getDriveReport(token: string): Promise<DriveReport> {
  return request<DriveReport>(`/drive-reports/${token}`);
}

export async function listVehicles(): Promise<Vehicle[]> {
  return request<Vehicle[]>("/vehicles");
}

export async function getVehicle(slug: string): Promise<Vehicle | undefined> {
  return request<Vehicle>(`/vehicles/${slug}`);
}

export async function createVehicle(input: VehicleInput): Promise<Vehicle> {
  return request<Vehicle>("/vehicles", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateVehicle(
  id: string,
  input: VehicleInput,
): Promise<Vehicle> {
  return request<Vehicle>(`/vehicles/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function deleteVehicle(id: string): Promise<void> {
  await request<void>(`/vehicles/${id}`, { method: "DELETE" });
}
