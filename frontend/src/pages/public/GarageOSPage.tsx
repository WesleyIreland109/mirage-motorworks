import {
  ArrowRight,
  BellRing,
  Check,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Gauge,
  PackageCheck,
  RefreshCw,
  Share2,
  Users,
  Wrench,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { GradientProgress } from "@/components/GradientProgress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  {
    label: "Shared Garage",
    icon: Users,
    text: "Invite another owner to a personal vehicle so questionnaire answers, workflows, service notes, and completed jobs stay synchronized.",
  },
];

const serviceSteps = [
  {
    label: "Intake verified",
    owner: "Service writer",
    update: "VIN, RO, mileage, concern list, and arrival photos are attached.",
  },
  {
    label: "Inspection complete",
    owner: "Lead mechanic",
    update: "Lift inspection finished. Cooling, tires, brakes, leaks, and scan notes logged.",
  },
  {
    label: "Parts staged",
    owner: "Parts desk",
    update: "OEM+ cooling service parts staged; brake measurements are waiting for final review.",
  },
  {
    label: "Repair underway",
    owner: "Bay 02",
    update: "Cooling refresh started. Old hoses removed, hardware bagged, photos attached.",
  },
  {
    label: "Road test queued",
    owner: "QA",
    update: "After final torque check, the car moves to road test, telemetry capture, and detail.",
  },
];

const sharedGarageTasks = [
  {
    label: "Ownership questionnaire",
    status: "Complete",
    note: "Atlas use case, maintenance priorities, trip plans, and concern list captured.",
  },
  {
    label: "Brake inspection",
    status: "In progress",
    note: "Pad measurements and photos added. Co-owner can see the active inspection note.",
  },
  {
    label: "Oil service",
    status: "Queued",
    note: "OEM filter and correct-spec oil selected from the workflow recommendation.",
  },
  {
    label: "Road test",
    status: "Waiting",
    note: "Completion will automatically update the shared vehicle timeline.",
  },
];

