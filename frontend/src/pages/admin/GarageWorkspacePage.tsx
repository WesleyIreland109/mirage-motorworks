import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  BadgeDollarSign,
  Copy,
  FileUp,
  Plus,
  Send,
} from "lucide-react";
import { useMemo, useState } from "react";

import {
  createFleetVehicle,
  importTelemetrySession,
  listFleet,
  listTelemetrySessions,
  publishDriveReport,
  saveDriveReport,
} from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type {
  DriveReport,
  FleetVehicleInput,
  MetricSummary,
  SessionImport,
  VehiclePurpose,
} from "@/types/fleet";

const emptyAnswers: FleetVehicleInput["answers"] = [];
type SessionSummary = {
  id?: string;
  label?: string;
  startedAt?: string;
  durationMs?: number;
  samples?: number;
  obdRequests?: number;
  obdErrors?: number;
};
type Reading = {
  available?: boolean;
  value?: number;
  source?: string;
  unit?: string;
};

const metricLabels: Record<string, string> = {
  rpm: "Engine speed",
  speed: "Vehicle speed",
  coolantTemp: "Coolant temperature",
  intakeTemp: "Intake temperature",
  throttlePosition: "Throttle position",
  engineLoad: "Engine load",
  fuelLevel: "Fuel level",
  controlModuleVoltage: "Control-module voltage",
};

function summarizeTelemetry(text: string): {
  metrics: MetricSummary[];
  source: SessionImport["source"];
} {
  const values = new Map<string, { values: number[]; unit: string }>();
  const sources = new Set<string>();
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    try {
      const row = JSON.parse(line) as {
        readings?: Record<string, Reading>;
        adapter?: { port?: string };
      };
      if (row.adapter?.port?.startsWith("sim://")) sources.add("simulator");
      for (const [key, reading] of Object.entries(row.readings ?? {})) {
        if (reading.source) sources.add(reading.source);
        if (
          reading.available !== false &&
          typeof reading.value === "number" &&
          Number.isFinite(reading.value)
        ) {
          const bucket = values.get(key) ?? {
            values: [],
            unit: reading.unit ?? "",
          };
          bucket.values.push(reading.value);
          values.set(key, bucket);
        }
      }
    } catch {
      /* Ignore incomplete trailing lines from an interrupted recording. */
    }
  }
  const metrics = [...values.entries()].map(([key, bucket]) => ({
    key,
    label: metricLabels[key] ?? key.replace(/([A-Z])/g, " $1"),
    unit: bucket.unit,
    samples: bucket.values.length,
    min: Math.min(...bucket.values),
    average: bucket.values.reduce((a, b) => a + b, 0) / bucket.values.length,
    max: Math.max(...bucket.values),
  }));
  const source =
    sources.has("simulator") && !sources.has("obd")
      ? "simulator"
      : sources.has("obd") || sources.has("vehicle")
        ? "vehicle"
        : "unknown";
  return { metrics, source };
}

function VehicleForm({
  purpose,
  done,
}: {
  purpose: VehiclePurpose;
  done: () => void;
}) {
  const client = useQueryClient();
  const [form, setForm] = useState({
    year: new Date().getFullYear(),
    make: "",
    model: "",
    trim: "",
    mileage: 0,
    ownerName: "",
    acquisitionPrice: "",
    targetPrice: "",
    notes: "",
  });
  const mutation = useMutation({
    mutationFn: createFleetVehicle,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["fleet"] });
      done();
    },
  });
  const submit = () =>
    mutation.mutate({
      year: form.year,
      make: form.make,
      model: form.model,
      trim: form.trim,
      mileage: form.mileage,
      primaryUse: purpose === "flip" ? "resale" : "diagnostic",
      notes: form.notes,
      purpose,
      ownerName: form.ownerName || undefined,
      acquisitionPriceCents: form.acquisitionPrice
        ? Math.round(Number(form.acquisitionPrice) * 100)
        : undefined,
      targetSalePriceCents: form.targetPrice
        ? Math.round(Number(form.targetPrice) * 100)
        : undefined,
      answers: emptyAnswers,
      customItems: [],
    });
  return (
    <Card className="mt-5 p-5">
      <div className="grid gap-3 md:grid-cols-4">
        <Input
          type="number"
          value={form.year}
          onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
        />
        <Input
          placeholder="Make"
          value={form.make}
          onChange={(e) => setForm({ ...form, make: e.target.value })}
        />
        <Input
          placeholder="Model"
          value={form.model}
          onChange={(e) => setForm({ ...form, model: e.target.value })}
        />
        <Input
          placeholder="Trim"
          value={form.trim}
          onChange={(e) => setForm({ ...form, trim: e.target.value })}
        />
        <Input
          type="number"
          placeholder="Mileage"
          value={form.mileage || ""}
          onChange={(e) =>
            setForm({ ...form, mileage: Number(e.target.value) })
          }
        />
        {purpose === "working_on" && (
          <Input
            placeholder="Owner / friend name"
            value={form.ownerName}
            onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
          />
        )}{" "}
        {purpose === "flip" && (
          <>
            <Input
              placeholder="Purchase price"
              value={form.acquisitionPrice}
              onChange={(e) =>
                setForm({ ...form, acquisitionPrice: e.target.value })
              }
            />
            <Input
              placeholder="Target sale price"
              value={form.targetPrice}
              onChange={(e) =>
                setForm({ ...form, targetPrice: e.target.value })
              }
            />
          </>
        )}
      </div>
      <Textarea
        className="mt-3"
        placeholder="Private notes"
        value={form.notes}
        onChange={(e) => setForm({ ...form, notes: e.target.value })}
      />
      <Button
        className="mt-4"
        disabled={!form.make || !form.model || mutation.isPending}
        onClick={submit}
      >
        <Plus size={16} /> Add vehicle
      </Button>
    </Card>
  );
}

