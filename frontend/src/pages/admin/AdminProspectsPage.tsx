import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, ExternalLink, Plus, Radar, SearchCheck, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { analyzeProspect, createProspect, deleteProspect, listProspects, scrapeProspectCandidates, updateProspect } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { dollarsToCents, emptyProspectObd, formFromProspect, formatMoney, inputFromProspectForm, prospectChecklistTemplate, prospectStatusLabels } from "@/lib/prospects";
import type { ProspectReport, ProspectScrapeCandidate } from "@/types/fleet";

function isCarsAndBidsUrl(value: string) {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === "carsandbids.com" || hostname.endsWith(".carsandbids.com");
  } catch {
    return false;
  }
}

function auctionDisplay(prospect: ProspectReport, now: number) {
  if (prospect.auctionStatus === "sold" || prospect.status === "sold") {
    return { label: "Sold", value: "Auction sold" };
  }
  const endsAt = prospect.auctionEndsAt ? new Date(prospect.auctionEndsAt) : null;
  if (!endsAt || Number.isNaN(endsAt.getTime())) {
    return prospect.auctionStatus === "live"
      ? { label: "Live", value: "Timer unknown" }
      : null;
  }
  const remainingMs = endsAt.getTime() - now;
  if (remainingMs <= 0 || prospect.auctionStatus === "ended" || prospect.status === "auction_ended") {
    return { label: "Ended", value: "Auction ended" };
  }
  const totalMinutes = Math.floor(remainingMs / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const value = days > 0 ? `${days}d ${hours}h left` : `${hours}h ${minutes}m left`;
  return { label: "Live", value };
}

const scrapeMakes = ["Acura", "Honda", "Toyota", "Lexus", "Mazda", "Nissan", "Infiniti", "Subaru", "Mitsubishi", "Ford", "Chevrolet", "Dodge", "Pontiac"];

export function AdminProspectsPage() {
  const queryClient = useQueryClient();
  const [now, setNow] = useState(Date.now());
  const [maxPrice, setMaxPrice] = useState("10000");
  const [minYear, setMinYear] = useState("1990");
  const [maxYear, setMaxYear] = useState("2000");
  const [transmission, setTransmission] = useState<"any" | "manual" | "automatic">("any");
  const [selectedMakes, setSelectedMakes] = useState<string[]>(["Acura", "Honda", "Toyota", "Mazda", "Nissan", "Subaru", "Mitsubishi", "Ford", "Chevrolet"]);
  const [candidates, setCandidates] = useState<ProspectScrapeCandidate[]>([]);
  const [scrapeNotes, setScrapeNotes] = useState<string[]>([]);
  const { data: prospects = [], isLoading } = useQuery({
    queryKey: ["prospects"],
    queryFn: listProspects,
  });
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(interval);
  }, []);
  const removeProspect = useMutation({
    mutationFn: deleteProspect,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["prospects"] }),
  });
  const scrapeProspects = useMutation({
    mutationFn: () => scrapeProspectCandidates({
      source: "carsandbids",
      maxPriceCents: dollarsToCents(maxPrice),
      minYear: numberOrUndefined(minYear),
      maxYear: numberOrUndefined(maxYear),
      transmission,
      makes: selectedMakes,
      maxResults: 12,
    }),
    onSuccess: (result) => {
      setCandidates(result.candidates);
      setScrapeNotes(result.sourceNotes);
    },
  });
  const addCandidate = useMutation({
    mutationFn: (candidate: ProspectScrapeCandidate) => createProspect({
      listingUrl: candidate.listingUrl,
      vehicleLabel: candidate.vehicleLabel,
      askingPriceCents: candidate.askingPriceCents,
      mileage: undefined,
      location: "",
      sellerName: "",
      vin: undefined,
      status: "auction_live",
      summary: candidate.summary || "Imported from Cars & Bids scrape. Run MirageAI for deeper parsing.",
      auctionStatus: candidate.auctionStatus,
      auctionEndsAt: undefined,
      checklist: prospectChecklistTemplate.map((item) => ({ ...item })),
      obd: { ...emptyProspectObd },
      estimatedRepairCents: undefined,
      recommendedOfferCents: undefined,
      valueNotes: "Imported from the Cars & Bids prospect scrape. Run MirageAI after saving to calculate repair/prep budget and Mirage target offer.",
    }),
    onSuccess: (_saved, candidate) => {
      setCandidates((current) => current.filter((item) => item.listingUrl !== candidate.listingUrl));
      queryClient.invalidateQueries({ queryKey: ["prospects"] });
    },
  });
  const refreshProspect = useMutation({
    mutationFn: async (prospect: ProspectReport) => {
      const current = inputFromProspectForm(formFromProspect(prospect));
      const analysis = await analyzeProspect(current);
      return updateProspect(prospect.id, {
        ...current,
        vehicleLabel: analysis.vehicleLabel || current.vehicleLabel,
        askingPriceCents: analysis.askingPriceCents ?? current.askingPriceCents,
        mileage: analysis.mileage ?? current.mileage,
        location: analysis.location || current.location,
        sellerName: analysis.sellerName || current.sellerName,
        vin: analysis.vin || current.vin,
        status: analysis.status || current.status,
        summary: analysis.summary || current.summary,
        auctionStatus: analysis.auctionStatus || current.auctionStatus,
        auctionEndsAt: analysis.auctionEndsAt || current.auctionEndsAt,
        estimatedRepairCents: analysis.estimatedRepairCents ?? current.estimatedRepairCents,
        recommendedOfferCents: analysis.recommendedOfferCents ?? current.recommendedOfferCents,
        valueNotes: [
          analysis.valueNotes || current.valueNotes,
          analysis.sourceNotes.length ? `Source notes: ${analysis.sourceNotes.join(" ")}` : "",
          `MirageAI confidence: ${analysis.confidence}`,
        ].filter(Boolean).join("\n\n"),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["prospects"] }),
  });

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
      <div className="flex flex-col gap-5 border-b border-mirage-border pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-mirage-cyan">
            Garage OS
          </p>
          <h1 className="mt-2 text-4xl font-semibold">Prospects</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-mirage-muted">
            Track potential acquisitions before they become Mirage inventory:
            listing links, employee inspections, OBD notes, rough repair budget,
            and a target buy number.
          </p>
        </div>
        <Button asChild>
          <Link to="/admin/prospects/new">
            <Plus size={16} /> New prospect
          </Link>
        </Button>
      </div>

      <Card className="mt-8 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Radar className="text-mirage-cyan" size={20} />
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mirage-muted">Cars & Bids scrape</p>
            </div>
            <h2 className="mt-3 text-2xl font-semibold">Find acquisition candidates</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-mirage-muted">
              Pull live auctions into a temporary review queue before saving the cars that deserve a full Mirage prospect report.
            </p>
          </div>
          <Button disabled={scrapeProspects.isPending} onClick={() => scrapeProspects.mutate()}>
            <Radar size={16} /> {scrapeProspects.isPending ? "Scraping..." : "Scrape matches"}
          </Button>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <label className="block text-sm font-medium text-white">
            Max cost
            <select
              className="mt-2 h-11 w-full border border-mirage-border bg-mirage-secondary px-3 text-sm text-white outline-none transition focus:border-mirage-cyan"
              value={maxPrice}
              onChange={(event) => setMaxPrice(event.target.value)}
            >
              <option value="5000">$5,000</option>
              <option value="7500">$7,500</option>
              <option value="10000">$10,000</option>
              <option value="15000">$15,000</option>
              <option value="20000">$20,000</option>
              <option value="30000">$30,000</option>
            </select>
          </label>
          <FilterInput label="Min year" value={minYear} onChange={setMinYear} placeholder="1990" />
          <FilterInput label="Max year" value={maxYear} onChange={setMaxYear} placeholder="2000" />
          <label className="block text-sm font-medium text-white">
            Transmission
            <select
              className="mt-2 h-11 w-full border border-mirage-border bg-mirage-secondary px-3 text-sm text-white outline-none transition focus:border-mirage-cyan"
              value={transmission}
              onChange={(event) => setTransmission(event.target.value as typeof transmission)}
            >
              <option value="any">Any</option>
              <option value="manual">Manual</option>
              <option value="automatic">Automatic</option>
            </select>
          </label>
        </div>
        <div className="mt-5">
          <p className="text-sm font-medium text-white">Makes</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {scrapeMakes.map((make) => {
              const active = selectedMakes.includes(make);
              return (
                <button
                  key={make}
                  type="button"
                  className={`border px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition ${active ? "border-mirage-cyan bg-mirage-cyan/10 text-mirage-cyan" : "border-mirage-border bg-white/[0.02] text-mirage-muted hover:text-white"}`}
                  onClick={() => setSelectedMakes((current) => active ? current.filter((item) => item !== make) : [...current, make])}
                >
                  {make}
                </button>
              );
            })}
          </div>
        </div>
        {scrapeProspects.isError && (
          <p className="mt-4 text-sm text-red-300">Could not scrape Cars & Bids right now. Check Firecrawl and backend logs.</p>
        )}
        {scrapeNotes.length > 0 && (
          <p className="mt-4 text-xs leading-5 text-mirage-muted">{scrapeNotes.join(" ")}</p>
        )}
        {candidates.length > 0 && (
          <div className="mt-6 grid gap-3 lg:grid-cols-2">
            {candidates.map((candidate) => (
              <div key={candidate.listingUrl} className="border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mirage-cyan">{candidate.make || "Candidate"}</p>
                    <h3 className="mt-2 text-lg font-semibold text-white">{candidate.vehicleLabel}</h3>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-mirage-muted">{candidate.summary}</p>
                  </div>
                  <Button size="sm" disabled={addCandidate.isPending} onClick={() => addCandidate.mutate(candidate)}>
                    <Plus size={14} /> Add prospect
                  </Button>
                </div>
                <div className="mt-4 grid gap-2 text-sm text-mirage-muted sm:grid-cols-3">
                  <Metric label="Bid / Ask" value={formatMoney(candidate.askingPriceCents)} />
                  <Metric label="Year" value={candidate.year ? String(candidate.year) : "Unknown"} />
                  <Metric label="Gearbox" value={candidate.transmission || "Unknown"} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {isLoading ? (
        <p className="py-12 text-sm text-mirage-muted">Loading prospects...</p>
      ) : prospects.length ? (
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {prospects.map((prospect) => {
            const auction = auctionDisplay(prospect, now);
            const isCarsAndBids = isCarsAndBidsUrl(prospect.listingUrl);
            return (
            <Card key={prospect.id} className="p-5 transition hover:border-mirage-cyan/40 hover:bg-mirage-secondary">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <SearchCheck className="text-mirage-cyan" size={20} />
                    <span className="inline-flex border border-mirage-border bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-mirage-muted">
                      {prospectStatusLabels[prospect.status]}
                    </span>
                    {auction && (
                      <span className="inline-flex border border-mirage-cyan/30 bg-mirage-cyan/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-mirage-cyan">
                        {auction.label}
                      </span>
                    )}
                  </div>
                  <h2 className="mt-4 text-2xl font-semibold">{prospect.vehicleLabel}</h2>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-mirage-muted">
                    {prospect.summary || "No employee summary yet."}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="secondary" size="sm">
                    <Link to={`/admin/prospects/${prospect.id}`}>
                      Open
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={removeProspect.isPending}
                    onClick={() => {
                      if (window.confirm(`Delete ${prospect.vehicleLabel} from prospects?`)) {
                        removeProspect.mutate(prospect.id);
                      }
                    }}
                  >
                    <Trash2 size={14} /> Delete
                  </Button>
                  {isCarsAndBids && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={refreshProspect.isPending}
                      onClick={() => refreshProspect.mutate(prospect)}
                    >
                      <Bot size={14} /> Refresh status
                    </Button>
                  )}
                </div>
              </div>

              <div className="mt-5 grid gap-3 text-sm text-mirage-muted sm:grid-cols-3">
                <Metric label="Bid / Ask" value={formatMoney(prospect.askingPriceCents)} />
                <Metric label="Repairs" value={formatMoney(prospect.estimatedRepairCents)} />
                <Metric label="Target" value={formatMoney(prospect.recommendedOfferCents)} />
              </div>
              {auction && (
                <div className="mt-3 border border-white/[0.05] bg-white/[0.02] p-3 text-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-mirage-muted">
                    Cars & Bids
                  </p>
                  <p className="mt-2 font-semibold text-white">{auction.value}</p>
                </div>
              )}

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-mirage-border pt-4 text-xs text-mirage-muted">
                <span>{prospect.location || "Location unknown"}</span>
                <a
                  href={prospect.listingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 transition hover:text-white"
                >
                  Listing <ExternalLink size={13} />
                </a>
              </div>
            </Card>
          );
          })}
        </div>
      ) : (
        <Card className="mt-8 p-8 text-center">
          <SearchCheck className="mx-auto text-mirage-cyan" size={30} />
          <h2 className="mt-4 text-2xl font-semibold">No prospect cars yet</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-mirage-muted">
            Add a listing link, inspect the car from your phone, and keep the
            early decision data attached before it becomes a garage project.
          </p>
          <Button asChild className="mt-6">
            <Link to="/admin/prospects/new">
              <Plus size={16} /> Create first prospect
            </Link>
          </Button>
        </Card>
      )}
    </div>
  );
}

function FilterInput({ label, value, placeholder, onChange }: { label: string; value: string; placeholder: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm font-medium text-white">
      {label}
      <input
        className="mt-2 h-11 w-full border border-mirage-border bg-mirage-secondary px-3 text-sm text-white outline-none transition placeholder:text-mirage-muted focus:border-mirage-cyan"
        value={value}
        placeholder={placeholder}
        inputMode="numeric"
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-white/[0.05] bg-white/[0.02] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-mirage-muted">
        {label}
      </p>
      <p className="mt-2 font-semibold text-white">{value}</p>
    </div>
  );
}

function numberOrUndefined(value: string) {
  const parsed = Number(value.replace(/[,\s]/g, ""));
  return Number.isInteger(parsed) ? parsed : undefined;
}
