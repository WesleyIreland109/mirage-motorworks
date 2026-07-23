import { mockVehicles } from "@/data/mockVehicles";
import type { Vehicle, VehicleInput } from "@/types/vehicle";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string | undefined;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error("API base URL is not configured");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
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

const wait = (ms = 180) => new Promise((resolve) => window.setTimeout(resolve, ms));

export async function listVehicles(): Promise<Vehicle[]> {
  try {
    return await request<Vehicle[]>("/vehicles");
  } catch {
    await wait();
    return mockVehicles;
  }
}

export async function getVehicle(slug: string): Promise<Vehicle | undefined> {
  try {
    return await request<Vehicle>(`/vehicles/${slug}`);
  } catch {
    await wait();
    return mockVehicles.find((vehicle) => vehicle.slug === slug);
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
