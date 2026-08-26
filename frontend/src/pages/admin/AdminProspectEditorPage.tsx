import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Bot,
  ClipboardCheck,
  ExternalLink,
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
import {
  blankProspectForm,
  dollarsToCents,
  formFromProspect,
  formatMoney,
  inputFromProspectForm,
  prospectStatusLabels,
  type ProspectFormState,
} from "@/lib/prospects";
import type {
  ProspectChecklistItem,
  ProspectChecklistResult,
  ProspectObdSnapshot,
  ProspectStatus,
} from "@/types/fleet";

const resultLabels: Record<ProspectChecklistResult, string> = {
  pass: "Pass",
  monitor: "Monitor",
  fail: "Fail",
  unknown: "Unknown",
  not_applicable: "N/A",
};

export function AdminProspectEditorPage() {
  const { prospectId } = useParams();
  const isNew = prospectId === "new";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ProspectFormState>(blankProspectForm);
  const [message, setMessage] = useState("");

  const { data: prospects = [], isLoading } = useQuery({
    queryKey: ["prospects"],
    queryFn: listProspects,
  });

  const prospect = useMemo(
    () => prospects.find((item) => item.id === prospectId),
    [prospects, prospectId],
  );

  useEffect(() => {
    if (prospect && !isNew) {
      setForm(formFromProspect(prospect));
    }
  }, [prospect, isNew]);

  const saveProspect = useMutation({
    mutationFn: async () => {
      const payload = inputFromProspectForm(form);
      return isNew || !prospectId ? createProspect(payload) : updateProspect(prospectId, payload);
    },
    onSuccess: (saved) => {
      setMessage("Prospect saved.");
      queryClient.invalidateQueries({ queryKey: ["prospects"] });
      if (isNew) navigate(`/admin/prospects/${saved.id}`, { replace: true });
    },
    onError: () => setMessage("Unable to save. Check the listing URL and required vehicle label."),
  });

  const removeProspect = useMutation({
    mutationFn: deleteProspect,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospects"] });
      navigate("/admin/prospects", { replace: true });
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
    const map = new Map<string, Array<{ item: ProspectChecklistItem; index: number }>>();
    form.checklist.forEach((item, index) => {
      map.set(item.category, [...(map.get(item.category) ?? []), { item, index }]);
    });
    return Array.from(map.entries());
  }, [form.checklist]);

  function updateChecklistItem(index: number, patch: Partial<ProspectChecklistItem>) {
    setForm((current) => ({
      ...current,
      checklist: current.checklist.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
    }));
  }

  if (!isNew && isLoading) {
    return <p className="px-5 py-12 text-sm text-mirage-muted lg:px-8">Loading prospect...</p>;
  }

  if (!isNew && !prospect) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-12 lg:px-8">
        <Card className="p-8 text-center">
          <h1 className="text-2xl font-semibold">Prospect not found</h1>
          <Button asChild className="mt-6" variant="secondary">
            <Link to="/admin/prospects">
              <ArrowLeft size={16} /> Back to prospects
            </Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <Button asChild variant="ghost" className="mb-5 px-0">
            <Link to="/admin/prospects">
              <ArrowLeft size={16} /> Back to prospects
            </Link>
          </Button>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-mirage-cyan">Potential acquisition</p>
          <h1 className="mt-2 text-4xl font-semibold">{isNew ? "New prospect" : form.vehicleLabel}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-mirage-muted">
            Use this from a phone while inspecting a car. The structured report
            stays attached to the listing so Mirage can learn what to buy, what
            to pass on, and eventually what AI should recommend paying.
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
          {!isNew && prospectId && (
            <Button
              variant="danger"
              size="sm"
              disabled={removeProspect.isPending}
              onClick={() => {
                if (window.confirm("Delete this prospect report?")) removeProspect.mutate(prospectId);
              }}
            >
              <Trash2 size={14} /> Delete
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <SearchCheck className="text-mirage-cyan" size={24} />
            <h2 className="text-xl font-semibold">Listing and seller details</h2>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="space-y-2 md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-mirage-muted">Listing URL</span>
              <Input inputMode="url" placeholder="https://..." value={form.listingUrl} onChange={(event) => setForm({ ...form, listingUrl: event.target.value })} />
            </label>
            <InputBlock label="Vehicle label" value={form.vehicleLabel} placeholder="2013 Camaro 2SS" onChange={(value) => setForm({ ...form, vehicleLabel: value })} />
            <SelectBlock
              label="Status"
              value={form.status}
              options={Object.entries(prospectStatusLabels)}
              onChange={(value) => setForm({ ...form, status: value as ProspectStatus })}
            />
            <InputBlock label="Asking price" value={form.askingPrice} placeholder="50000" onChange={(value) => setForm({ ...form, askingPrice: value })} />
            <InputBlock label="Mileage" value={form.mileage} placeholder="72500" onChange={(value) => setForm({ ...form, mileage: value })} />
            <InputBlock label="Location" value={form.location} placeholder="Austin, TX" onChange={(value) => setForm({ ...form, location: value })} />
            <InputBlock label="Seller" value={form.sellerName} placeholder="Private seller or dealer" onChange={(value) => setForm({ ...form, sellerName: value })} />
            <label className="space-y-2 md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-mirage-muted">VIN</span>
              <Input placeholder="Optional until confirmed" value={form.vin} onChange={(event) => setForm({ ...form, vin: event.target.value.toUpperCase() })} />
            </label>
            <TextBlock label="Employee summary" value={form.summary} placeholder="Why this car is interesting, what feels risky, and what needs follow-up." onChange={(value) => setForm({ ...form, summary: value })} />
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
                  {items.map(({ item, index }) => (
                    <div key={`${item.category}-${item.label}`} className="grid gap-3 border border-white/[0.05] bg-white/[0.02] p-3 md:grid-cols-[1fr_160px]">
                      <div>
                        <p className="text-sm font-medium">{item.label}</p>
                        <Input className="mt-3" placeholder="Notes" value={item.notes} onChange={(event) => updateChecklistItem(index, { notes: event.target.value })} />
                      </div>
                      <select
                        className="h-11 border border-mirage-border bg-mirage-secondary px-3 text-sm text-white outline-none focus:border-mirage-cyan"
                        value={item.result}
                        onChange={(event) => updateChecklistItem(index, { result: event.target.value as ProspectChecklistResult })}
                      >
                        {Object.entries(resultLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-xl font-semibold">OBD scan snapshot</h2>
          <p className="mt-2 text-sm text-mirage-muted">
            Employee-focused checks can include scanner results now. Later,
            telemetry and scan history can feed MirageAI valuation.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="flex items-center gap-3 border border-mirage-border bg-mirage-secondary px-3 py-3 text-sm">
              <input type="checkbox" checked={form.obd.scannerUsed} onChange={(event) => setForm({ ...form, obd: { ...form.obd, scannerUsed: event.target.checked } })} />
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
                Manual for now. The intended next step is MirageAI reading
                listing data, inspection answers, OBD notes, repair estimates,
                and historical outcomes to suggest a perceived Mirage buy number.
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
        </Card>

        <div className="sticky bottom-0 -mx-5 border-t border-mirage-border bg-mirage-bg/95 px-5 py-4 backdrop-blur lg:-mx-8 lg:px-8">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3">
            <Button disabled={saveProspect.isPending || !form.listingUrl || !form.vehicleLabel} onClick={() => saveProspect.mutate()}>
              <Save size={16} /> {saveProspect.isPending ? "Saving..." : "Save prospect"}
            </Button>
            <Button asChild variant="secondary">
              <Link to="/admin/prospects">Cancel</Link>
            </Button>
            {message && <p className="text-sm text-mirage-cyan">{message}</p>}
          </div>
        </div>
      </div>
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
