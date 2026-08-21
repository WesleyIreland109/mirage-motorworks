import {
  Activity,
  ArrowRight,
  BadgeDollarSign,
  ClipboardCheck,
  Gauge,
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
  { label: "Garage OS", icon: Gauge, text: "Vehicle intake, VIN notes, checklists, repair status, documents, and handoff details in one workspace." },
  { label: "Telemetry Inbox", icon: RadioTower, text: "Recorded drive files become readable sessions with metrics, observations, and report drafts." },
  { label: "Shop Updates", icon: Smartphone, text: "Shareable progress links keep techs, owners, and the garage team aligned without thread archaeology." },
  { label: "Flip Desk", icon: BadgeDollarSign, text: "Track acquisition cost, target sale price, prep work, and margin while the car moves through the shop." },
];

const operatingLoops = [
  { label: "Acquire", icon: Sparkles, text: "Shortlist cars with enthusiast upside, known risks, and a clear resale thesis." },
  { label: "Inspect", icon: Wrench, text: "Turn unknowns into mechanical tasks, measurements, documents, and parts decisions." },
  { label: "Analyze", icon: Activity, text: "Use telemetry and road-test data to support the human inspection instead of replacing it." },
  { label: "Publish", icon: ClipboardCheck, text: "Move the finished car into inventory with a stronger story, cleaner proof, and fewer loose ends." },
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
              Garage Software.
              <br />
              Real Flip Ops.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-zinc-300">
              Mirage Motorworks is an enthusiast garage powered by its own
              operating system: intake, inspections, telemetry, shop updates,
              documents, flip economics, and public inventory in one loop.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Button asChild>
                <Link to="/admin">
                  Open Garage OS <ArrowRight size={17} />
                </Link>
              </Button>
              <Button asChild variant="secondary">
                <Link to="/inventory">View Flip Inventory</Link>
              </Button>
            </div>
          </motion.div>
          <div className="border border-white/[0.06] bg-mirage-surface/60 p-5 shadow-glass backdrop-blur-md">
            <div className="h-px w-full bg-mirage-gradient opacity-70" />
            <p className="text-xs uppercase tracking-[0.24em] text-mirage-muted">
              Current Focus
            </p>
            <p className="mt-4 text-3xl font-semibold leading-tight">
              Built for manual cars, limited models, affordable enthusiast
              flips, and OEM+ prep that needs better software than a notes app.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-24">
        <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-mirage-pink">
              Flip Inventory
            </p>
            <h2 className="mt-3 text-4xl font-bold text-white md:text-5xl">
              The cars are the proving ground.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-mirage-muted">
              Every listing starts as an operating record: acquisition thesis,
              inspection notes, repair decisions, telemetry context, documents,
              and margin targets before it becomes a public page.
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
            Product Surface
          </p>
          <h2 className="mt-3 text-4xl font-bold text-white md:text-5xl">
            What Garage OS is built to run.
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {capabilities.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="border border-mirage-border bg-mirage-panel p-6">
                <Icon className="text-mirage-cyan" size={24} />
                <h3 className="mt-8 text-xl font-semibold">{item.label}</h3>
                <p className="mt-3 text-sm leading-6 text-mirage-muted">{item.text}</p>
              </div>
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
              From rough lead to sellable story.
            </h2>
            <p className="mt-5 text-sm leading-7 text-mirage-muted">
              The flipping side stays core: Mirage uses real cars to pressure
              test the software, expose messy shop handoffs, and prove that
              better records create better decisions.
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
        <div className="py-12">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-mirage-pink">
            Product Notes
          </p>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {["Telemetry Dashboard", "Mobile Shop Updates", "Flip Economics"].map((title) => (
              <Link
                key={title}
                to="/journal"
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
