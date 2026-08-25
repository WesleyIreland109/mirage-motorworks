import type { FleetVehicle } from "@/types/fleet";

export function vehicleDisplayName(vehicle: FleetVehicle): string {
  return vehicle.nickname?.trim() || `${vehicle.year} ${vehicle.model}`;
}

export function vehicleFullLabel(vehicle: FleetVehicle): string {
  return `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
}