export function GarageOSPage() {
  const [completedSteps, setCompletedSteps] = useState(2);
  const currentStep = serviceSteps[Math.min(completedSteps, serviceSteps.length - 1)];
  const progress = Math.round((completedSteps / serviceSteps.length) * 100);
  const publicNotes = useMemo(
    () => serviceSteps.slice(0, completedSteps).map((step) => step.update),
    [completedSteps],
  );

  const completeNextStep = () => {
    setCompletedSteps((current) => Math.min(serviceSteps.length, current + 1));
  };

  const resetDemo = () => setCompletedSteps(2);

  useEffect(() => {
    if (window.location.hash === "#instant-updates") {
      document
        .getElementById("instant-updates")
        ?.scrollIntoView({ block: "start" });
    }
  }, []);

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
            refurbishing, documenting, servicing, and selling enthusiast cars.
            The point is simple: make the shop faster, cleaner, and more
            transparent through automation and instant updates.
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
            A car should never be waiting, because the next step is buried in a
            text, a notebook, or someone&apos;s memory.
          </p>
        </div>
      </section>

      <section className="grid gap-4 py-16 md:grid-cols-2 lg:grid-cols-5">
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

      <section className="grid gap-8 border-y border-mirage-border py-16 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-mirage-pink">
            Shared Personal Garage
          </p>
          <h2 className="mt-3 text-4xl font-bold text-white md:text-5xl">
            One owned car, one live maintenance record, multiple people in the loop.
          </h2>
          <p className="mt-5 text-sm leading-7 text-mirage-muted">
            GarageOS is not only for Mirage inventory or customer repair jobs.
            A personal garage vehicle can be shared with another owner so both
            people see the questionnaire, generated workflow, active jobs,
            service notes, photos, and completed work as the car moves forward.
          </p>
          <p className="mt-5 border-l border-mirage-cyan pl-5 text-lg leading-8 text-zinc-300">
            If the Atlas is in the garage, the person working on it can complete
            the checklist while the other owner sees progress automatically
            instead of waiting for scattered texts or a verbal recap.
          </p>
        </div>

        <div className="border border-white/[0.06] bg-mirage-panel p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-mirage-muted">
                My Garage
              </p>
              <h3 className="mt-2 text-3xl font-semibold">Volkswagen Atlas</h3>
              <p className="mt-2 text-sm text-mirage-muted">
                Family maintenance workflow
              </p>
            </div>
            <div className="flex items-center gap-2 border border-mirage-cyan/25 bg-mirage-cyan/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-mirage-cyan">
              <Share2 size={15} />
              Shared
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              ["Questionnaire", "Complete"],
              ["Shared With", "Co-owner"],
              ["Active Jobs", "4"],
            ].map(([label, value]) => (
              <div key={label} className="bg-mirage-bg/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mirage-muted">
                  {label}
                </p>
                <p className="mt-3 text-lg font-semibold text-white">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 space-y-3">
            {sharedGarageTasks.map((task) => (
              <article key={task.label} className="border border-white/[0.06] bg-mirage-bg/50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h4 className="font-semibold text-white">{task.label}</h4>
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-mirage-cyan">
                    {task.status}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-mirage-muted">{task.note}</p>
              </article>
            ))}
          </div>

          <div className="mt-6 border border-mirage-cyan/20 bg-[#071016]/85 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mirage-cyan">
              Shared update
            </p>
            <p className="mt-3 text-sm leading-6 text-zinc-300">
              Atlas update: brake inspection is in progress. Measurements,
              notes, and photos are attached in GarageOS.
            </p>
          </div>
        </div>
      </section>

      <section id="instant-updates" className="grid scroll-mt-28 gap-8 border-y border-mirage-border py-16 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-mirage-orange">
            Service-Side Sample
          </p>
          <h2 className="mt-3 text-4xl font-bold text-white">
            A repair workflow that updates the report as the mechanic works.
          </h2>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-mirage-muted">
            This is the concept for a Camaro undergoing repair/restoration:
            the mechanic advances shop steps, GarageOS updates the internal
            status, and the shareable progress report changes automatically for
            the garage team or customer.
          </p>
          <div className="mt-8 border border-white/[0.06] bg-mirage-panel p-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-mirage-muted">
                  2013 Chevrolet Camaro 2SS
                </p>
                <h3 className="mt-2 text-2xl font-semibold">Cooling refresh + restoration prep</h3>
              </div>
              <p className="font-display text-4xl font-bold">{progress}%</p>
            </div>
            <GradientProgress
              value={progress}
              heightClassName="h-3"
              className="mt-5"
              ariaLabel="Camaro prep progress"
              animate={false}
            />
            <div className="mt-6 grid gap-3">
              {serviceSteps.map((step, index) => {
                const isDone = index < completedSteps;
                const isActive = index === completedSteps;
                return (
                  <button
                    key={step.label}
                    type="button"
                    className={cn(
                      "grid gap-3 border border-white/[0.06] bg-mirage-bg/50 p-4 text-left transition sm:grid-cols-[34px_1fr_auto] sm:items-center",
                      isActive && "border-mirage-cyan/50 bg-mirage-cyan/10",
                      isDone && "border-emerald-300/20",
                    )}
                    onClick={() => setCompletedSteps(index + 1)}
                  >
                    <span
                      className={cn(
                        "grid size-8 place-items-center border border-white/10 text-xs font-bold",
                        isDone ? "bg-emerald-300 text-black" : "text-mirage-muted",
                      )}
                    >
                      {isDone ? <Check size={16} /> : index + 1}
                    </span>
                    <span>
                      <span className="block font-medium text-white">{step.label}</span>
                      <span className="mt-1 block text-sm leading-6 text-mirage-muted">{step.update}</span>
                    </span>
                    <span className="text-xs uppercase tracking-[0.18em] text-mirage-muted">
                      {step.owner}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button type="button" onClick={completeNextStep} disabled={completedSteps === serviceSteps.length}>
                <CheckCircle2 size={17} />
                Complete next step
              </Button>
              <Button type="button" variant="secondary" onClick={resetDemo}>
                <RefreshCw size={16} />
                Reset sample
              </Button>
            </div>
          </div>
        </div>

        <aside className="h-fit border border-mirage-cyan/20 bg-[#071016]/85 p-5 shadow-[0_0_70px_rgba(34,211,238,.12)] lg:sticky lg:top-28">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-mirage-cyan">
            Auto-Generated Public Report
          </p>
          <h3 className="mt-3 text-2xl font-semibold">The Camaro is {progress}% through prep.</h3>
          <p className="mt-3 text-sm leading-6 text-mirage-muted">
            Current shop status: {currentStep.update}
          </p>
          <div className="mt-5 space-y-3">
            {publicNotes.map((note) => (
              <div key={note} className="border-l border-mirage-cyan/60 pl-3 text-sm leading-6 text-zinc-300">
                {note}
              </div>
            ))}
          </div>
          <div className="mt-6 border border-white/[0.06] bg-black/20 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mirage-muted">
              Text-ready update
            </p>
            <p className="mt-3 text-sm leading-6 text-zinc-300">
              Mirage Motorworks: Camaro prep is {progress}% complete. Shop notes updated:
              miragemw.com/updates/2013-chevrolet-camaro-2ss
            </p>
          </div>
          <Button asChild className="mt-5 w-full" variant="secondary">
            <Link to="/updates/2013-chevrolet-camaro-2ss">View current update page</Link>
          </Button>
        </aside>
      </section>

      <section className="grid gap-6 py-14 lg:grid-cols-3">
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
