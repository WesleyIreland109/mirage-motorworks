export type ShopStage =
  | "Intake"
  | "DVI"
  | "Estimate"
  | "Parts"
  | "Mechanical"
  | "Fabrication"
  | "QC"
  | "Detail"
  | "Ready";

export interface ChecklistItem {
  label: string;
  status: "done" | "active" | "blocked" | "todo";
}

export interface GarageJob {
  vehicleId: string;
  vin: string;
  repairOrder: string;
  bay: string;
  technician: string;
  advisor: string;
  stage: ShopStage;
  priority: "Standard" | "High";
  carfaxStatus: string;
  titleStatus: string;
  targetShipDate: string;
  blocker: string;
  notes: string[];
  checklist: ChecklistItem[];
  parts: Array<{
    name: string;
    status: "In stock" | "Ordered" | "Backordered" | "Installed";
  }>;
  documents: Array<{
    name: string;
    status: "Attached" | "Requested" | "Needs review";
  }>;
  handoff: ChecklistItem[];
}

export const garageJobs: GarageJob[] = [
  {
    vehicleId: "veh_type_r",
    vin: "SHHFK8G7XMU204821",
    repairOrder: "RO-1027",
    bay: "Bay 2",
    technician: "Wes",
    advisor: "Mirage Intake",
    stage: "DVI",
    priority: "High",
    carfaxStatus: "Clean history packet requested",
    titleStatus: "Clear title, seller docs received",
    targetShipDate: "Jul 31",
    blocker: "Awaiting lift inspection photos",
    notes: [
      "Verify FK8 Touring trim details before final listing copy.",
      "Document underbody, wheel condition, tire date codes, and any aftermarket hardware.",
      "OEM+ prep target: preserve factory feel, correct small wear items, no loud cosmetic changes.",
    ],
    checklist: [
      { label: "VIN and title matched", status: "done" },
      { label: "Digital vehicle inspection", status: "active" },
      { label: "Compression and leak check", status: "todo" },
      { label: "Road test with hot restart", status: "todo" },
      { label: "Photo defect log", status: "todo" },
      { label: "Final QC signoff", status: "todo" },
    ],
    parts: [
      { name: "OEM Honda oil filter", status: "In stock" },
      { name: "Honda MTF fluid", status: "Ordered" },
      { name: "Cabin filter", status: "In stock" },
    ],
    documents: [
      { name: "Carfax report", status: "Requested" },
      { name: "Seller service records", status: "Needs review" },
      { name: "VIN photo set", status: "Attached" },
    ],
    handoff: [
      { label: "Interior detail", status: "todo" },
      { label: "Exterior wash and paint notes", status: "todo" },
      { label: "Battery tender before shipment", status: "todo" },
      { label: "Buyer dossier assembled", status: "todo" },
    ],
  },
  {
    vehicleId: "veh_camaro_2ss",
    vin: "2G1FK1EJXD9203814",
    repairOrder: "RO-1028",
    bay: "Bay 1",
    technician: "Alex",
    advisor: "Mirage Intake",
    stage: "Mechanical",
    priority: "Standard",
    carfaxStatus: "Clean report on file",
    titleStatus: "Clear title, odometer statement pending",
    targetShipDate: "Aug 2",
    blocker: "Waiting on tire depth measurements",
    notes: [
      "Confirm 2SS equipment, LS3 service history, and wheel/tire spec.",
      "Inspect cooling system, belts, brakes, clutch feel, and rear differential seepage.",
      "OEM+ prep target: correct wear, preserve black-on-black look, avoid over-modified presentation.",
    ],
    checklist: [
      { label: "VIN and title matched", status: "done" },
      { label: "Carfax attached", status: "done" },
      { label: "Mechanical inspection", status: "active" },
      { label: "Brake and tire measurements", status: "blocked" },
      { label: "Road test with scan report", status: "todo" },
      { label: "Final QC signoff", status: "todo" },
    ],
    parts: [
      { name: "ACDelco oil filter", status: "In stock" },
      { name: "DOT 4 brake fluid", status: "Ordered" },
      { name: "Wiper blades", status: "Installed" },
    ],
    documents: [
      { name: "Carfax report", status: "Attached" },
      { name: "Seller service records", status: "Requested" },
      { name: "Odometer statement", status: "Requested" },
    ],
    handoff: [
      { label: "Final road test", status: "todo" },
      { label: "Detail engine bay and interior", status: "todo" },
      { label: "Load scan report into dossier", status: "todo" },
      { label: "Shipment photo set", status: "todo" },
    ],
  },
];
