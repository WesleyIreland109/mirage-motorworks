import type { Vehicle } from "@/types/vehicle";
import { assetPath } from "@/lib/assets";

export const mockVehicles: Vehicle[] = [
  {
    id: "veh_type_r",
    slug: "2021-honda-civic-type-r",
    year: 2021,
    make: "Honda",
    model: "Civic Type R",
    trim: "FK8 Touring Edition",
    status: "available",
    mileage: 28600,
    exteriorColor: "Championship White",
    interiorColor: "Black and Red",
    transmission: "6-speed manual",
    drivetrain: "FWD",
    engine: "2.0L Turbocharged Inline-Four",
    askingPrice: 50000,
    investedAmount: 43000,
    projectedProfit: 7000,
    daysInInventory: 6,
    heroImage: assetPath("vehicles/type-r/hero.jpg"),
    gallery: [
      assetPath("vehicles/type-r/front.jpg"),
      assetPath("vehicles/type-r/side.jpg"),
      assetPath("vehicles/type-r/rear.jpg"),
    ],
    highlights: [
      "Championship White over red-accented cabin",
      "6-speed manual",
      "Track-bred FK8 chassis",
      "Aggressive aero and stance",
    ],
    story:
      "A 2021 Civic Type R with the kind of presence that made the FK8 impossible to ignore: serious pace, manual control, and a personality that still feels wonderfully unfiltered.",
    inspectionNotes:
      "Initial presentation review complete. Mechanical inspection, paint readings, and service documentation are queued before final dossier release.",
    createdAt: "2026-07-22T14:00:00Z",
    updatedAt: "2026-07-22T14:00:00Z",
  },
  {
    id: "veh_camaro_2ss",
    slug: "2013-chevrolet-camaro-2ss",
    year: 2013,
    make: "Chevrolet",
    model: "Camaro",
    trim: "2SS Coupe",
    status: "available",
    mileage: 41200,
    exteriorColor: "Black",
    interiorColor: "Black Leather",
    transmission: "6-speed manual",
    drivetrain: "RWD",
    engine: "6.2L LS3 V8",
    askingPrice: 50000,
    investedAmount: 41000,
    projectedProfit: 9000,
    daysInInventory: 4,
    heroImage: assetPath("vehicles/camaro/hero.jpg"),
    gallery: [
      assetPath("vehicles/camaro/front.jpg"),
      assetPath("vehicles/camaro/detail.jpg"),
      assetPath("vehicles/camaro/rear.jpg"),
    ],
    highlights: [
      "2SS V8 coupe",
      "Black-on-black presentation",
      "Wide, low stance",
      "Analog muscle-car character",
    ],
    story:
      "A 2013 Camaro 2SS with the right visual weight: black paint, V8 attitude, and a simple brief. Big displacement, rear drive, and drama without apology.",
    inspectionNotes:
      "Cosmetic photo review complete. Mechanical inspection, tire/brake measurements, and service documentation are queued before final dossier release.",
    createdAt: "2026-07-22T14:10:00Z",
    updatedAt: "2026-07-22T14:10:00Z",
  },
];
