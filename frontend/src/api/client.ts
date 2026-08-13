import { mockVehicles } from "@/data/mockVehicles";
import type { Vehicle, VehicleInput } from "@/types/vehicle";
import type { FleetVehicle, FleetVehicleInput, TaskStatus } from "@/types/fleet";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "/api";

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: string;
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

export async function login(email: string, password: string): Promise<AuthUser> {
  const response = await request<{ user: AuthUser }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return response.user;
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

export async function listFleet(): Promise<FleetVehicle[]> { return request<FleetVehicle[]>("/fleet"); }
export async function createFleetVehicle(input: FleetVehicleInput): Promise<FleetVehicle> { return request<FleetVehicle>("/fleet", { method: "POST", body: JSON.stringify(input) }); }
export async function updateMaintenanceTask(id: string, status: TaskStatus, completedMileage?: number): Promise<FleetVehicle> {
  return request<FleetVehicle>(`/fleet/tasks/${id}`, { method: "PUT", body: JSON.stringify({ status, completedMileage }) });
}

const wait = (ms = 180) => new Promise((resolve) => window.setTimeout(resolve, ms));

export async function listVehicles(): Promise<Vehicle[]> {
  try {
    return await request<Vehicle[]>("/vehicles");
  } catch {
    await wait();
    return API_BASE_URL === "/api" ? [] : mockVehicles;
  }
}

export async function getVehicle(slug: string): Promise<Vehicle | undefined> {
  try {
    return await request<Vehicle>(`/vehicles/${slug}`);
  } catch {
    await wait();
    return API_BASE_URL === "/api" ? undefined : mockVehicles.find((vehicle) => vehicle.slug === slug);
  }
}

export async function createVehicle(input: VehicleInput): Promise<Vehicle> {
  return request<Vehicle>("/vehicles", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateVehicle(id: string, input: VehicleInput): Promise<Vehicle> {
  return request<Vehicle>(`/vehicles/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function deleteVehicle(id: string): Promise<void> {
  await request<void>(`/vehicles/${id}`, { method: "DELETE" });
}
