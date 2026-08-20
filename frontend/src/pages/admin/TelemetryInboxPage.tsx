import { Activity, Car, Copy, FileUp, Send } from "lucide-react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createFleetVehicle, importTelemetrySession, listFleet, listTelemetrySessions, publishDriveReport, saveDriveReport } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { detectVehicle, summarizeTelemetry, type DetectedVehicle, type SessionSummary } from "@/lib/telemetryImport";
import type { DriveReport, FleetVehicle, VehiclePurpose } from "@/types/fleet";

const destinationNames: Record<VehiclePurpose, string> = { personal: "My Garage", working_on: "Working On", flip: "Flips" };

export function TelemetryInboxPage() {
  const client = useQueryClient();
  const [summary, setSummary] = useState<SessionSummary>();
  const [telemetryText, setTelemetryText] = useState("");
  const [detected, setDetected] = useState<DetectedVehicle>({});
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [vehicleId, setVehicleId] = useState("");
  const [purpose, setPurpose] = useState<VehiclePurpose>("personal");
  const [mileage, setMileage] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [notes, setNotes] = useState("");
  const [reports, setReports] = useState<Record<string, DriveReport>>({});
  const [message, setMessage] = useState("");
  const { data: fleet = [] } = useQuery({ queryKey: ["fleet"], queryFn: listFleet });
  const { data: sessions = [] } = useQuery({ queryKey: ["telemetry-sessions"], queryFn: () => listTelemetrySessions() });

  const likelyMatch = useMemo(() => fleet.find((vehicle) =>
    (detected.vin && vehicle.vin?.toUpperCase() === detected.vin) ||
    (detected.make && detected.model && vehicle.make.toLowerCase() === detected.make.toLowerCase() && vehicle.model.toLowerCase() === detected.model.toLowerCase()),
  ), [detected, fleet]);

  async function chooseFiles(files: FileList | null) {
    if (!files) return;
    let nextSummary = summary;
    for (const file of Array.from(files)) {
      const text = await file.text();
      if (file.name.endsWith(".jsonl")) setTelemetryText(text);
      else try { nextSummary = JSON.parse(text) as SessionSummary; setSummary(nextSummary); } catch { setMessage("The summary JSON could not be read."); }
    }
    if (nextSummary) {
      const identity = detectVehicle(nextSummary); setDetected(identity);
      const match = fleet.find((vehicle) => (identity.vin && vehicle.vin?.toUpperCase() === identity.vin) ||
        (identity.make && identity.model && vehicle.make.toLowerCase() === identity.make.toLowerCase() && vehicle.model.toLowerCase() === identity.model.toLowerCase()));
      if (match) { setMode("existing"); setVehicleId(match.id); setMessage(`Likely match found: ${match.year} ${match.make} ${match.model}.`); }
      else setMessage(identity.make || identity.model ? "Vehicle identity detected. Confirm the fields and destination." : "Identity was not available in this recording. Enter the vehicle details to continue.");
    }
  }

  const ingest = useMutation({
    mutationFn: async () => {
      if (!summary || !telemetryText) throw new Error("Select both session files");
      let target: FleetVehicle | undefined = mode === "existing" ? fleet.find((item) => item.id === vehicleId) : undefined;
      if (!target) {
        if (!detected.make || !detected.model || !detected.year || !mileage) throw new Error("Confirm year, make, model, and mileage");
        target = await createFleetVehicle({
          year: detected.year, make: detected.make, model: detected.model, trim: detected.trim ?? "",
          mileage: Number(mileage), vin: detected.vin, purpose,
          primaryUse: purpose === "flip" ? "resale" : "diagnostic", ownerName: ownerName || undefined,
          notes: [notes, detected.profileId ? `Telemetry profile: ${detected.profileId}` : ""].filter(Boolean).join("\n"), answers: [], customItems: [],
        });
      }
      const parsed = summarizeTelemetry(telemetryText);
      return importTelemetrySession({
        vehicleId: target.id, externalSessionId: summary.id ?? crypto.randomUUID(), label: summary.label ?? "Mirage drive",
        startedAt: summary.startedAt ?? new Date().toISOString(), durationMs: summary.durationMs ?? 0,
        samples: summary.samples ?? 0, obdRequests: summary.obdRequests ?? 0, obdErrors: summary.obdErrors ?? 0,
        source: parsed.source, metrics: parsed.metrics, recordedMileage: mileage ? Number(mileage) : undefined,
      });
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["fleet"] }); client.invalidateQueries({ queryKey: ["telemetry-sessions"] });
      setSummary(undefined); setTelemetryText(""); setDetected({}); setVehicleId(""); setMileage("");
      setMessage("Drive imported and attached successfully.");
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "Unable to import drive."),
  });

  async function draftReport(sessionId: string) {
    const session = sessions.find((item) => item.id === sessionId)!;
    const vehicle = fleet.find((item) => item.id === session.vehicleId)!;
    const observations = [
      `${session.metrics.length} live metric${session.metrics.length === 1 ? " was" : "s were"} available during this recording.`,
      ...session.metrics.slice(0, 6).map((metric) => `${metric.label}: ${metric.min.toFixed(1)}–${metric.max.toFixed(1)}${metric.unit ? ` ${metric.unit}` : ""} (${metric.samples} samples).`),
      session.source === "simulator" ? "SIMULATOR DATA: no vehicle-health conclusions should be drawn from it." : "These observations describe recorded OBD values only; they are not a mechanical inspection or diagnosis.",
    ];
    const report = await saveDriveReport(session.id, { title: `Mirage Drive Summary — ${vehicle.year} ${vehicle.make} ${vehicle.model}`, overview: session.source === "simulator" ? "A simulator-backed Mirage session was reviewed." : "Mirage reviewed the data channels available during this drive and summarized the observed ranges below.", observations });
    setReports((current) => ({ ...current, [session.id]: report }));
  }
  async function publish(sessionId: string) { const report = await publishDriveReport(sessionId); setReports((current) => ({ ...current, [sessionId]: report })); }

  return <section className="px-5 py-8 lg:px-8">
    <div className="border-b border-mirage-border pb-6"><p className="text-sm font-semibold uppercase tracking-[.24em] text-mirage-cyan">Garage OS</p><h1 className="mt-2 text-4xl font-semibold">Telemetry Inbox</h1><p className="mt-2 text-sm text-mirage-muted">Upload once, identify the vehicle, then route the drive to the right workspace.</p></div>
    <Card className="mt-8 p-5 lg:p-6">
      <div className="flex items-center gap-3"><FileUp className="text-mirage-cyan"/><div><h2 className="text-xl font-semibold">Import recorded drive</h2><p className="text-sm text-mirage-muted">Choose the summary JSON and telemetry JSONL. Raw files remain in your browser.</p></div></div>
      <Input className="mt-5" type="file" multiple accept=".json,.jsonl" onChange={(event) => chooseFiles(event.target.files)}/>
      {(summary || telemetryText) && <div className="mt-6 space-y-5 border-t border-mirage-border pt-5">
        {likelyMatch && <Card className="border-mirage-cyan/40 bg-mirage-cyan/5 p-4 text-sm">Likely match: <strong>{likelyMatch.year} {likelyMatch.make} {likelyMatch.model}</strong></Card>}
        <div className="flex flex-wrap gap-2"><Button variant={mode === "existing" ? "primary" : "secondary"} onClick={() => setMode("existing")}>Attach to existing</Button><Button variant={mode === "new" ? "primary" : "secondary"} onClick={() => setMode("new")}>Add a new vehicle</Button></div>
        {mode === "existing" ? <div className="grid gap-3 md:grid-cols-2"><select className="h-11 w-full border border-mirage-border bg-mirage-secondary px-3 text-sm" value={vehicleId} onChange={(event) => setVehicleId(event.target.value)}><option value="">Select vehicle</option>{fleet.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{destinationNames[vehicle.purpose]} · {vehicle.year} {vehicle.make} {vehicle.model}</option>)}</select><Input type="number" placeholder="Confirmed mileage (optional)" value={mileage} onChange={(event) => setMileage(event.target.value)}/></div> : <>
          <div><p className="mb-2 text-xs font-semibold uppercase tracking-[.18em] text-mirage-muted">Send to</p><div className="flex flex-wrap gap-2">{(Object.keys(destinationNames) as VehiclePurpose[]).map((value) => <Button key={value} variant={purpose === value ? "primary" : "secondary"} onClick={() => setPurpose(value)}>{destinationNames[value]}</Button>)}</div></div>
          <div className="grid gap-3 md:grid-cols-3"><Input type="number" placeholder="Year" value={detected.year ?? ""} onChange={(e) => setDetected({...detected, year:Number(e.target.value)})}/><Input placeholder="Make" value={detected.make ?? ""} onChange={(e) => setDetected({...detected, make:e.target.value})}/><Input placeholder="Model" value={detected.model ?? ""} onChange={(e) => setDetected({...detected, model:e.target.value})}/><Input placeholder="Trim / generation" value={detected.trim ?? ""} onChange={(e) => setDetected({...detected, trim:e.target.value})}/><Input placeholder="VIN (when available)" value={detected.vin ?? ""} onChange={(e) => setDetected({...detected, vin:e.target.value})}/><Input type="number" placeholder="Confirmed mileage" value={mileage} onChange={(e) => setMileage(e.target.value)}/>{purpose === "working_on" && <Input placeholder="Customer / owner name" value={ownerName} onChange={(e) => setOwnerName(e.target.value)}/>}</div>
          <Textarea placeholder="Private intake notes" value={notes} onChange={(e) => setNotes(e.target.value)}/>
        </>}
        <Button disabled={!summary || !telemetryText || ingest.isPending || (mode === "existing" && !vehicleId)} onClick={() => ingest.mutate()}><Car size={16}/> {mode === "existing" ? "Attach drive" : `Add to ${destinationNames[purpose]}`}</Button>
      </div>}
      {message && <p className="mt-4 text-sm text-mirage-muted">{message}</p>}
    </Card>
    <div className="mt-8 grid gap-4">{sessions.map((session) => { const vehicle = fleet.find((item) => item.id === session.vehicleId); const report = reports[session.id]; return <Card key={session.id} className="p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2"><Activity size={17} className="text-mirage-cyan"/><h3 className="font-semibold">{session.label}</h3></div><p className="mt-2 text-sm text-mirage-muted">{vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model} · ${destinationNames[vehicle.purpose]} · ` : ""}{new Date(session.startedAt).toLocaleString()} · {session.metrics.length} metrics</p></div><div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => draftReport(session.id)}>Build draft</Button>{report?.status === "draft" && <Button onClick={() => publish(session.id)}><Send size={15}/> Publish</Button>}{report?.status === "published" && <Button variant="ghost" onClick={() => navigator.clipboard.writeText(`${location.origin}/drive-reports/${report.publicToken}`)}><Copy size={15}/> Copy link</Button>}</div></div>{report && <p className="mt-4 border-l-2 border-mirage-cyan pl-4 text-sm text-mirage-muted">{report.overview}</p>}</Card>; })}</div>
  </section>;
}
