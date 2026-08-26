import {
  Activity,
  ArrowRight,
  ClipboardCheck,
  Download,
  FileText,
  Gauge,
  PackageCheck,
  RadioTower,
  Smartphone,
  Sparkles,
  Wrench,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";

import { listVehicles } from "@/api/client";
import { VehicleCard } from "@/components/VehicleCard";
import { Button } from "@/components/ui/button";

const capabilities = [
  { label: "GarageOS", icon: Gauge, to: "/garage-os", text: "Vehicle intake, VIN notes, checklists, repair status, documents, and handoff details in one workspace." },
  { label: "Telemetry Dashboard", icon: RadioTower, to: "/telemetry-dashboard", text: "Recorded drive files become readable sessions with metrics, observations, and report drafts." },
  { label: "Instant Updates", icon: Smartphone, to: "/garage-os#instant-updates", text: "Shareable progress links keep mechanics, owners, and the garage team aligned automatically." },
  { label: "Inventory Pipeline", icon: PackageCheck, to: "/inventory", text: "Track acquisition, refurbishment scope, parts, cost basis, readiness, and final listing quality." },
];

const operatingLoops = [
  { label: "Source", icon: Sparkles, text: "Find neglected enthusiast cars with real character, upside, and a clear restoration plan." },
  { label: "Refurbish", icon: Wrench, text: "Turn unknowns into mechanical tasks, measurements, documents, parts decisions, and OEM+ prep." },
  { label: "Analyze", icon: Activity, text: "Use telemetry and road-test data to support the human inspection instead of replacing it." },
  { label: "Sell", icon: ClipboardCheck, text: "Move the finished car into Mirage inventory with cleaner proof, sharper trust, and fewer loose ends." },
];

export function HomePage() {
  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles"],
    queryFn: listVehicles,
  });

  return (
    <main>
      <section className="relative flex min-h-[88vh] items-center overflow-hidden px-5 pt-20">
        <div className="star-field absolute inset-0 opacity-60" />
        <div className="atmospheric-grain absolute inset-0 opacity-[0.06]" />
        <div className="absolute inset-x-0 bottom-0 h-[52vh] overflow-hidden">
          <div className="hero-grid absolute inset-x-[-18%] bottom-[-34%] h-[118%] opacity-28" />
          <div className="absolute inset-x-0 bottom-24 mx-auto h-44 max-w-5xl rounded-t-full bg-mirage-gradient opacity-[0.18] blur-3xl" />
          <div className="absolute inset-x-0 bottom-24 mx-auto h-36 max-w-3xl rounded-t-full border-t border-mirage-pink/20 bg-gradient-to-t from-mirage-orange/12 via-mirage-pink/12 to-mirage-cyan/10" />
          <div className="city-silhouette absolute inset-x-0 bottom-0 h-40 opacity-80" />
        </div>
        <div className="relative z-10 mx-auto grid w-full max-w-7xl gap-12 lg:grid-cols-[1fr_440px] lg:items-end">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28 }}
          >
            <h1 className="max-w-5xl font-display text-6xl font-bold leading-[0.9] text-white sm:text-7xl lg:text-8xl">
              Automated Garage.
              <br />
              Restored Icons.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-zinc-300">
              Mirage Motorworks refurbishes neglected enthusiast cars, takes on
              select repair and maintenance work, and runs the business on
              software at its core: GarageOS, telemetry, repair automation,
              instant updates, documents, and inventory readiness.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Button asChild>
                <Link to="/garage-os">
                  Explore GarageOS <ArrowRight size={17} />
                </Link>
              </Button>
              <Button asChild variant="secondary">
                <Link to="/inventory">View Inventory</Link>
              </Button>
            </div>
          </motion.div>
          <div className="border border-white/[0.06] bg-mirage-surface/60 p-5 shadow-glass backdrop-blur-md">
            <div className="h-px w-full bg-mirage-gradient opacity-70" />
            <p className="text-xs uppercase tracking-[0.24em] text-mirage-muted">
              Current Focus
            </p>
            <p className="mt-4 text-3xl font-semibold leading-tight">
              The big unlock is automation: every inspection, repair note,
              telemetry session, and progress update moves the car closer to
              completion without disappearing into texts and spreadsheets.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-24">
        <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-mirage-pink">
              Mirage Inventory
            </p>
            <h2 className="mt-3 text-4xl font-bold text-white md:text-5xl">
              Refurbished, not passed through.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-mirage-muted">
              The goal is a Mirage-owned inventory of enthusiast cars we source,
              repair, refresh, document, and sell ourselves. Each listing is the
              public output of a real operating record.
            </p>
          </div>
          <Button asChild variant="secondary">
            <Link to="/inventory">View all cars</Link>
          </Button>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {vehicles.slice(0, 3).map((vehicle) => (
            <VehicleCard key={vehicle.id} vehicle={vehicle} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-24">
        <div className="mb-10">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-mirage-cyan">
            Software Core
          </p>
          <h2 className="mt-3 text-4xl font-bold text-white md:text-5xl">
            The software that drives the shop.
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {capabilities.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                to={item.to}
                className="group border border-mirage-border bg-mirage-panel p-6 transition hover:-translate-y-1 hover:border-mirage-cyan/40 hover:bg-mirage-secondary"
              >
                <Icon className="text-mirage-cyan" size={24} />
                <h3 className="mt-8 flex items-center justify-between gap-3 text-xl font-semibold">
                  {item.label}
                  <ArrowRight size={16} className="text-mirage-muted transition group-hover:translate-x-1 group-hover:text-mirage-cyan" />
                </h3>
                <p className="mt-3 text-sm leading-6 text-mirage-muted">{item.text}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-24">
        <div className="grid gap-10 border-y border-mirage-border py-16 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-mirage-orange">
              Operating Loop
            </p>
            <h2 className="mt-3 text-4xl font-bold text-white md:text-5xl">
              From neglected car to Mirage-ready inventory.
            </h2>
            <p className="mt-5 text-sm leading-7 text-mirage-muted">
              The vehicle business pressure-tests the product. Mirage-owned
              refurbishments, select customer repair and maintenance work,
              instant updates, and future consumer software all share the same
              operational backbone.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {operatingLoops.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="border border-white/[0.06] bg-mirage-secondary p-5">
                  <Icon className="text-mirage-pink" size={22} />
                  <h3 className="mt-6 text-xl font-semibold">{item.label}</h3>
                  <p className="mt-3 text-sm leading-6 text-mirage-muted">{item.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-24">
        <div className="grid gap-8 border border-white/[0.06] bg-mirage-secondary p-6 md:grid-cols-[1fr_auto] md:items-center md:p-8">
          <div className="flex gap-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-mirage-cyan/30 bg-mirage-cyan/10 text-mirage-cyan">
              <FileText size={22} />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-mirage-cyan">
                Buyer Toolkit
              </p>
              <h2 className="mt-3 text-3xl font-bold text-white">
                Used car inspection checklist.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-mirage-muted">
                A printable, high-level walkaround and test-drive guide for
                anyone looking at a used car before they hand over money.
              </p>
            </div>
          </div>
          <Button asChild variant="secondary">
            <a href="/resources/used-car-buyer-checklist.pdf">
              Download PDF <Download size={17} />
            </a>
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-24">
        <div className="py-12">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-mirage-pink">
            Build Tracks
          </p>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {["GarageOS Automation", "Telemetry Dashboard", "Investor Prospectus"].map((title) => (
              <Link
                key={title}
                to={title === "Investor Prospectus" ? "/investor-prospectus" : title === "Telemetry Dashboard" ? "/telemetry-dashboard" : "/garage-os"}
                className="group flex min-h-40 flex-col justify-between bg-mirage-secondary p-6 transition hover:bg-mirage-panel"
              >
                <h3 className="text-2xl font-semibold">{title}</h3>
                <span className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-mirage-cyan">
                  Read <ArrowRight size={16} className="transition group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
