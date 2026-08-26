import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bot,
  ClipboardCheck,
  ExternalLink,
  Plus,
  Save,
  SearchCheck,
  Trash2,
} from "lucide-react";

import {
  createProspect,
  deleteProspect,
  listProspects,
  updateProspect,
} from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type {
  ProspectChecklistItem,
  ProspectChecklistResult,
  ProspectObdSnapshot,
  ProspectReport,
  ProspectReportInput,
  ProspectStatus,
} from "@/types/fleet";

const checklistTemplate: ProspectChecklistItem[] = [
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

const emptyObd: ProspectObdSnapshot = {
  scannerUsed: false,
  scannerModel: "",
  codesPresent: "unknown",
  codeSummary: "",
  monitorsReady: "unknown",
  freezeFrameNotes: "",
  liveDataNotes: "",
};

const statusLabels: Record<ProspectStatus, string> = {
  new: "New",
  researching: "Researching",
  inspecting: "Inspecting",
  review: "Review",
  offer_candidate: "Offer Candidate",
  declined: "Declined",
  purchased: "Purchased",
};

const resultLabels: Record<ProspectChecklistResult, string> = {
  pass: "Pass",
  monitor: "Monitor",
  fail: "Fail",
  unknown: "Unknown",
  not_applicable: "N/A",
};

interface ProspectFormState {
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

function blankForm(): ProspectFormState {
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
    checklist: checklistTemplate,
    obd: emptyObd,
    estimatedRepair: "",
    recommendedOffer: "",
    valueNotes: "",
  };
}

function centsToDollars(value?: number) {
  return value == null ? "" : String(Math.round(value / 100));
}

function dollarsToCents(value: string) {
  const parsed = Number(value.replace(/[$,\s]/g, ""));
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) : undefined;
}

function optionalInteger(value: string) {
  const parsed = Number(value.replace(/[,\s]/g, ""));
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

function formatMoney(value?: number) {
  if (value == null) return "No target";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value / 100);
}

function formFromProspect(prospect: ProspectReport): ProspectFormState {
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
    checklist: prospect.checklist.length ? prospect.checklist : checklistTemplate,
    obd: { ...emptyObd, ...prospect.obd },
    estimatedRepair: centsToDollars(prospect.estimatedRepairCents),
    recommendedOffer: centsToDollars(prospect.recommendedOfferCents),
    valueNotes: prospect.valueNotes,
  };
}

