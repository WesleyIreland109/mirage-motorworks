import type { MetricSummary, SessionImport } from "@/types/fleet";

type Reading = { available?: boolean; value?: number; source?: string; unit?: string; timestamp?: string };
type IdentityField = { value?: string | number } | string | number | undefined;

export interface SessionSummary {
  id?: string;
  label?: string;
  startedAt?: string;
  durationMs?: number;
  samples?: number;
  obdRequests?: number;
  obdErrors?: number;
  attachment?: {
    identity?: Record<string, IdentityField>;
    profile?: { profileId?: string; confidence?: string };
  };
}

export interface DetectedVehicle {
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
  vin?: string;
  profileId?: string;
  confidence?: string;
}

const metricLabels: Record<string, string> = {
  rpm: "Engine speed", vehicle_speed_mph: "Vehicle speed", coolant_temp_f: "Coolant temperature",
  intake_air_temp_f: "Intake temperature", throttle_percent: "Throttle position",
  engine_load_percent: "Calculated engine load", fuel_level_percent: "Fuel level",
  battery_voltage: "Control-module voltage", oil_temp_f: "Oil temperature",
  boost_psi: "Boost / vacuum", afr: "Air/fuel ratio", lambda: "Lambda",
  fuel_pressure_psi: "Fuel pressure", ignition_timing: "Ignition timing",
  provider_latency_ms: "Diagnostic response latency",
};
const metricUnits: Record<string, string> = {
  rpm: "RPM", vehicle_speed_mph: "mph", throttle_percent: "%", engine_load_percent: "%",
  battery_voltage: "V", coolant_temp_f: "°F", oil_temp_f: "°F", intake_air_temp_f: "°F",
  provider_latency_ms: "ms", boost_psi: "psi", afr: "AFR", lambda: "λ", fuel_pressure_psi: "psi",
};

function field(value: IdentityField): string | undefined {
  const raw = typeof value === "object" && value !== null ? value.value : value;
  if (raw === undefined || raw === null) return undefined;
  const text = String(raw).trim();
  return !text || text.toUpperCase() === "UNKNOWN" || text.startsWith("REDACTED-") ? undefined : text;
}

export function detectVehicle(summary: SessionSummary): DetectedVehicle {
  const identity = summary.attachment?.identity ?? {};
  const yearText = field(identity.modelYear);
  const vin = field(identity.vin);
  return {
    year: yearText && /^\d{4}$/.test(yearText) ? Number(yearText) : undefined,
    make: field(identity.make) ?? field(identity.manufacturer),
    model: field(identity.model),
    trim: field(identity.trim) ?? field(identity.generation),
    vin: vin?.length === 17 ? vin.toUpperCase() : undefined,
    profileId: summary.attachment?.profile?.profileId,
    confidence: summary.attachment?.profile?.confidence,
  };
}

export function summarizeTelemetry(text: string): { metrics: MetricSummary[]; source: SessionImport["source"] } {
  const values = new Map<string, { values: number[]; unit: string; timestamps: Set<string> }>();
  const sources = new Set<string>();
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    try {
      const row = JSON.parse(line) as Record<string, unknown> & { adapter?: { port?: string } };
      if (row.adapter?.port?.startsWith("sim://")) sources.add("simulator");
      for (const [key, candidate] of Object.entries(row)) {
        if (!candidate || typeof candidate !== "object" || !("available" in candidate) || !("value" in candidate)) continue;
        const reading = candidate as Reading;
        if (reading.source) sources.add(reading.source);
        if (reading.available !== false && typeof reading.value === "number" && Number.isFinite(reading.value)) {
          const bucket = values.get(key) ?? { values: [], unit: reading.unit ?? metricUnits[key] ?? "", timestamps: new Set<string>() };
          const sampleKey = reading.timestamp ?? `${bucket.values.length}`;
          if (bucket.timestamps.has(sampleKey)) continue;
          bucket.timestamps.add(sampleKey); bucket.values.push(reading.value); values.set(key, bucket);
        }
      }
    } catch { /* Ignore incomplete trailing lines. */ }
  }
  const metrics = [...values.entries()].map(([key, bucket]) => ({
    key, label: metricLabels[key] ?? key.replace(/([A-Z])/g, " $1"), unit: bucket.unit,
    samples: bucket.values.length, min: Math.min(...bucket.values),
    average: bucket.values.reduce((a, b) => a + b, 0) / bucket.values.length, max: Math.max(...bucket.values),
  }));
  const hasOBD = [...sources].some((source) => source.startsWith("obd"));
  return { metrics, source: sources.has("simulator") && !hasOBD ? "simulator" : hasOBD || sources.has("vehicle") ? "vehicle" : "unknown" };
}
