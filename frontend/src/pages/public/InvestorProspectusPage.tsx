import { ArrowRight, BarChart3, Car, Cpu, Layers, LineChart, Wrench } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";

const thesis = [
  ["Phase 1", "Build Mirage-owned inventory by refurbishing neglected enthusiast cars and proving the operating workflow."],
  ["Phase 2", "Expand garage services, repairs, updates, telemetry reports, and customer-facing software surfaces."],
  ["Phase 3", "Package the software layer into consumer and shop products once the workflow is proven by real cars."],
];

export function InvestorProspectusPage() {
  return (
    <main className="mx-auto max-w-7xl px-5 pb-24 pt-36">
      <section className="grid gap-10 border-b border-mirage-border pb-16 lg:grid-cols-[1fr_380px] lg:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-mirage-pink">
            Investor Prospectus
          </p>
          <h1 className="mt-4 max-w-5xl text-5xl font-black leading-none tracking-tight md:text-7xl">
            A software-led enthusiast car business.
          </h1>
          <p className="mt-7 max-w-3xl text-lg leading-8 text-mirage-muted">
            Mirage Motorworks starts with a real inventory model: source
            neglected enthusiast cars, refurbish them with discipline, and sell
            them under a trusted brand. The larger opportunity is the software
            backbone that automates the work and can become a product itself.
          </p>
          <div className="mt-9 flex flex-wrap gap-4">
            <Button asChild>
              <Link to="/garage-os">
                See GarageOS <ArrowRight size={17} />
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/inventory">View Inventory</Link>
            </Button>
          </div>
        </div>
        <div className="border border-white/[0.06] bg-mirage-panel p-6">
          <LineChart className="text-mirage-cyan" size={28} />
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.22em] text-mirage-muted">
            Business Shape
          </p>
          <p className="mt-4 text-3xl font-semibold leading-tight">
            Inventory revenue, repair work, instant-update workflows, telemetry
            reports, and future software products share the same engine.
          </p>
        </div>
      </section>

      <section className="grid gap-4 py-16 md:grid-cols-3">
        {thesis.map(([phase, text]) => (
          <article key={phase} className="border border-mirage-border bg-mirage-panel p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-mirage-cyan">
              {phase}
            </p>
            <p className="mt-8 text-lg leading-8 text-zinc-300">{text}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 border-y border-mirage-border py-14 lg:grid-cols-2">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-mirage-orange">
            Why Now
          </p>
          <h2 className="mt-4 text-4xl font-bold">Enthusiast cars need trust infrastructure.</h2>
        </div>
        <p className="text-lg leading-9 text-mirage-muted">
          Buyers want proof. Owners want updates. Mechanics need better
          handoffs. Small shops need software that understands actual vehicle
          work. Mirage can prove that product inside its own garage before
          selling it beyond the brand.
        </p>
      </section>

      <section className="grid gap-4 pt-16 md:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Car, title: "Inventory", text: "Refurbished enthusiast cars sold under the Mirage standard." },
          { icon: Wrench, title: "Garage Services", text: "Repairs, prep, road tests, and customer-facing update workflows." },
          { icon: Cpu, title: "Software Core", text: "GarageOS, automation, telemetry, reporting, and operational records." },
          { icon: Layers, title: "Product Expansion", text: "Consumer products and shop software built from proven internal tools." },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.title} className="bg-mirage-secondary p-6">
              <Icon className="text-mirage-pink" size={24} />
              <h2 className="mt-7 text-xl font-semibold">{item.title}</h2>
              <p className="mt-3 text-sm leading-6 text-mirage-muted">{item.text}</p>
            </article>
          );
        })}
      </section>

      <section className="mt-16 border border-white/[0.06] bg-mirage-panel p-6 md:p-8">
        <div className="flex items-center gap-3 text-mirage-cyan">
          <BarChart3 size={22} />
          <p className="text-xs font-semibold uppercase tracking-[0.22em]">
            Operating Advantage
          </p>
        </div>
        <p className="mt-5 max-w-4xl text-3xl font-semibold leading-tight">
          The brand sells cars. The garage creates trust. The software captures
          the process. Together, they create a business that can compound beyond
          a single vehicle sale.
        </p>
      </section>
    </main>
  );
}
