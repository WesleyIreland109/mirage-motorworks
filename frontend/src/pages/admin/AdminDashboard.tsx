import {
  Activity,
  Banknote,
  Car,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileSearch,
  PackageCheck,
  ShieldCheck,
  StickyNote,
  TrendingUp,
  Wrench,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { listVehicles } from "@/api/client";
import { garageJobs } from "@/data/garageOps";
import { MetricCard } from "@/components/MetricCard";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

export function AdminDashboard() {
  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles"],
    queryFn: listVehicles,
  });

  const capital = vehicles.reduce((sum, vehicle) => sum + vehicle.investedAmount, 0);
  const projectedProfit = vehicles.reduce(
    (sum, vehicle) => sum + vehicle.projectedProfit,
    0,
  );
  const averageDays = vehicles.length
    ? Math.round(
        vehicles.reduce((sum, vehicle) => sum + vehicle.daysInInventory, 0) /
          vehicles.length,
      )
    : 0;
  const activeJobs = vehicles
    .map((vehicle) => ({
      vehicle,
      job: garageJobs.find((garageJob) => garageJob.vehicleId === vehicle.id),
    }))
    .filter((item) => item.job);

  const completedChecklist = activeJobs.reduce(
    (sum, item) =>
      sum + item.job!.checklist.filter((check) => check.status === "done").length,
    0,
  );
  const totalChecklist = activeJobs.reduce(
    (sum, item) => sum + item.job!.checklist.length,
    0,
  );
  const blockedItems = activeJobs.reduce(
    (sum, item) =>
      sum + item.job!.checklist.filter((check) => check.status === "blocked").length,
    0,
  );

  return (
    <section className="px-5 py-8 lg:px-8">
      <div className="flex flex-col justify-between gap-4 border-b border-mirage-border pb-6 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-mirage-cyan">
            Garage OS
          </p>
          <h1 className="mt-2 text-4xl font-semibold">Dashboard</h1>
        </div>
        <p className="text-sm text-mirage-muted">
          Internal operating view for inventory, capital, prep, and outcomes.
        </p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Vehicles" value={`${vehicles.length}`} detail="Active records" icon={Car} />
        <MetricCard label="Capital Invested" value={formatCurrency(capital)} detail="Acquisition and prep" icon={Banknote} />
        <MetricCard label="Projected Profit" value={formatCurrency(projectedProfit)} detail="Across current inventory" icon={TrendingUp} />
        <MetricCard label="Average Days" value={`${averageDays}`} detail="Days in inventory" icon={Clock} />
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Shop Progress"
          value={`${completedChecklist}/${totalChecklist}`}
          detail="Inspection and prep checks complete"
          icon={ClipboardCheck}
        />
        <MetricCard
          label="Blocked Items"
          value={`${blockedItems}`}
          detail="Needs parts, photos, or measurements"
          icon={Wrench}
        />
        <MetricCard
          label="Ship Queue"
          value={`${activeJobs.length}`}
          detail="Vehicles being prepared for handoff"
          icon={PackageCheck}
        />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Inventory Status</h2>
            <Activity className="text-mirage-cyan" size={20} />
          </div>
          <div className="mt-6 space-y-4">
            {vehicles.map((vehicle) => (
              <div
                key={vehicle.id}
                className="grid gap-3 border-b border-mirage-border pb-4 last:border-b-0 md:grid-cols-[1fr_auto_auto]"
              >
                <div>
                  <p className="font-medium">
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </p>
                  <p className="text-sm text-mirage-muted">{vehicle.trim}</p>
                </div>
                <StatusBadge status={vehicle.status} />
                <p className="text-sm text-mirage-muted">
                  {vehicle.daysInInventory} days
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Repair Queue</h2>
            <Wrench className="text-mirage-orange" size={20} />
          </div>
          <div className="mt-6 space-y-5">
            {vehicles
              .filter((vehicle) => vehicle.status !== "sold")
              .map((vehicle) => (
                <div key={vehicle.id} className="border border-mirage-border bg-mirage-secondary p-4">
                  <p className="font-medium">
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-mirage-muted">
                    {vehicle.inspectionNotes}
                  </p>
                </div>
              ))}
          </div>
        </Card>
      </div>

      <div className="mt-8 grid gap-6">
        <div className="flex items-center justify-between border-b border-mirage-border pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-mirage-cyan">
              Shop Workflow
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Vehicle job packets</h2>
          </div>
          <p className="max-w-lg text-right text-sm leading-6 text-mirage-muted">
            Intake, inspection, approvals, parts, repair, QC, detail, documents,
            and shipment readiness in one working view.
          </p>
        </div>

        {activeJobs.map(({ vehicle, job }) => (
          <Card key={vehicle.id} className="overflow-hidden">
            <div className="grid gap-0 xl:grid-cols-[340px_1fr]">
              <div className="border-b border-mirage-border bg-mirage-secondary p-5 xl:border-b-0 xl:border-r">
                <StatusBadge status={vehicle.status} />
                <h3 className="mt-4 text-2xl font-semibold">
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </h3>
                <p className="mt-1 text-sm text-mirage-secondaryText">{vehicle.trim}</p>
                <div className="mt-6 grid gap-3 text-sm">
                  {[
                    ["VIN", job!.vin],
                    ["Repair Order", job!.repairOrder],
                    ["Stage", job!.stage],
                    ["Bay", job!.bay],
                    ["Technician", job!.technician],
                    ["Target Ship", job!.targetShipDate],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-4 border-b border-white/[0.05] pb-2">
                      <span className="text-mirage-muted">{label}</span>
                      <span className="text-right font-medium text-white">{value}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-5 border border-mirage-orange/30 bg-mirage-orange/10 p-3 text-sm text-mirage-orange">
                  {job!.blocker}
                </div>
              </div>

              <div className="grid gap-5 p-5 lg:grid-cols-2">
                <section>
                  <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-mirage-cyan">
                    <ClipboardCheck size={16} /> Prep checklist
                  </div>
                  <div className="mt-4 space-y-3">
                    {job!.checklist.map((item) => (
                      <div key={item.label} className="flex items-center justify-between gap-4 border border-white/[0.05] bg-mirage-bg/40 px-3 py-2">
                        <span className="text-sm text-zinc-200">{item.label}</span>
                        <span className={`text-xs font-semibold uppercase tracking-[0.16em] ${
                          item.status === "done"
                            ? "text-emerald-300"
                            : item.status === "active"
                              ? "text-mirage-cyan"
                              : item.status === "blocked"
                                ? "text-mirage-orange"
                                : "text-mirage-muted"
                        }`}>
                          {item.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-mirage-pink">
                    <StickyNote size={16} /> Tech notes
                  </div>
                  <div className="mt-4 space-y-3">
                    {job!.notes.map((note) => (
                      <p key={note} className="border border-white/[0.05] bg-mirage-bg/40 p-3 text-sm leading-6 text-mirage-secondaryText">
                        {note}
                      </p>
                    ))}
                  </div>
                </section>

                <section>
                  <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-mirage-gold">
                    <PackageCheck size={16} /> Parts and materials
                  </div>
                  <div className="mt-4 space-y-3">
                    {job!.parts.map((part) => (
                      <div key={part.name} className="flex items-center justify-between gap-4 text-sm">
                        <span className="text-zinc-200">{part.name}</span>
                        <span className="text-mirage-muted">{part.status}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-mirage-purple">
                    <FileSearch size={16} /> Documents
                  </div>
                  <div className="mt-4 space-y-3">
                    <div className="grid gap-2 border border-white/[0.05] bg-mirage-bg/40 p-3 text-sm">
                      <div className="flex items-center gap-2 text-zinc-200">
                        <ShieldCheck size={15} className="text-mirage-cyan" />
                        {job!.carfaxStatus}
                      </div>
                      <div className="flex items-center gap-2 text-zinc-200">
                        <CheckCircle2 size={15} className="text-emerald-300" />
                        {job!.titleStatus}
                      </div>
                    </div>
                    {job!.documents.map((document) => (
                      <div key={document.name} className="flex items-center justify-between gap-4 text-sm">
                        <span className="text-zinc-200">{document.name}</span>
                        <span className="text-mirage-muted">{document.status}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="lg:col-span-2">
                  <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300">
                    <PackageCheck size={16} /> Ship-ready handoff
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {job!.handoff.map((item) => (
                      <div key={item.label} className="flex items-center justify-between gap-4 border border-white/[0.05] bg-mirage-bg/40 px-3 py-2">
                        <span className="text-sm text-zinc-200">{item.label}</span>
                        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-mirage-muted">
                          {item.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
