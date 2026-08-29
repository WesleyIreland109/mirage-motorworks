import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, ExternalLink, Plus, SearchCheck, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { analyzeProspect, deleteProspect, listProspects, updateProspect } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formFromProspect, formatMoney, inputFromProspectForm, prospectStatusLabels } from "@/lib/prospects";
import type { ProspectReport } from "@/types/fleet";

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

export function AdminProspectsPage() {
  const queryClient = useQueryClient();
  const [now, setNow] = useState(Date.now());
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
