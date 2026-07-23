export type VehicleStatus =
  | "available"
  | "coming_soon"
  | "reserved"
  | "sold"
  | "in_prep";

export interface Vehicle {
  id: string;
  slug: string;
  year: number;
  make: string;
  model: string;
  trim: string;
  status: VehicleStatus;
  mileage: number;
  exteriorColor: string;
  interiorColor: string;
  transmission: string;
  drivetrain: string;
  engine: string;
  askingPrice: number;
  investedAmount: number;
  projectedProfit: number;
  daysInInventory: number;
  heroImage: string;
  gallery: string[];
  highlights: string[];
  story: string;
  inspectionNotes: string;
  createdAt: string;
  updatedAt: string;
}

export type VehicleInput = Omit<Vehicle, "id" | "createdAt" | "updatedAt">;
