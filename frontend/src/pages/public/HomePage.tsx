import { ArrowRight, ClipboardCheck, FileText, Gauge, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";

import { listVehicles } from "@/api/client";
import { VehicleCard } from "@/components/VehicleCard";
import { Button } from "@/components/ui/button";

const standard = [
  { label: "Selection", icon: Sparkles, text: "Cars chosen for character, condition, and long-term desirability." },
  { label: "Inspection", icon: Gauge, text: "Mechanical review before a vehicle earns the Mirage name." },
  { label: "Documentation", icon: FileText, text: "Records, context, known flaws, and ownership notes organized clearly." },
  { label: "Presentation", icon: ClipboardCheck, text: "Prepared, photographed, and described with editorial care." },
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
              Curated Cars.
              <br />
              Timeless Driving.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-zinc-300">
              Every vehicle is carefully selected, mechanically inspected,
              documented, and prepared before it joins the Mirage collection.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Button asChild>
                <Link to="/inventory">
                  Browse Inventory <ArrowRight size={17} />
                </Link>
              </Button>
              <Button asChild variant="secondary">
                <Link to="/about">Our Process</Link>
              </Button>
            </div>
          </motion.div>
          <div className="border border-white/[0.06] bg-mirage-surface/60 p-5 shadow-glass backdrop-blur-md">
            <div className="h-px w-full bg-mirage-gradient opacity-70" />
            <p className="text-xs uppercase tracking-[0.24em] text-mirage-muted">
              Current Focus
            </p>
            <p className="mt-4 text-3xl font-semibold leading-tight">
              Manual cars, limited models, and affordable enthusiast builds
              prepared with an OEM+ mindset.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-24">
        <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-mirage-pink">
              Featured Inventory
            </p>
            <h2 className="mt-3 text-4xl font-bold text-white md:text-5xl">
              Selected, not stocked.
            </h2>
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
            The Mirage Standard
          </p>
          <h2 className="mt-3 text-4xl font-bold text-white md:text-5xl">
            Our four-step process.
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {standard.map((item) => {
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
        <div className="border-y border-mirage-border py-12">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-mirage-pink">
            Garage Journal
          </p>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {["Buying Guides", "Auction Finds", "Build Stories"].map((title) => (
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