function inputFromForm(form: ProspectFormState): ProspectReportInput {
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

export function AdminProspectsPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<ProspectFormState>(blankForm);
  const [message, setMessage] = useState("");

  const { data: prospects = [], isLoading } = useQuery({
    queryKey: ["prospects"],
    queryFn: listProspects,
  });

  const selectedProspect = useMemo(
    () => prospects.find((prospect) => prospect.id === selectedId),
    [prospects, selectedId],
  );

  useEffect(() => {
    if (selectedProspect) {
      setForm(formFromProspect(selectedProspect));
    }
  }, [selectedProspect]);

  const saveProspect = useMutation({
    mutationFn: async () => {
      const payload = inputFromForm(form);
      return selectedId ? updateProspect(selectedId, payload) : createProspect(payload);
    },
    onSuccess: (prospect) => {
      setSelectedId(prospect.id);
      setMessage("Prospect saved.");
      queryClient.invalidateQueries({ queryKey: ["prospects"] });
    },
    onError: () => setMessage("Unable to save. Check the listing URL and required vehicle label."),
  });

  const removeProspect = useMutation({
    mutationFn: deleteProspect,
    onSuccess: () => {
      setSelectedId(null);
      setForm(blankForm());
      setMessage("Prospect deleted.");
      queryClient.invalidateQueries({ queryKey: ["prospects"] });
    },
    onError: () => setMessage("Unable to delete that prospect."),
  });

  const score = useMemo(() => {
    const answered = form.checklist.filter((item) => item.result !== "unknown" && item.result !== "not_applicable");
    if (!answered.length) return null;
    const points = answered.reduce((total, item) => total + (item.result === "pass" ? 1 : item.result === "monitor" ? 0.5 : 0), 0);
    return Math.round((points / answered.length) * 100);
  }, [form.checklist]);

  const groups = useMemo(() => {
    const map = new Map<string, ProspectChecklistItem[]>();
    form.checklist.forEach((item) => {
      map.set(item.category, [...(map.get(item.category) ?? []), item]);
    });
    return Array.from(map.entries());
  }, [form.checklist]);

  function updateChecklistItem(index: number, patch: Partial<ProspectChecklistItem>) {
    setForm((current) => ({
      ...current,
      checklist: current.checklist.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
    }));
  }

  function newProspect() {
    setSelectedId(null);
    setForm(blankForm());
    setMessage("");
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-5 py-8 lg:grid-cols-[360px_1fr] lg:px-8">
      <aside className="space-y-4">
        <div className="border-b border-mirage-border pb-5">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-mirage-cyan">Garage OS</p>
          <h1 className="mt-2 text-4xl font-semibold">Prospects</h1>
          <p className="mt-2 text-sm leading-6 text-mirage-muted">
            Save listing links, employee inspection notes, OBD scan context, and early Mirage buy targets before a car enters the garage.
          </p>
        </div>
        <Button className="w-full" onClick={newProspect}>
          <Plus size={16} /> New prospect
        </Button>
        {isLoading ? (
          <p className="py-8 text-sm text-mirage-muted">Loading prospects...</p>
        ) : (
          <div className="space-y-3">
            {prospects.map((prospect) => (
              <button
                key={prospect.id}
                className={`w-full border p-4 text-left transition ${
                  prospect.id === selectedId
                    ? "border-mirage-cyan bg-mirage-cyan/10"
                    : "border-mirage-border bg-mirage-panel hover:border-white/20"
                }`}
                onClick={() => setSelectedId(prospect.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">{prospect.vehicleLabel}</h2>
                    <p className="mt-1 line-clamp-1 text-xs text-mirage-muted">{prospect.listingUrl}</p>
                  </div>
                  <span className="inline-flex border border-mirage-border bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-mirage-muted">
                    {statusLabels[prospect.status]}
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-mirage-muted">
                  <span>{prospect.location || "Location unknown"}</span>
                  <span>{formatMoney(prospect.recommendedOfferCents)}</span>
                </div>
              </button>
            ))}
            {!prospects.length && <p className="py-8 text-sm text-mirage-muted">No prospect cars saved yet.</p>}
          </div>
        )}
      </aside>

      <section className="space-y-6">
        <Card className="p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <SearchCheck className="text-mirage-cyan" size={24} />
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-mirage-cyan">Potential acquisition</p>
              </div>
              <h2 className="mt-3 text-2xl font-semibold">{selectedId ? "Update prospect report" : "Create prospect report"}</h2>
              <p className="mt-2 text-sm leading-6 text-mirage-muted">
                Designed for quick phone entry while looking at a car. The future AI value model can use this structured history to suggest what Mirage should pay.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.listingUrl && (
                <Button asChild variant="secondary" size="sm">
                  <a href={form.listingUrl} target="_blank" rel="noreferrer">
                    Listing <ExternalLink size={14} />
                  </a>
                </Button>
              )}
              {selectedId && (
                <Button
                  variant="danger"
                  size="sm"
                  disabled={removeProspect.isPending}
                  onClick={() => {
                    if (window.confirm("Delete this prospect report?")) removeProspect.mutate(selectedId);
                  }}
                >
                  <Trash2 size={14} /> Delete
                </Button>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-mirage-muted">Listing URL</span>
              <Input
                inputMode="url"
                placeholder="https://..."
                value={form.listingUrl}
                onChange={(event) => setForm({ ...form, listingUrl: event.target.value })}
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-mirage-muted">Vehicle label</span>
              <Input
                placeholder="2013 Camaro 2SS"
                value={form.vehicleLabel}
                onChange={(event) => setForm({ ...form, vehicleLabel: event.target.value })}
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-mirage-muted">Status</span>
              <select
                className="h-11 w-full border border-mirage-border bg-mirage-secondary px-3 text-sm text-white outline-none focus:border-mirage-cyan"
                value={form.status}
                onChange={(event) => setForm({ ...form, status: event.target.value as ProspectStatus })}
              >
                {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <InputBlock label="Asking price" value={form.askingPrice} placeholder="50000" onChange={(value) => setForm({ ...form, askingPrice: value })} />
            <InputBlock label="Mileage" value={form.mileage} placeholder="72500" onChange={(value) => setForm({ ...form, mileage: value })} />
            <InputBlock label="Location" value={form.location} placeholder="Austin, TX" onChange={(value) => setForm({ ...form, location: value })} />
            <InputBlock label="Seller" value={form.sellerName} placeholder="Private seller or dealer" onChange={(value) => setForm({ ...form, sellerName: value })} />
            <label className="space-y-2 md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-mirage-muted">VIN</span>
              <Input
                placeholder="Optional until confirmed"
                value={form.vin}
                onChange={(event) => setForm({ ...form, vin: event.target.value.toUpperCase() })}
              />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-mirage-muted">Employee summary</span>
              <Textarea
                placeholder="Why this car is interesting, what feels risky, and what needs follow-up."
                value={form.summary}
                onChange={(event) => setForm({ ...form, summary: event.target.value })}
              />
            </label>
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-5 flex items-center gap-3">
            <ClipboardCheck className="text-mirage-cyan" size={22} />
            <div>
              <h2 className="text-xl font-semibold">Mirage prospect checklist</h2>
              <p className="text-sm text-mirage-muted">High-level enough for speed, structured enough to become usable acquisition data.</p>
            </div>
          </div>
          <div className="space-y-6">
            {groups.map(([category, items]) => (
              <div key={category}>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-mirage-muted">{category}</h3>
                <div className="space-y-3">
                  {items.map((item) => {
                    const absoluteIndex = form.checklist.indexOf(item);
                    return (
                      <div key={`${item.category}-${item.label}`} className="grid gap-3 border border-white/[0.05] bg-white/[0.02] p-3 md:grid-cols-[1fr_160px]">
                        <div>
                          <p className="text-sm font-medium">{item.label}</p>
                          <Input
                            className="mt-3"
                            placeholder="Notes"
                            value={item.notes}
                            onChange={(event) => updateChecklistItem(absoluteIndex, { notes: event.target.value })}
                          />
                        </div>
                        <select
                          className="h-11 border border-mirage-border bg-mirage-secondary px-3 text-sm text-white outline-none focus:border-mirage-cyan"
                          value={item.result}
                          onChange={(event) => updateChecklistItem(absoluteIndex, { result: event.target.value as ProspectChecklistResult })}
                        >
                          {Object.entries(resultLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-xl font-semibold">OBD scan snapshot</h2>
          <p className="mt-2 text-sm text-mirage-muted">
            Employee-focused checks can include scanner results now. Later, telemetry and scan history can feed MirageAI valuation.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="flex items-center gap-3 border border-mirage-border bg-mirage-secondary px-3 py-3 text-sm">
              <input
                type="checkbox"
                checked={form.obd.scannerUsed}
                onChange={(event) => setForm({ ...form, obd: { ...form.obd, scannerUsed: event.target.checked } })}
              />
              OBD scanner used
            </label>
            <InputBlock label="Scanner model" value={form.obd.scannerModel} placeholder="BlueDriver, Autel, Mirage device" onChange={(value) => setForm({ ...form, obd: { ...form.obd, scannerModel: value } })} />
            <SelectBlock
              label="Codes"
              value={form.obd.codesPresent}
              options={[["unknown", "Unknown"], ["not_scanned", "Not scanned"], ["clear", "No codes"], ["codes_present", "Codes present"]]}
              onChange={(value) => setForm({ ...form, obd: { ...form.obd, codesPresent: value as ProspectObdSnapshot["codesPresent"] } })}
            />
            <SelectBlock
              label="Readiness monitors"
              value={form.obd.monitorsReady}
              options={[["unknown", "Unknown"], ["ready", "Ready"], ["mixed", "Mixed"], ["not_ready", "Not ready"]]}
              onChange={(value) => setForm({ ...form, obd: { ...form.obd, monitorsReady: value as ProspectObdSnapshot["monitorsReady"] } })}
            />
            <TextBlock label="Code summary" value={form.obd.codeSummary} placeholder="Stored, pending, and permanent codes." onChange={(value) => setForm({ ...form, obd: { ...form.obd, codeSummary: value } })} />
            <TextBlock label="Live data notes" value={form.obd.liveDataNotes} placeholder="Fuel trims, coolant temp, voltage, misfire counters, idle behavior." onChange={(value) => setForm({ ...form, obd: { ...form.obd, liveDataNotes: value } })} />
            <TextBlock label="Freeze frame notes" value={form.obd.freezeFrameNotes} placeholder="Context around any code event." onChange={(value) => setForm({ ...form, obd: { ...form.obd, freezeFrameNotes: value } })} />
          </div>
        </Card>

        <Card className="p-5">
          <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
            <div>
              <div className="flex items-center gap-3">
                <Bot className="text-mirage-pink" size={22} />
                <h2 className="text-xl font-semibold">Value target</h2>
              </div>
              <p className="mt-2 text-sm leading-6 text-mirage-muted">
                Manual for now. The intended next step is MirageAI reading listing data, inspection answers, OBD notes, repair estimates, and historical outcomes to suggest a perceived Mirage buy number.
              </p>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <InputBlock label="Estimated repairs" value={form.estimatedRepair} placeholder="6500" onChange={(value) => setForm({ ...form, estimatedRepair: value })} />
                <InputBlock label="Mirage target offer" value={form.recommendedOffer} placeholder="32000" onChange={(value) => setForm({ ...form, recommendedOffer: value })} />
                <TextBlock label="Value notes" value={form.valueNotes} placeholder="Comps, concerns, margin logic, transport, auction/dealer/private-sale notes." onChange={(value) => setForm({ ...form, valueNotes: value })} />
              </div>
            </div>
            <div className="border border-white/[0.06] bg-mirage-secondary p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mirage-muted">Current score</p>
              <p className="mt-4 text-5xl font-semibold text-mirage-cyan">{score == null ? "--" : `${score}%`}</p>
              <p className="mt-3 text-sm leading-6 text-mirage-muted">Offer target: {formatMoney(dollarsToCents(form.recommendedOffer))}</p>
              <p className="mt-1 text-sm leading-6 text-mirage-muted">Repair budget: {formatMoney(dollarsToCents(form.estimatedRepair))}</p>
            </div>
          </div>
          {message && <p className="mt-5 text-sm text-mirage-cyan">{message}</p>}
          <div className="mt-6 flex flex-wrap gap-3">
            <Button disabled={saveProspect.isPending || !form.listingUrl || !form.vehicleLabel} onClick={() => saveProspect.mutate()}>
              <Save size={16} /> {saveProspect.isPending ? "Saving..." : "Save prospect"}
            </Button>
            <Button variant="secondary" onClick={newProspect}>
              <Plus size={16} /> Clear form
            </Button>
          </div>
        </Card>
      </section>
    </div>
  );
}

function InputBlock({ label, value, placeholder, onChange }: { label: string; value: string; placeholder?: string; onChange: (value: string) => void }) {
  return (
    <label className="space-y-2">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-mirage-muted">{label}</span>
      <Input placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function TextBlock({ label, value, placeholder, onChange }: { label: string; value: string; placeholder?: string; onChange: (value: string) => void }) {
  return (
    <label className="space-y-2 md:col-span-2">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-mirage-muted">{label}</span>
      <Textarea placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function SelectBlock({ label, value, options, onChange }: { label: string; value: string; options: Array<[string, string]>; onChange: (value: string) => void }) {
  return (
    <label className="space-y-2">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-mirage-muted">{label}</span>
      <select
        className="h-11 w-full border border-mirage-border bg-mirage-secondary px-3 text-sm text-white outline-none focus:border-mirage-cyan"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map(([optionValue, labelText]) => <option key={optionValue} value={optionValue}>{labelText}</option>)}
      </select>
    </label>
  );
}
