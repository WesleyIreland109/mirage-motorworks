import {
  ArrowRight,
  BellRing,
  ClipboardCheck,
  FileText,
  Gauge,
  PackageCheck,
  Wrench,
} from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";

const modules = [
  {
    label: "Vehicle Intake",
    icon: Gauge,
    text: "Capture VIN, mileage, ownership context, known issues, photos, and the reason the car belongs in the Mirage pipeline.",
  },
  {
    label: "Repair Workflow",
    icon: Wrench,
    text: "Turn inspection findings into tasks, checklists, parts decisions, documents, and bay status without losing the thread.",
  },
  {
    label: "Instant Updates",
    icon: BellRing,
    text: "Generate shareable progress pages for mechanics, owners, and partners so everyone sees the current state immediately.",
  },
  {
    label: "Readiness Record",
    icon: PackageCheck,
    text: "Move from neglected car to Mirage-ready inventory with proof: notes, reports, costs, photos, and final handoff steps.",
  },
];

export function GarageOSPage() {
  return (
    <main className="mx-auto max-w-7xl px-5 pb-24 pt-36">
      <section className="grid gap-10 border-b border-mirage-border pb-16 lg:grid-cols-[1fr_420px] lg:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-mirage-cyan">
            GarageOS
          </p>
          <h1 className="mt-4 max-w-5xl text-5xl font-black leading-none tracking-tight md:text-7xl">
            The operating system behind every Mirage car.
          </h1>
          <p className="mt-7 max-w-3xl text-lg leading-8 text-mirage-muted">
            GarageOS is the internal software layer for sourcing, inspecting,
            refurbishing, documenting, and selling enthusiast cars. The point is
            simple: make the shop faster, cleaner, and more transparent through
            automation and instant updates.
          </p>
          <div className="mt-9 flex flex-wrap gap-4">
            <Button asChild>
              <Link to="/admin">
                Open App <ArrowRight size={17} />
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/telemetry-dashboard">View Telemetry</Link>
            </Button>
          </div>
        </div>
        <div className="border border-white/[0.06] bg-mirage-panel p-6">
          <div className="h-px bg-mirage-gradient" />
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.22em] text-mirage-muted">
            Core Promise
          </p>
          <p className="mt-4 text-3xl font-semibold leading-tight">
            A car should never be waiting because the next step is buried in a
            text, a notebook, or someone&apos;s memory.
          </p>
        </div>
      </section>

      <section className="grid gap-4 py-16 md:grid-cols-2 lg:grid-cols-4">
        {modules.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.label} className="border border-mirage-border bg-mirage-panel p-6">
              <Icon className="text-mirage-cyan" size={24} />
              <h2 className="mt-8 text-xl font-semibold">{item.label}</h2>
              <p className="mt-3 text-sm leading-6 text-mirage-muted">{item.text}</p>
            </article>
          );
        })}
      </section>

      <section className="grid gap-6 border-y border-mirage-border py-14 lg:grid-cols-3">
        {[
          ["Automate", "Status pages, checklists, progress messages, report drafts, and handoffs should be generated from the record."],
          ["Refurbish", "The software is built around neglected enthusiast cars that need inspection, repair, OEM+ decisions, and trust."],
          ["Scale", "The same workflow can support Mirage inventory, customer repair work, future consumer products, and software revenue."],
        ].map(([title, text]) => (
          <div key={title} className="bg-mirage-secondary p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-mirage-pink">
              {title}
            </p>
            <p className="mt-5 text-lg leading-8 text-zinc-300">{text}</p>
          </div>
        ))}
      </section>

      <section className="pt-16">
        <div className="border border-white/[0.06] bg-mirage-panel p-6 md:p-8">
          <div className="flex items-center gap-3 text-mirage-cyan">
            <ClipboardCheck size={22} />
            <FileText size={22} />
          </div>
          <h2 className="mt-6 text-3xl font-semibold">Built from real shop friction.</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-mirage-muted">
            GarageOS is not a generic CRM with car words pasted on top. It is
            shaped by the exact workflow Mirage needs: neglected enthusiast-car
            sourcing, refurbishment, repairs, telemetry-backed road tests,
            instant updates, inventory preparation, and final sales confidence.
          </p>
        </div>
      </section>
    </main>
  );
}