export function GarageWorkspacePage({
  purpose,
}: {
  purpose: "working_on" | "flip";
}) {
  const client = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [vehicleId, setVehicleId] = useState("");
  const [summary, setSummary] = useState<SessionSummary>();
  const [telemetryText, setTelemetryText] = useState("");
  const [reports, setReports] = useState<Record<string, DriveReport>>({});
  const { data: fleet = [] } = useQuery({
    queryKey: ["fleet"],
    queryFn: listFleet,
  });
  const vehicles = fleet.filter((v) => v.purpose === purpose);
  const { data: sessions = [] } = useQuery({
    queryKey: ["telemetry-sessions"],
    queryFn: () => listTelemetrySessions(),
  });
  const imported = useMemo(
    () =>
      sessions.filter((session) =>
        vehicles.some((vehicle) => vehicle.id === session.vehicleId),
      ),
    [sessions, vehicles],
  );
  const ingest = useMutation({
    mutationFn: importTelemetrySession,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["telemetry-sessions"] });
      setSummary(undefined);
      setTelemetryText("");
    },
  });
  async function chooseFiles(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files)) {
      const text = await file.text();
      if (file.name.endsWith(".jsonl")) setTelemetryText(text);
      else {
        try {
          setSummary(JSON.parse(text));
        } catch {
          /* invalid file remains unselected */
        }
      }
    }
  }
  function doImport() {
    if (!vehicleId || !summary || !telemetryText) return;
    const parsed = summarizeTelemetry(telemetryText);
    ingest.mutate({
      vehicleId,
      externalSessionId: summary.id ?? crypto.randomUUID(),
      label: summary.label ?? "Mirage drive",
      startedAt: summary.startedAt ?? new Date().toISOString(),
      durationMs: summary.durationMs ?? 0,
      samples: summary.samples ?? 0,
      obdRequests: summary.obdRequests ?? 0,
      obdErrors: summary.obdErrors ?? 0,
      source: parsed.source,
      metrics: parsed.metrics,
    });
  }
  async function draftReport(sessionId: string) {
    const session = imported.find((item) => item.id === sessionId)!;
    const vehicle = vehicles.find((item) => item.id === session.vehicleId)!;
    const simulator = session.source === "simulator";
    const observations = [
      `${session.metrics.length} live metric${session.metrics.length === 1 ? " was" : "s were"} available during this recording.`,
      ...session.metrics
        .slice(0, 6)
        .map(
          (m) =>
            `${m.label}: ${m.min.toFixed(1)}–${m.max.toFixed(1)}${m.unit ? ` ${m.unit}` : ""} (${m.samples} samples).`,
        ),
      simulator
        ? "SIMULATOR DATA: this recording is for software validation and is not evidence about the vehicle."
        : "These observations describe recorded OBD values only; they are not a mechanical inspection or diagnosis.",
    ];
    const report = await saveDriveReport(session.id, {
      title: `Mirage Drive Summary — ${vehicle.year} ${vehicle.make} ${vehicle.model}`,
      overview: simulator
        ? "A simulator-backed Mirage session was reviewed. No vehicle-health conclusions should be drawn from it."
        : "Mirage reviewed the data channels available during this drive and summarized the observed ranges below.",
      observations,
    });
    setReports({ ...reports, [session.id]: report });
  }
  async function publish(sessionId: string) {
    const report = await publishDriveReport(sessionId);
    setReports({ ...reports, [sessionId]: report });
  }
  const title = purpose === "flip" ? "Flips" : "Working On";
  const subtitle =
    purpose === "flip"
      ? "Temporary inventory from acquisition through repair and sale."
      : "Friends’ and customer vehicles, diagnostic sessions, and shareable drive summaries.";
  return (
    <section className="px-5 py-8 lg:px-8">
      <div className="flex flex-col justify-between gap-4 border-b border-mirage-border pb-6 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[.24em] text-mirage-cyan">
            Garage OS
          </p>
          <h1 className="mt-2 text-4xl font-semibold">{title}</h1>
          <p className="mt-2 text-sm text-mirage-muted">{subtitle}</p>
        </div>
        <Button onClick={() => setAdding(!adding)}>
          <Plus size={17} /> Add vehicle
        </Button>
      </div>
      {adding && (
        <VehicleForm purpose={purpose} done={() => setAdding(false)} />
      )}
      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        {vehicles.map((vehicle) => (
          <Card key={vehicle.id} className="p-5">
            <div className="flex justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[.18em] text-mirage-muted">
                  {vehicle.ownerName ||
                    (purpose === "flip" ? "Mirage inventory" : "Guest vehicle")}
                </p>
                <h2 className="mt-2 text-xl font-semibold">
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </h2>
                <p className="text-sm text-mirage-muted">
                  {vehicle.mileage.toLocaleString()} miles
                </p>
              </div>
              {purpose === "flip" && (
                <BadgeDollarSign className="text-mirage-cyan" />
              )}
            </div>
            {purpose === "flip" && (
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div className="bg-white/[.03] p-3">
                  <p className="text-mirage-muted">Acquired</p>
                  <p className="mt-1 text-lg">
                    $
                    {(
                      (vehicle.acquisitionPriceCents ?? 0) / 100
                    ).toLocaleString()}
                  </p>
                </div>
                <div className="bg-white/[.03] p-3">
                  <p className="text-mirage-muted">Target</p>
                  <p className="mt-1 text-lg">
                    $
                    {(
                      (vehicle.targetSalePriceCents ?? 0) / 100
                    ).toLocaleString()}
                  </p>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
      {purpose === "working_on" && (
        <>
          <Card className="mt-8 p-5 lg:p-6">
            <div className="flex items-center gap-3">
              <FileUp className="text-mirage-cyan" />
              <div>
                <h2 className="text-xl font-semibold">
                  Import a recorded drive
                </h2>
                <p className="text-sm text-mirage-muted">
                  Choose that session’s summary JSON and telemetry JSONL. Raw
                  files stay on this computer; Garage OS stores only metric
                  ranges.
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
              <select
                className="h-11 border border-mirage-border bg-mirage-secondary px-3 text-sm"
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
              >
                <option value="">Select vehicle</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.year} {v.make} {v.model}
                  </option>
                ))}
              </select>
              <Input
                type="file"
                multiple
                accept=".json,.jsonl"
                onChange={(e) => chooseFiles(e.target.files)}
              />
              <Button
                disabled={
                  !vehicleId || !summary || !telemetryText || ingest.isPending
                }
                onClick={doImport}
              >
                Import summary
              </Button>
            </div>
          </Card>
          <div className="mt-5 grid gap-4">
            {imported.map((session) => {
              const report = reports[session.id];
              return (
                <Card key={session.id} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Activity size={17} className="text-mirage-cyan" />
                        <h3 className="font-semibold">{session.label}</h3>
                        <span
                          className={`px-2 py-1 text-[10px] uppercase tracking-wider ${session.source === "simulator" ? "bg-amber-400/15 text-amber-200" : "bg-emerald-400/15 text-emerald-200"}`}
                        >
                          {session.source}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-mirage-muted">
                        {new Date(session.startedAt).toLocaleString()} ·{" "}
                        {session.metrics.length} metrics ·{" "}
                        {Math.round(session.durationMs / 1000)} sec
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => draftReport(session.id)}
                      >
                        Build draft
                      </Button>
                      {report?.status === "draft" && (
                        <Button onClick={() => publish(session.id)}>
                          <Send size={15} /> Publish
                        </Button>
                      )}
                      {report?.status === "published" && (
                        <Button
                          variant="ghost"
                          onClick={() =>
                            navigator.clipboard.writeText(
                              `${location.origin}/drive-reports/${report.publicToken}`,
                            )
                          }
                        >
                          <Copy size={15} /> Copy link
                        </Button>
                      )}
                    </div>
                  </div>
                  {report && (
                    <div className="mt-4 border-l-2 border-mirage-cyan pl-4">
                      <p className="text-sm font-medium">
                        {report.status === "published"
                          ? "Published summary"
                          : "Private draft"}
                      </p>
                      <p className="mt-1 text-sm text-mirage-muted">
                        {report.overview}
                      </p>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
