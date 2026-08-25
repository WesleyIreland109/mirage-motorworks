import { Activity, Bot, Car, Check, Copy, FileUp, Send, Sparkles, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { analyzeTelemetry, createFleetVehicle, currentUser, deleteTelemetrySession, importTelemetrySession, listFleet, listTelemetrySessions, listUsers, publishDriveReport, saveDriveReport } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { detectVehicle, summarizeTelemetry, type DetectedVehicle, type SessionSummary } from "@/lib/telemetryImport";
import type { DriveReport, FleetVehicle, MirageAIAnalysis, TelemetrySession, VehiclePurpose } from "@/types/fleet";

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
  const [reportAccess, setReportAccess] = useState<Record<string, { visibility: "private" | "customer" | "public"; viewerUserId?: string }>>({});
  const [aiOpen, setAiOpen] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<MirageAIAnalysis>();
  const { data: fleet = [] } = useQuery({ queryKey: ["fleet"], queryFn: listFleet });
  const { data: sessions = [] } = useQuery({ queryKey: ["telemetry-sessions"], queryFn: () => listTelemetrySessions() });
  const { data: signedInUser } = useQuery({ queryKey: ["auth-user"], queryFn: currentUser, retry: false });
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: listUsers, enabled: signedInUser?.role === "admin" });
  const customers = users.filter((user) => user.role !== "admin");
  const sessionsByVehicle = useMemo(() => {
    const groups = new Map<string, { vehicle?: FleetVehicle; sessions: TelemetrySession[] }>();
    sessions.forEach((session) => {
      const vehicle = fleet.find((item) => item.id === session.vehicleId);
      const key = vehicle?.id ?? session.vehicleId;
      const group = groups.get(key) ?? { vehicle, sessions: [] };
      group.vehicle = vehicle ?? group.vehicle;
      group.sessions.push(session);
      groups.set(key, group);
    });
    return Array.from(groups.values()).sort((a, b) => {
      const aLabel = a.vehicle ? `${a.vehicle.make} ${a.vehicle.model}` : "Unknown vehicle";
      const bLabel = b.vehicle ? `${b.vehicle.make} ${b.vehicle.model}` : "Unknown vehicle";
      return aLabel.localeCompare(bLabel);
    });
  }, [fleet, sessions]);

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
      setAiOpen(true); setAiAnalysis(undefined);
      const identity = detectVehicle(nextSummary); setDetected(identity);
      const match = fleet.find((vehicle) => (identity.vin && vehicle.vin?.toUpperCase() === identity.vin) ||
        (identity.make && identity.model && vehicle.make.toLowerCase() === identity.make.toLowerCase() && vehicle.model.toLowerCase() === identity.model.toLowerCase()));
      if (match) { setMode("existing"); setVehicleId(match.id); setMessage(`Likely match found: ${match.year} ${match.make} ${match.model}.`); }
      else setMessage(identity.make || identity.model ? "Vehicle identity detected. Confirm the fields and destination." : "Identity was not available in this recording. Enter the vehicle details to continue.");
    }
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
      setMessage("The telemetry drive and its report were deleted.");
    },
  });

  function clearUpload() {
    setSummary(undefined); setTelemetryText(""); setDetected({}); setVehicleId(""); setMileage("");
    setOwnerName(""); setNotes(""); setAiAnalysis(undefined); setAiOpen(false);
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
    onSuccess: async (session) => {
      if (aiAnalysis) {
        const report = await saveDriveReport(session.id, { title: aiAnalysis.title, overview: aiAnalysis.overview, observations: aiAnalysis.observations });
        setReports((current) => ({ ...current, [session.id]: report }));
      }
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
  async function publish(sessionId: string) {
    const access = reportAccess[sessionId] ?? { visibility: "private" as const };
    if (access.visibility === "customer" && !access.viewerUserId) { setMessage("Select the customer account that may view this report."); return; }
    const report = await publishDriveReport(sessionId, access); setReports((current) => ({ ...current, [sessionId]: report }));
  }

  return <section className={`px-5 py-8 transition-[padding] lg:px-8 ${aiOpen ? "xl:pr-[410px]" : ""}`}>
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
        <div className="flex flex-wrap gap-2"><Button disabled={!summary || !telemetryText || ingest.isPending || (mode === "existing" && !vehicleId)} onClick={() => ingest.mutate()}><Car size={16}/> {mode === "existing" ? "Attach drive" : `Add to ${destinationNames[purpose]}`}</Button><Button variant="ghost" onClick={clearUpload}><X size={16}/> Clear upload</Button></div>
      </div>}
      {message && <p className="mt-4 text-sm text-mirage-muted">{message}</p>}
    </Card>
    <div className="mt-8 grid gap-5">
      {sessionsByVehicle.map((group) => {
        const vehicle = group.vehicle;
        return (
          <Card key={vehicle?.id ?? group.sessions[0]?.vehicleId} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/[.08] pb-4">
              <div>
                <p className="text-xs uppercase tracking-[.18em] text-mirage-muted">
                  {vehicle ? destinationNames[vehicle.purpose] : "Unmatched vehicle"}
                </p>
                <h2 className="mt-2 text-2xl font-semibold">
                  {vehicle
                    ? `${vehicle.year} ${vehicle.make} ${vehicle.model}`
                    : "Vehicle record unavailable"}
                </h2>
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
                  <Card key={session.id} className="bg-black/10 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <Activity size={17} className="text-mirage-cyan" />
                          <h3 className="font-semibold">{session.label}</h3>
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
                        <Button variant="secondary" onClick={() => draftReport(session.id)}>
                          Build draft
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
                            if (window.confirm("Delete this telemetry drive and its associated report? This cannot be undone.")) removeSession.mutate(session.id);
                          }}
                        >
                          <Trash2 size={15} />
                          Delete drive
                        </Button>
                      </div>
                    </div>
                    {report && (
                      <>
                        <p className="mt-4 border-l-2 border-mirage-cyan pl-4 text-sm text-mirage-muted">
                          {report.overview}
                        </p>
                        {report.status === "draft" && (
                          <div className="mt-5 grid gap-3 border-t border-mirage-border pt-5 md:grid-cols-[220px_1fr_auto]">
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
                              <p className="self-center text-xs text-mirage-muted">Choose who may open the generated link.</p>
                            )}
                            <Button onClick={() => publish(session.id)}>
                              <Send size={15} />
                              Publish
                            </Button>
                          </div>
                        )}
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
