import {
  ArrowLeft,
  CalendarClock,
  Check,
  Clipboard,
  FileSearch,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";

import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { garageJobs } from "@/data/garageOps";
import { mockVehicles } from "@/data/mockVehicles";
import { cn, formatCurrency } from "@/lib/utils";

const updateCopy = {
  headline: "Your Camaro is 60% through prep.",
  summary:
    "Mechanical inspection is underway, documentation is organized, and the next checkpoint is tire/brake measurements before final road test and detail.",
  progress: 60,
  textMessage:
    "The Camaro has a new Mirage Motorworks progress update: mechanical inspection is underway and the build is 60% complete.",
};

const timeline = [
  { label: "Intake", status: "done", detail: "VIN, title, photos, and repair order created." },
  { label: "Documentation", status: "done", detail: "Carfax is attached and seller records are requested." },
  { label: "Mechanical Review", status: "active", detail: "Cooling, brakes, clutch feel, and scan report in progress." },
  { label: "Detail + QC", status: "todo", detail: "Final drive, cosmetic notes, and delivery photos remain." },
  { label: "Ready", status: "todo", detail: "Buyer dossier and shipment handoff after signoff." },
];

export function VehicleUpdatePage() {
  const { slug = "2013-chevrolet-camaro-2ss" } = useParams();
  const vehicle =
    mockVehicles.find((vehicle) => vehicle.slug === slug) ??
    mockVehicles.find((vehicle) => vehicle.slug === "2013-chevrolet-camaro-2ss");
  const job = garageJobs.find((garageJob) => garageJob.vehicleId === vehicle?.id);

  if (!vehicle || !job) {
    return (
      <main className="min-h-screen bg-mirage-bg px-5 py-10 text-white">
        <Logo />
        <p className="mt-20 text-mirage-muted">Update not found.</p>
      </main>
    );
  }

  const shareUrl =
    typeof window === "undefined" ? "" : `${window.location.origin}${window.location.pathname}`;
  const message = `${updateCopy.textMessage} ${shareUrl}`;

  const copyUpdate = async () => {
    await navigator.clipboard?.writeText(message);
  };

  return (
    <main className="min-h-screen overflow-hidden bg-mirage-bg text-white">
      <section className="relative px-5 py-6">
        <img
          src={vehicle.heroImage}
          alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
          className="absolute inset-0 h-full w-full object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-mirage-bg/80 via-mirage-bg/92 to-mirage-bg" />
        <div className="star-field absolute inset-0 opacity-25" />
        <div className="relative z-10 mx-auto max-w-6xl">
          <div className="flex items-center justify-between gap-4">
            <Logo />
            <Button asChild variant="secondary" size="sm" className="whitespace-nowrap">
              <Link to="/admin">
                <ArrowLeft size={15} />
                Garage OS
              </Link>
            </Button>
          </div>

          <div className="grid gap-10 pb-14 pt-16 lg:grid-cols-[1fr_360px] lg:items-end">
            <div>
              <StatusBadge status={vehicle.status} />
              <p className="mt-6 text-sm font-semibold uppercase tracking-[0.28em] text-mirage-cyan">
                Progress Update
              </p>
              <h1 className="mt-4 max-w-4xl font-display text-5xl font-bold leading-none sm:text-6xl lg:text-7xl">
                {updateCopy.headline}
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-mirage-secondaryText">
                {updateCopy.summary}
              </p>
            </div>
            <div className="border border-white/[0.06] bg-mirage-panel/85 p-5 backdrop-blur-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-mirage-muted">
                Vehicle
              </p>
              <p className="mt-3 text-2xl font-semibold">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </p>
              <p className="mt-1 text-mirage-secondaryText">{vehicle.trim}</p>
              <div className="mt-5 grid gap-3 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-mirage-muted">RO</span>
                  <span>{job.repairOrder}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-mirage-muted">VIN</span>
                  <span>{job.vin}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-mirage-muted">Guide</span>
                  <span>{formatCurrency(vehicle.askingPrice)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-5 pb-20 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <div className="border border-white/[0.06] bg-mirage-panel p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-mirage-muted">
                  Overall Progress
                </p>
                <p className="mt-2 font-display text-5xl font-bold">{updateCopy.progress}%</p>
              </div>
              <p className="text-right text-sm text-mirage-secondaryText">
                Current stage: {job.stage}
              </p>
            </div>
            <div className="mt-6 h-4 overflow-hidden border border-white/[0.08] bg-mirage-bg">
              <motion.div
                className="h-full bg-mirage-gradient"
                initial={{ width: "0%" }}
                animate={{ width: `${updateCopy.progress}%` }}
                transition={{ duration: 1.2, ease: "easeOut" }}
              />
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                { icon: Wrench, label: "In Shop", value: job.bay },
                { icon: CalendarClock, label: "Target", value: job.targetShipDate },
                { icon: ShieldCheck, label: "History", value: job.carfaxStatus },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="border border-white/[0.05] bg-mirage-bg/50 p-4">
                    <Icon className="text-mirage-cyan" size={18} />
                    <p className="mt-3 text-xs uppercase tracking-[0.18em] text-mirage-muted">
                      {item.label}
                    </p>
                    <p className="mt-1 text-sm text-zinc-100">{item.value}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="border border-white/[0.06] bg-mirage-panel p-6">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-mirage-cyan">
                <Sparkles size={16} />
                What changed
              </div>
              <ul className="mt-5 space-y-4">
                {job.notes.map((note) => (
                  <li key={note} className="flex gap-3 text-sm leading-6 text-mirage-secondaryText">
                    <Check className="mt-1 shrink-0 text-mirage-cyan" size={16} />
                    {note}
                  </li>
                ))}
              </ul>
            </div>

            <div className="border border-white/[0.06] bg-mirage-panel p-6">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-mirage-orange">
                <FileSearch size={16} />
                Documentation
              </div>
              <div className="mt-5 space-y-3">
                {job.documents.map((document) => (
                  <div key={document.name} className="flex items-center justify-between gap-4 border-b border-white/[0.05] pb-3 text-sm last:border-0">
                    <span className="text-zinc-100">{document.name}</span>
                    <span className="text-mirage-muted">{document.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="border border-white/[0.06] bg-mirage-panel p-6">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-mirage-pink">
              <PackageCheck size={16} />
              Timeline
            </div>
            <div className="mt-6 grid gap-4">
              {timeline.map((item) => (
                <div key={item.label} className="grid gap-3 border border-white/[0.05] bg-mirage-bg/40 p-4 sm:grid-cols-[170px_1fr_auto] sm:items-center">
                  <p className="font-medium text-white">{item.label}</p>
                  <p className="text-sm leading-6 text-mirage-secondaryText">{item.detail}</p>
                  <span
                    className={cn(
                      "w-fit text-xs font-semibold uppercase tracking-[0.16em]",
                      item.status === "done" && "text-emerald-300",
                      item.status === "active" && "text-mirage-cyan",
                      item.status === "todo" && "text-mirage-muted",
                    )}
                  >
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="overflow-hidden border border-white/[0.06] bg-mirage-panel">
            <img
              src={vehicle.gallery[1]}
              alt=""
              className="aspect-[4/3] w-full object-cover"
            />
            <div className="p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-mirage-muted">
                Latest Note
              </p>
              <p className="mt-3 text-lg font-semibold leading-7">
                {job.blocker}
              </p>
              <p className="mt-3 text-sm leading-6 text-mirage-secondaryText">
                Once measurements are logged, the Camaro moves to road test,
                final QC, detail, and delivery photography.
              </p>
            </div>
          </div>

          <div className="border border-white/[0.06] bg-mirage-panel p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-mirage-muted">
              Text Message
            </p>
            <p className="mt-3 text-sm leading-6 text-mirage-secondaryText">
              {message}
            </p>
            <Button onClick={copyUpdate} className="mt-5 w-full" type="button">
              <Clipboard size={16} />
              Copy Update
            </Button>
          </div>
        </aside>
      </section>
    </main>
  );
}
