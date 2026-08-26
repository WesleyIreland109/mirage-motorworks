import type {
  ProspectChecklistItem,
  ProspectObdSnapshot,
  ProspectReport,
  ProspectReportInput,
  ProspectStatus,
} from "@/types/fleet";

export const prospectChecklistTemplate: ProspectChecklistItem[] = [
  { category: "Listing", label: "Listing URL, seller, location, mileage, and title story are captured.", result: "unknown", notes: "" },
  { category: "Listing", label: "Asking price leaves room for transport, parts, labor, detail, and Mirage margin.", result: "unknown", notes: "" },
  { category: "Listing", label: "VIN is visible in the listing or obtained before serious follow-up.", result: "unknown", notes: "" },
  { category: "Exterior", label: "Body panels, paint match, glass, lights, and trim look consistent with the story.", result: "unknown", notes: "" },
  { category: "Exterior", label: "Rust, underside condition, leaks, and accident clues were checked in person.", result: "unknown", notes: "" },
  { category: "Interior", label: "Interior wear, odor, electronics, safety equipment, and warning lights were checked.", result: "unknown", notes: "" },
  { category: "Mechanical", label: "Cold start, idle, fluids, belts, hoses, charging, and cooling behavior were checked.", result: "unknown", notes: "" },
  { category: "Test Drive", label: "Steering, braking, clutch or transmission, suspension noise, and highway behavior were checked.", result: "unknown", notes: "" },
  { category: "OBD", label: "OBD scan completed or intentionally skipped with a reason documented below.", result: "unknown", notes: "" },
  { category: "Decision", label: "Repair scope is clear enough to make a Mirage buy, pass, or follow-up decision.", result: "unknown", notes: "" },
];

export const emptyProspectObd: ProspectObdSnapshot = {
  scannerUsed: false,
  scannerModel: "",
  codesPresent: "unknown",
  codeSummary: "",
  monitorsReady: "unknown",
  freezeFrameNotes: "",
  liveDataNotes: "",
};

export const prospectStatusLabels: Record<ProspectStatus, string> = {
  new: "New",
  researching: "Researching",
  inspecting: "Inspecting",
  review: "Review",
  offer_candidate: "Offer Candidate",
  declined: "Declined",
  purchased: "Purchased",
};

export interface ProspectFormState {
  listingUrl: string;
  vehicleLabel: string;
  askingPrice: string;
  mileage: string;
  location: string;
  sellerName: string;
  vin: string;
  status: ProspectStatus;
  summary: string;
  checklist: ProspectChecklistItem[];
  obd: ProspectObdSnapshot;
  estimatedRepair: string;
  recommendedOffer: string;
  valueNotes: string;
}

export function blankProspectForm(): ProspectFormState {
  return {
    listingUrl: "",
    vehicleLabel: "",
    askingPrice: "",
    mileage: "",
    location: "",
    sellerName: "",
    vin: "",
    status: "new",
    summary: "",
    checklist: prospectChecklistTemplate.map((item) => ({ ...item })),
    obd: { ...emptyProspectObd },
    estimatedRepair: "",
    recommendedOffer: "",
    valueNotes: "",
  };
}

export function centsToDollars(value?: number) {
  return value == null ? "" : String(Math.round(value / 100));
}

export function dollarsToCents(value: string) {
  const parsed = Number(value.replace(/[$,\s]/g, ""));
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) : undefined;
}

export function optionalInteger(value: string) {
  const parsed = Number(value.replace(/[,\s]/g, ""));
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

export function formatMoney(value?: number) {
  if (value == null) return "No target";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value / 100);
}

export function formFromProspect(prospect: ProspectReport): ProspectFormState {
  return {
    listingUrl: prospect.listingUrl,
    vehicleLabel: prospect.vehicleLabel,
    askingPrice: centsToDollars(prospect.askingPriceCents),
    mileage: prospect.mileage == null ? "" : String(prospect.mileage),
    location: prospect.location,
    sellerName: prospect.sellerName,
    vin: prospect.vin ?? "",
    status: prospect.status,
    summary: prospect.summary,
    checklist: prospect.checklist.length ? prospect.checklist : prospectChecklistTemplate.map((item) => ({ ...item })),
    obd: { ...emptyProspectObd, ...prospect.obd },
    estimatedRepair: centsToDollars(prospect.estimatedRepairCents),
    recommendedOffer: centsToDollars(prospect.recommendedOfferCents),
    valueNotes: prospect.valueNotes,
  };
}

export function inputFromProspectForm(form: ProspectFormState): ProspectReportInput {
  return {
    listingUrl: form.listingUrl,
    vehicleLabel: form.vehicleLabel,
    askingPriceCents: dollarsToCents(form.askingPrice),
    mileage: optionalInteger(form.mileage),
    location: form.location,
    sellerName: form.sellerName,
    vin: form.vin || undefined,
    status: form.status,
    summary: form.summary,
    checklist: form.checklist,
    obd: form.obd,
    estimatedRepairCents: dollarsToCents(form.estimatedRepair),
    recommendedOfferCents: dollarsToCents(form.recommendedOffer),
    valueNotes: form.valueNotes,
  };
}
