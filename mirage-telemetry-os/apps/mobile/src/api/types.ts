export type Reading = { value: number | null; available: boolean; status: string; source: string; timestamp: string };
export type Field = { value: string; confidence: number; source: string };
export type VehicleAttachment = {
  state: string; message: string; ecuConnected: boolean; supportedMetrics: number; error?: string;
  adapter?: { port?: string; identity?: string; voltage?: string; protocol?: string };
  identity: { vin: Field; make: Field; model: Field; modelYear: Field; trim: Field; engine: Field };
  profile?: { id?: string; name?: string; score?: number };
};
export type Telemetry = {
  timestamp: string; engine_running: boolean; provider_connected: boolean; attachment: VehicleAttachment;
  rpm: Reading; vehicle_speed_mph: Reading; boost_psi: Reading; throttle_percent: Reading;
  engine_load_percent: Reading; coolant_temp_f: Reading; oil_temp_f: Reading;
  intake_air_temp_f: Reading; battery_voltage: Reading; fuel_level_percent: Reading;
  [key: string]: Reading | VehicleAttachment | string | boolean;
};
export type Session = {
  id: string; label: string; state: string; startedAt: string; endedAt?: string;
  durationMs: number; samples: number; obdRequests: number; obdErrors: number; dataVersion: number;
};
export type Bootstrap = { device: { name: string; version: string }; vehicle: VehicleAttachment; session: Session | null; config: unknown };
