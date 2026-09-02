import { Activity, Archive, Bot, Car, Check, Copy, Edit3, ExternalLink, FileUp, FolderUp, RotateCcw, Save, Send, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { analyzeTelemetry, assignTelemetryIntake, bulkImportTelemetrySessions, createFleetVehicle, currentUser, deleteTelemetrySession, getDriveReportForSession, importTelemetrySession, listFleet, listTelemetryIntake, listTelemetrySessions, listUsers, publishDriveReport, restoreTelemetrySession, saveDriveReport, updateTelemetrySession } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { detectVehicle, summarizeTelemetry, type DetectedVehicle, type SessionSummary } from "@/lib/telemetryImport";
import { vehicleDisplayName, vehicleFullLabel } from "@/lib/fleetDisplay";
import type { DriveReport, FleetVehicle, MirageAIAnalysis, TelemetryIntakeImport, TelemetrySession, VehiclePurpose } from "@/types/fleet";

const destinationNames: Record<VehiclePurpose, string> = { personal: "My Garage", working_on: "Working On", flip: "Flips" };

export function TelemetryInboxPage() {
  const client = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedSessionId = searchParams.get("session");
  const [summary, setSummary] = useState<SessionSummary>();
  const [telemetryText, setTelemetryText] = useState("");
  const [detected, setDetected] = useState<DetectedVehicle>({});
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [vehicleId, setVehicleId] = useState("");
  const [purpose, setPurpose] = useState<VehiclePurpose>("personal");
  const [mileage, setMileage] = useState("");
  const [vehicleNickname, setVehicleNickname] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [notes, setNotes] = useState("");
  const [reports, setReports] = useState<Record<string, DriveReport>>({});
  const [renaming, setRenaming] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [reportAccess, setReportAccess] = useState<Record<string, { visibility: "private" | "customer" | "public"; viewerUserId?: string }>>({});
  const [aiOpen, setAiOpen] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<MirageAIAnalysis>();
  const [intakeVehicleIds, setIntakeVehicleIds] = useState<Record<string, string>>({});
  const [sessionView, setSessionView] = useState<"active" | "archived">("active");
  const { data: fleet = [] } = useQuery({ queryKey: ["fleet"], queryFn: listFleet });
  const { data: sessions = [] } = useQuery({ queryKey: ["telemetry-sessions", "active"], queryFn: () => listTelemetrySessions(undefined, "active") });
  const { data: archivedSessions = [] } = useQuery({ queryKey: ["telemetry-sessions", "archived"], queryFn: () => listTelemetrySessions(undefined, "archived") });
  const { data: intake = [] } = useQuery({ queryKey: ["telemetry-intake"], queryFn: listTelemetryIntake });
  const { data: signedInUser } = useQuery({ queryKey: ["auth-user"], queryFn: currentUser, retry: false });
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: listUsers, enabled: signedInUser?.role === "admin" });
  const customers = users.filter((user) => user.role !== "admin");
  const displayedSessions = sessionView === "active" ? sessions : archivedSessions;
  const sessionsByVehicle = useMemo(() => {
    const groups = new Map<string, { vehicle?: FleetVehicle; sessions: TelemetrySession[] }>();
    displayedSessions.forEach((session) => {
      const vehicle = fleet.find((item) => item.id === session.vehicleId);
      const key = vehicle?.id ?? session.vehicleId;
      const group = groups.get(key) ?? { vehicle, sessions: [] };
      group.vehicle = vehicle ?? group.vehicle;
      group.sessions.push(session);
      groups.set(key, group);
    });
    return Array.from(groups.values()).sort((a, b) => {
      const aLabel = a.vehicle ? vehicleDisplayName(a.vehicle) : "Unknown vehicle";
      const bLabel = b.vehicle ? vehicleDisplayName(b.vehicle) : "Unknown vehicle";
      return aLabel.localeCompare(bLabel);
    });
  }, [displayedSessions, fleet]);

  const likelyMatch = useMemo(() => fleet.find((vehicle) =>
    (detected.vin && vehicle.vin?.toUpperCase() === detected.vin) ||
    (detected.make && detected.model && vehicle.make.toLowerCase() === detected.make.toLowerCase() && vehicle.model.toLowerCase() === detected.model.toLowerCase()),
  ), [detected, fleet]);

  useEffect(() => {
    if (!selectedSessionId) return;
    window.setTimeout(() => {
      document
        .getElementById(`session-${selectedSessionId}`)
        ?.scrollIntoView({ block: "center" });
    }, 0);
  }, [selectedSessionId, sessionsByVehicle]);

  async function chooseFiles(files: FileList | null) {
    if (!files) return;
    let nextSummary = summary;
    for (const file of Array.from(files)) {
      const text = await file.text();
      if (file.name.endsWith(".jsonl")) setTelemetryText(text);
      else try { nextSummary = JSON.parse(text) as SessionSummary; setSummary(nextSummary); } catch { setMessage("The summary JSON could not be read."); }
    }
    if (nextSummary) {
      setAiOpen(true); setAiAnalysis(undefined);
      const identity = detectVehicle(nextSummary); setDetected(identity);
      const match = fleet.find((vehicle) => (identity.vin && vehicle.vin?.toUpperCase() === identity.vin) ||
        (identity.make && identity.model && vehicle.make.toLowerCase() === identity.make.toLowerCase() && vehicle.model.toLowerCase() === identity.model.toLowerCase()));
      if (match) { setMode("existing"); setVehicleId(match.id); setMessage(`Likely match found: ${vehicleDisplayName(match)}.`); }
      else setMessage(identity.make || identity.model ? "Vehicle identity detected. Confirm the fields and destination." : "Identity was not available in this recording. Enter the vehicle details to continue.");
    }
  }

  async function chooseBulkFolder(files: FileList | null) {
    if (!files) return;
    const groups = new Map<string, File[]>();
    Array.from(files).forEach((file) => {
      if (!file.name.endsWith(".json") && !file.name.endsWith(".jsonl")) return;
      const path = file.webkitRelativePath || file.name;
      const key = path.includes("/") ? path.split("/").slice(0, -1).join("/") : file.name.replace(/\.(json|jsonl)$/i, "");
      groups.set(key, [...(groups.get(key) ?? []), file]);
    });
    const knownIds = new Set([...sessions.map((item) => item.externalSessionId), ...archivedSessions.map((item) => item.externalSessionId), ...intake.map((item) => item.externalSessionId)]);
    const imports: TelemetryIntakeImport[] = [];
    let skippedLocal = 0;
    for (const filesInGroup of groups.values()) {
      const summaryFile = filesInGroup.find((file) => file.name.toLowerCase().includes("summary") && file.name.endsWith(".json"))
        ?? filesInGroup.find((file) => file.name.endsWith(".json"));
      const telemetryFile = filesInGroup.find((file) => file.name.endsWith(".jsonl"));
      if (!summaryFile || !telemetryFile) continue;
      try {
        const sessionSummary = JSON.parse(await summaryFile.text()) as SessionSummary;
        const externalSessionId = sessionSummary.id ?? summaryFile.webkitRelativePath ?? summaryFile.name;
        if (knownIds.has(externalSessionId)) {
          skippedLocal += 1;
          continue;
        }
        const telemetry = summarizeTelemetry(await telemetryFile.text());
        imports.push({
          externalSessionId,
          label: sessionSummary.label ?? "Mirage drive",
          startedAt: sessionSummary.startedAt ?? new Date(summaryFile.lastModified).toISOString(),
          durationMs: sessionSummary.durationMs ?? 0,
          samples: sessionSummary.samples ?? telemetry.metrics.reduce((total, metric) => Math.max(total, metric.samples), 0),
          obdRequests: sessionSummary.obdRequests ?? 0,
          obdErrors: sessionSummary.obdErrors ?? 0,
          source: telemetry.source,
          metrics: telemetry.metrics,
          detectedVehicle: detectVehicle(sessionSummary),
        });
      } catch {
        skippedLocal += 1;
      }
    }
    if (!imports.length) {
      setMessage(skippedLocal ? `No missing drives found. Skipped ${skippedLocal} already imported or unreadable folder${skippedLocal === 1 ? "" : "s"}.` : "No complete summary/telemetry pairs found in that folder.");
      return;
    }
    bulkImport.mutate(imports);
  }

  const askMirageAI = useMutation({
    mutationFn: async () => {
      if (!summary || !telemetryText) throw new Error("Select both telemetry files first.");
      const parsed = summarizeTelemetry(telemetryText);
      return analyzeTelemetry({
        vehicle: { ...detected, mileage: mileage ? Number(mileage) : undefined },
        sessionLabel: summary.label ?? "Mirage drive", startedAt: summary.startedAt ?? new Date().toISOString(),
        durationMs: summary.durationMs ?? 0, samples: summary.samples ?? 0,
        obdRequests: summary.obdRequests ?? 0, obdErrors: summary.obdErrors ?? 0,
        source: parsed.source, metrics: parsed.metrics,
      });
    },
    onSuccess: (analysis) => { setAiAnalysis(analysis); setNotes([analysis.overview, ...analysis.observations].join("\n\n")); },
  });

  const removeSession = useMutation({
    mutationFn: deleteTelemetrySession,
    onSuccess: (_, sessionId) => {
      client.invalidateQueries({ queryKey: ["telemetry-sessions"] });
      setReports((current) => { const next = { ...current }; delete next[sessionId]; return next; });
      setMessage("Drive archived. Bulk upload will keep recognizing it as already handled.");
    },
  });

  const restoreSession = useMutation({
    mutationFn: restoreTelemetrySession,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["telemetry-sessions"] });
      setMessage("Drive restored to the active telemetry inbox.");
    },
    onError: () => setMessage("Unable to restore that archived drive."),
  });

  const bulkImport = useMutation({
    mutationFn: bulkImportTelemetrySessions,
    onSuccess: (result) => {
      client.invalidateQueries({ queryKey: ["fleet"] });
      client.invalidateQueries({ queryKey: ["telemetry-sessions"] });
      client.invalidateQueries({ queryKey: ["telemetry-intake"] });
      setMessage(`Bulk upload complete: ${result.imported.length} attached, ${result.queued.length} queued, ${result.skipped.length} already known.`);
    },
    onError: () => setMessage("Bulk upload failed. Check that the folder contains summary JSON and telemetry JSONL files."),
  });

  const assignIntake = useMutation({
    mutationFn: ({ intakeId, targetVehicleId }: { intakeId: string; targetVehicleId: string }) => assignTelemetryIntake(intakeId, targetVehicleId),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["telemetry-sessions"] });
      client.invalidateQueries({ queryKey: ["telemetry-intake"] });
      setMessage("Queued drive assigned to vehicle.");
    },
    onError: () => setMessage("Unable to assign that queued drive."),
  });

  const renameSession = useMutation({
    mutationFn: ({ sessionId, label }: { sessionId: string; label: string }) =>
      updateTelemetrySession(sessionId, label),
    onSuccess: () => {
      setRenaming({});
      client.invalidateQueries({ queryKey: ["telemetry-sessions"] });
      setMessage("Drive renamed.");
    },
    onError: () => setMessage("Unable to rename that drive."),
  });

  function clearUpload() {
    setSummary(undefined); setTelemetryText(""); setDetected({}); setVehicleId(""); setMileage("");
    setOwnerName(""); setVehicleNickname(""); setNotes(""); setAiAnalysis(undefined); setAiOpen(false);
    setMessage("Selected local files cleared. Nothing was uploaded.");
  }

  function applyAISuggestions() {
    if (!aiAnalysis) return;
    const vehicle = aiAnalysis.vehicle;
    setDetected((current) => ({
      ...current, year: vehicle.year ?? current.year, make: vehicle.make ?? current.make,
      model: vehicle.model ?? current.model, trim: vehicle.trim ?? current.trim,
      vin: vehicle.vin ?? current.vin, profileId: vehicle.profileId ?? current.profileId,
    }));
    setMessage("MirageAI suggestions applied. Please verify every field before importing.");
  }

  const ingest = useMutation({
    mutationFn: async () => {
      if (!summary || !telemetryText) throw new Error("Select both session files");
      let target: FleetVehicle | undefined = mode === "existing" ? fleet.find((item) => item.id === vehicleId) : undefined;
      if (!target) {
        if (!detected.make || !detected.model || !detected.year || !mileage) throw new Error("Confirm year, make, model, and mileage");
        target = await createFleetVehicle({
          year: detected.year, make: detected.make, model: detected.model, nickname: vehicleNickname, trim: detected.trim ?? "",
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
        detectedVehicle: detected,
      });
    },
    onSuccess: async (session) => {
      if (aiAnalysis) {
        const report = await saveDriveReport(session.id, { title: aiAnalysis.title, overview: aiAnalysis.overview, observations: aiAnalysis.observations });
        setReports((current) => ({ ...current, [session.id]: report }));
      }
      client.invalidateQueries({ queryKey: ["fleet"] }); client.invalidateQueries({ queryKey: ["telemetry-sessions"] });
      setSummary(undefined); setTelemetryText(""); setDetected({}); setVehicleId(""); setMileage(""); setVehicleNickname("");
      setMessage("Drive imported and attached successfully.");
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "Unable to import drive."),
  });

  function defaultReportDraft(session: TelemetrySession, vehicle: FleetVehicle) {
    const label = vehicleDisplayName(vehicle);
    const fullLabel = vehicleFullLabel(vehicle);
    const metricSummary = session.metrics.slice(0, 6).map((metric) => `${metric.label}: ${metric.min.toFixed(1)}-${metric.max.toFixed(1)}${metric.unit ? ` ${metric.unit}` : ""} (${metric.samples} samples).`);
    return {
      title: `Mirage Drive Summary - ${label}`,
      overview: session.source === "simulator" ? `A simulator-backed Mirage session was reviewed for ${fullLabel}.` : `Mirage reviewed the data channels available during this drive for ${fullLabel}.`,
      observations: [
        `${session.metrics.length} live metric${session.metrics.length === 1 ? " was" : "s were"} available during this recording.`,
        ...metricSummary,
        session.source === "simulator" ? "SIMULATOR DATA: no vehicle-health conclusions should be drawn from it." : "These observations describe recorded OBD values only; they are not a mechanical inspection or diagnosis.",
      ],
    };
  }

  async function ensureReport(sessionId: string) {
    const existing = reports[sessionId] ?? await getDriveReportForSession(sessionId);
    if (existing) {
      setReports((current) => ({ ...current, [sessionId]: existing }));
      setReportAccess((current) => ({
        ...current,
        [sessionId]: { visibility: existing.visibility, viewerUserId: existing.viewerUserId },
      }));
      return existing;
    }
    const session = sessions.find((item) => item.id === sessionId);
    const vehicle = session ? fleet.find((item) => item.id === session.vehicleId) : undefined;
    if (!session || !vehicle) throw new Error("Drive is missing its vehicle record.");
    const report = await saveDriveReport(session.id, defaultReportDraft(session, vehicle));
    setReports((current) => ({ ...current, [session.id]: report }));
    return report;
  }

  async function draftReport(sessionId: string) {
    const report = await ensureReport(sessionId);
    setMessage(report.status === "draft" ? "Draft report is ready." : "Existing report loaded.");
  }

  async function openReport(sessionId: string) {
    const report = await ensureReport(sessionId);
    const access = reportAccess[sessionId] ?? { visibility: report.visibility as "private" | "customer" | "public", viewerUserId: report.viewerUserId };
    if (access.visibility === "customer" && !access.viewerUserId) {
      setMessage("Select the customer account that may view this report.");
      return;
    }
    const published = report.status === "published" ? report : await publishDriveReport(sessionId, access);
    setReports((current) => ({ ...current, [sessionId]: published }));
    navigate(`/drive-reports/${published.publicToken}`);
  }

  async function saveAccess(sessionId: string) {
    await ensureReport(sessionId);
    await publish(sessionId);
    setMessage("Report access updated.");
  }

  function cancelReportAccess(sessionId: string) {
    setReports((current) => {
      const next = { ...current };
      delete next[sessionId];
      return next;
    });
    setReportAccess((current) => {
      const next = { ...current };
      delete next[sessionId];
      return next;
    });
    setMessage("Report access changes discarded.");
  }

  async function publish(sessionId: string) {
    const access = reportAccess[sessionId] ?? { visibility: "private" as const };
    if (access.visibility === "customer" && !access.viewerUserId) { setMessage("Select the customer account that may view this report."); return; }
    const report = await publishDriveReport(sessionId, access); setReports((current) => ({ ...current, [sessionId]: report }));
  }

  return <section className={`px-5 py-8 transition-[padding] lg:px-8 ${aiOpen ? "xl:pr-[410px]" : ""}`}>
    <div className="border-b border-mirage-border pb-6"><p className="text-sm font-semibold uppercase tracking-[.24em] text-mirage-cyan">Garage OS</p><h1 className="mt-2 text-4xl font-semibold">Telemetry Inbox</h1><p className="mt-2 text-sm text-mirage-muted">Upload once, identify the vehicle, then route the drive to the right workspace.</p></div>
    <Card className="mt-8 p-5 lg:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-center gap-3">
          <FolderUp className="text-mirage-cyan" />
          <div>
            <h2 className="text-xl font-semibold">Bulk upload session folder</h2>
            <p className="text-sm leading-6 text-mirage-muted">
              Choose a folder of recorded sessions. GarageOS skips known drives,
              attaches VIN matches, and queues anything unassigned below.
            </p>
          </div>
        </div>
        <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 border border-mirage-cyan bg-mirage-cyan px-5 text-sm font-semibold text-black transition hover:bg-cyan-200">
          <FolderUp size={16} />
          {bulkImport.isPending ? "Uploading..." : "Select folder"}
          <input
            className="sr-only"
            type="file"
            multiple
            accept=".json,.jsonl"
            onChange={(event) => chooseBulkFolder(event.target.files)}
            {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
          />
        </label>
      </div>
      <div className="mt-5 grid gap-3 text-sm text-mirage-muted md:grid-cols-3">
        <Metric label="Active drives" value={String(sessions.length)} />
        <Metric label="Archived" value={String(archivedSessions.length)} />
        <Metric label="Queued" value={String(intake.length)} />
      </div>
    </Card>
    <Card className="mt-8 p-5 lg:p-6">
      <div className="flex items-center gap-3"><FileUp className="text-mirage-cyan"/><div><h2 className="text-xl font-semibold">Import recorded drive</h2><p className="text-sm text-mirage-muted">Choose the summary JSON and telemetry JSONL. Raw files remain in your browser.</p></div></div>
      <Input className="mt-5" type="file" multiple accept=".json,.jsonl" onChange={(event) => chooseFiles(event.target.files)}/>
      {(summary || telemetryText) && <div className="mt-6 space-y-5 border-t border-mirage-border pt-5">
        {likelyMatch && <Card className="border-mirage-cyan/40 bg-mirage-cyan/5 p-4 text-sm">Likely match: <strong>{vehicleDisplayName(likelyMatch)}</strong></Card>}
        <div className="flex flex-wrap gap-2"><Button variant={mode === "existing" ? "primary" : "secondary"} onClick={() => setMode("existing")}>Attach to existing</Button><Button variant={mode === "new" ? "primary" : "secondary"} onClick={() => setMode("new")}>Add a new vehicle</Button></div>
        {mode === "existing" ? <div className="grid gap-3 md:grid-cols-2"><select className="h-11 w-full border border-mirage-border bg-mirage-secondary px-3 text-sm" value={vehicleId} onChange={(event) => setVehicleId(event.target.value)}><option value="">Select vehicle</option>{fleet.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{destinationNames[vehicle.purpose]} · {vehicleDisplayName(vehicle)}</option>)}</select><Input inputMode="numeric" placeholder="Confirmed mileage (optional)" value={mileage} onChange={(event) => setMileage(event.target.value)}/></div> : <>
          <div><p className="mb-2 text-xs font-semibold uppercase tracking-[.18em] text-mirage-muted">Send to</p><div className="flex flex-wrap gap-2">{(Object.keys(destinationNames) as VehiclePurpose[]).map((value) => <Button key={value} variant={purpose === value ? "primary" : "secondary"} onClick={() => setPurpose(value)}>{destinationNames[value]}</Button>)}</div></div>
          <div className="grid gap-3 md:grid-cols-3"><Input inputMode="numeric" placeholder="Year" value={detected.year ?? ""} onChange={(e) => setDetected({...detected, year:Number(e.target.value)})}/><Input placeholder="Make" value={detected.make ?? ""} onChange={(e) => setDetected({...detected, make:e.target.value})}/><Input placeholder="Model" value={detected.model ?? ""} onChange={(e) => setDetected({...detected, model:e.target.value})}/><Input placeholder="Nickname" value={vehicleNickname} onChange={(e) => setVehicleNickname(e.target.value)}/><Input placeholder="Trim / generation" value={detected.trim ?? ""} onChange={(e) => setDetected({...detected, trim:e.target.value})}/><Input placeholder="VIN (when available)" value={detected.vin ?? ""} onChange={(e) => setDetected({...detected, vin:e.target.value})}/><Input inputMode="numeric" placeholder="Confirmed mileage" value={mileage} onChange={(e) => setMileage(e.target.value)}/>{purpose === "working_on" && <Input placeholder="Customer / owner name" value={ownerName} onChange={(e) => setOwnerName(e.target.value)}/>}</div>
          <Textarea placeholder="Private intake notes" value={notes} onChange={(e) => setNotes(e.target.value)}/>
        </>}
        <div className="flex flex-wrap gap-2"><Button disabled={!summary || !telemetryText || ingest.isPending || (mode === "existing" && !vehicleId)} onClick={() => ingest.mutate()}><Car size={16}/> {mode === "existing" ? "Attach drive" : `Add to ${destinationNames[purpose]}`}</Button><Button variant="ghost" onClick={clearUpload}><X size={16}/> Clear upload</Button></div>
      </div>}
      {message && <p className="mt-4 text-sm text-mirage-muted">{message}</p>}
    </Card>
    {intake.length > 0 && (
      <Card className="mt-8 p-5 lg:p-6">
        <div className="flex items-center gap-3 border-b border-white/[.08] pb-4">
          <FileUp className="text-mirage-orange" />
          <div>
            <h2 className="text-xl font-semibold">Unassigned drive queue</h2>
            <p className="text-sm text-mirage-muted">
              These uploads did not match a VIN in GarageOS yet. Assign them when the vehicle record exists.
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-3">
          {intake.map((item) => {
            const identity = item.detectedVehicle;
            const selectedVehicleId = intakeVehicleIds[item.id] ?? "";
            return (
              <Card key={item.id} className="bg-black/10 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[.18em] text-mirage-muted">
                      {identity.vin ? `VIN ${identity.vin}` : "VIN unavailable"}
                    </p>
                    <h3 className="mt-2 text-lg font-semibold">
                      {[identity.year, identity.make, identity.model].filter(Boolean).join(" ") || item.label}
                    </h3>
                    <p className="mt-2 text-sm text-mirage-muted">
                      {new Date(item.startedAt).toLocaleString()} · {item.metrics.length} metrics · {item.samples.toLocaleString()} samples
                    </p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_auto]">
                    <select
                      className="h-11 border border-mirage-border bg-mirage-secondary px-3 text-sm"
                      value={selectedVehicleId}
                      onChange={(event) => setIntakeVehicleIds((current) => ({ ...current, [item.id]: event.target.value }))}
                    >
                      <option value="">Assign to vehicle</option>
                      {fleet.map((vehicle) => (
                        <option key={vehicle.id} value={vehicle.id}>
                          {destinationNames[vehicle.purpose]} · {vehicleDisplayName(vehicle)}
                        </option>
                      ))}
                    </select>
                    <Button
                      disabled={assignIntake.isPending || !selectedVehicleId}
                      onClick={() => assignIntake.mutate({ intakeId: item.id, targetVehicleId: selectedVehicleId })}
                    >
                      Attach
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </Card>
    )}
    <div className="mt-8 grid gap-5">
      <div className="flex flex-wrap gap-2">
        <Button variant={sessionView === "active" ? "primary" : "secondary"} onClick={() => setSessionView("active")}>
          <Activity size={16} />
          Active drives ({sessions.length})
        </Button>
        <Button variant={sessionView === "archived" ? "primary" : "secondary"} onClick={() => setSessionView("archived")}>
          <Archive size={16} />
          Archived ({archivedSessions.length})
        </Button>
      </div>
      {sessionsByVehicle.map((group) => {
        const vehicle = group.vehicle;
        return (
          <Card key={vehicle?.id ?? group.sessions[0]?.vehicleId} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/[.08] pb-4">
              <div>
                <p className="text-xs uppercase tracking-[.18em] text-mirage-muted">
                  {vehicle ? destinationNames[vehicle.purpose] : "Unmatched vehicle"}
                </p>
                {vehicle ? (
                  <Link
                    to={`/admin/garage/${vehicle.id}`}
                    className="mt-2 block text-2xl font-semibold transition hover:text-mirage-cyan"
                  >
                    {vehicleDisplayName(vehicle)}
                  </Link>
                ) : (
                  <h2 className="mt-2 text-2xl font-semibold">Vehicle record unavailable</h2>
                )}
                <p className="mt-1 text-sm text-mirage-muted">
                  {vehicle?.trim ? `${vehicle.trim} · ` : ""}
                  {vehicle ? `${vehicle.mileage.toLocaleString()} miles · ` : ""}
                  {group.sessions.length} attached drive{group.sessions.length === 1 ? "" : "s"}
                </p>
              </div>
              <Car className="text-mirage-cyan" />
            </div>

            <div className="mt-4 grid gap-3">
              {group.sessions.map((session) => {
                const report = reports[session.id];
                const access = reportAccess[session.id] ?? { visibility: "private" as const };
                return (
                  <Card
                    key={session.id}
                    id={`session-${session.id}`}
                    className={`bg-black/10 p-4 transition ${
                      selectedSessionId === session.id
                        ? "border-mirage-cyan/70 bg-mirage-cyan/10"
                        : ""
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <Activity size={17} className="text-mirage-cyan" />
                          {renaming[session.id] != null ? (
                            <div className="flex flex-wrap gap-2">
                              <Input
                                className="h-9"
                                value={renaming[session.id]}
                                onChange={(event) => setRenaming((current) => ({ ...current, [session.id]: event.target.value }))}
                              />
                              <Button
                                size="sm"
                                disabled={renameSession.isPending || !renaming[session.id].trim()}
                                onClick={() => renameSession.mutate({ sessionId: session.id, label: renaming[session.id] })}
                              >
                                <Save size={15} />
                                Save
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setRenaming({})}>
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <h3 className="font-semibold">{session.label}</h3>
                          )}
                        </div>
                        <p className="mt-2 text-sm text-mirage-muted">
                          {new Date(session.startedAt).toLocaleString()} ·{" "}
                          {session.metrics.length} metrics
                          {session.recordedMileage != null
                            ? ` · ${session.recordedMileage.toLocaleString()} miles`
                            : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {sessionView === "active" ? (
                          <>
                            <Button variant="secondary" onClick={() => openReport(session.id)}>
                              <ExternalLink size={15} />
                              Open report
                            </Button>
                            <Button variant="ghost" onClick={() => setRenaming({ [session.id]: session.label })}>
                              <Edit3 size={15} />
                              Rename
                            </Button>
                            <Button variant="ghost" onClick={() => draftReport(session.id)}>
                              Manage access
                            </Button>
                            {report?.status === "published" && (
                              <Button
                                variant="ghost"
                                onClick={() => navigator.clipboard.writeText(`${location.origin}/drive-reports/${report.publicToken}`)}
                              >
                                <Copy size={15} />
                                Copy link
                              </Button>
                            )}
                            <Button
                              variant="danger"
                              disabled={removeSession.isPending}
                              onClick={() => {
                                if (window.confirm("Archive this telemetry drive? Bulk upload will still recognize it as already handled.")) removeSession.mutate(session.id);
                              }}
                            >
                              <Archive size={15} />
                              Archive
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="secondary"
                            disabled={restoreSession.isPending}
                            onClick={() => restoreSession.mutate(session.id)}
                          >
                            <RotateCcw size={15} />
                            Restore
                          </Button>
                        )}
                      </div>
                    </div>
                    {sessionView === "active" && report && (
                      <>
                        <p className="mt-4 border-l-2 border-mirage-cyan pl-4 text-sm text-mirage-muted">
                          {report.overview}
                        </p>
                        <div className="mt-5 grid gap-3 border-t border-mirage-border pt-5 md:grid-cols-[220px_1fr_auto_auto]">
                          <select
                            className="h-11 border border-mirage-border bg-mirage-secondary px-3 text-sm"
                            value={access.visibility}
                            onChange={(event) => setReportAccess({...reportAccess,[session.id]:{visibility:event.target.value as "private" | "customer" | "public"}})}
                          >
                            <option value="private">Private - admins/owner</option>
                            {signedInUser?.role === "admin" && <option value="customer">Assigned customer only</option>}
                            <option value="public">Anyone with the link</option>
                          </select>
                          {access.visibility === "customer" ? (
                            <select
                              className="h-11 border border-mirage-border bg-mirage-secondary px-3 text-sm"
                              value={access.viewerUserId ?? ""}
                              onChange={(event) => setReportAccess({...reportAccess,[session.id]:{...access,viewerUserId:event.target.value}})}
                            >
                              <option value="">Select registered customer</option>
                              {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.displayName} · {customer.email}</option>)}
                            </select>
                          ) : (
                            <p className="self-center text-xs text-mirage-muted">
                              Current access: {report.status === "published" ? report.visibility : "draft not published"}
                            </p>
                          )}
                          <Button onClick={() => saveAccess(session.id)}>
                            <Send size={15} />
                            Save access
                          </Button>
                          <Button variant="ghost" onClick={() => cancelReportAccess(session.id)}>
                            Cancel
                          </Button>
                        </div>
                      </>
                    )}
                  </Card>
                );
              })}
            </div>
          </Card>
        );
      })}
    </div>
    {aiOpen && <aside className="fixed inset-x-3 bottom-3 top-20 z-50 overflow-y-auto border border-cyan-300/30 bg-[#071016]/95 p-5 shadow-[0_0_70px_rgba(34,211,238,.18)] backdrop-blur-xl sm:left-auto sm:right-5 sm:w-[370px] xl:right-6">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-mirage-cyan via-violet-400 to-mirage-orange"/>
      <div className="flex items-start gap-3"><div className="grid size-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-mirage-cyan/30 via-violet-500/20 to-mirage-orange/20 ring-1 ring-white/15"><Bot className="text-mirage-cyan"/></div><div><p className="text-xs font-semibold uppercase tracking-[.22em] text-mirage-cyan">MirageAI</p><h2 className="mt-1 text-xl font-semibold">Telemetry copilot</h2></div><button className="ml-auto text-mirage-muted hover:text-white" aria-label="Close MirageAI" onClick={() => setAiOpen(false)}><X size={20}/></button></div>
      {!aiAnalysis && <div className="mt-8"><p className="text-sm leading-6 text-mirage-muted">I can review the detected identity and summarized OBD ranges, flag missing or questionable fields, and prepare a customer-friendly report draft.</p><Card className="mt-5 bg-white/[.03] p-4 text-xs leading-5 text-mirage-muted">I only receive summarized metrics—not your raw JSONL—and I will never replace your confirmation of mileage, vehicle identity, or mechanical condition.</Card><Button className="mt-6 w-full" disabled={askMirageAI.isPending || !summary || !telemetryText} onClick={() => askMirageAI.mutate()}><Sparkles size={16}/>{askMirageAI.isPending ? "Reviewing drive…" : "Ask MirageAI"}</Button>{askMirageAI.isError && <p className="mt-4 text-sm text-mirage-orange">MirageAI is unavailable. Verify the Cloudflare settings or use the standard draft builder.</p>}</div>}
      {aiAnalysis && <div className="mt-7 space-y-6"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-mirage-muted">Suggested report</p><h3 className="mt-2 font-semibold">{aiAnalysis.title}</h3><p className="mt-3 text-sm leading-6 text-mirage-muted">{aiAnalysis.overview}</p></div><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-mirage-muted">Observations</p><ul className="mt-3 space-y-3 text-sm leading-5 text-mirage-muted">{aiAnalysis.observations.map((item) => <li key={item} className="border-l border-mirage-cyan/50 pl-3">{item}</li>)}</ul></div>{aiAnalysis.suggestions.length > 0 && <div><p className="text-xs font-semibold uppercase tracking-[.18em] text-mirage-muted">Fields to review</p><ul className="mt-3 space-y-2 text-sm text-amber-100">{aiAnalysis.suggestions.map((item) => <li key={item}>• {item}</li>)}</ul><Button className="mt-4 w-full" variant="secondary" onClick={applyAISuggestions}><Check size={16}/> Apply suggested fields</Button></div>}<p className="text-xs leading-5 text-mirage-muted">Review the draft before saving. MirageAI describes recorded data; it does not perform a mechanical inspection.</p></div>}
    </aside>}
  </section>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-white/[.06] bg-white/[.02] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-mirage-muted">{label}</p>
      <p className="mt-2 font-semibold text-white">{value}</p>
    </div>
  );
}
