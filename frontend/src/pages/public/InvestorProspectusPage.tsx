import { ArrowRight, BarChart3, Car, Cpu, Layers, LineChart, Wrench } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";

const thesis = [
  ["Immediate Use", "Investment funds the first Mirage-owned enthusiast car: acquisition, parts, repair labor, photos, listing, and carrying costs."],
  ["Proof Vehicle", "That first build becomes a revenue event and a live demonstration of GarageOS, instant updates, telemetry reports, and operational automation."],
  ["Upside", "The larger incentive is the software and hardware platform being developed behind the garage, which can scale beyond a single car sale."],
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
            Fund the first car. Build the platform behind it.
          </h1>
          <p className="mt-7 max-w-3xl text-lg leading-8 text-mirage-muted">
            Mirage needs investment capital for the first refurbishment: buying
            the car, making it right, documenting it, and selling it under the
            brand. The investor upside is that the car is only the wedge. The
            main long-term opportunity is the software and hardware being built
            to automate the garage, telemetry, instant updates, and customer
            experience.
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
            The first vehicle creates a saleable asset. The platform creates
            the scalable business.
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
          <h2 className="mt-4 text-4xl font-bold">The first build funds proof, not just inventory.</h2>
        </div>
        <p className="text-lg leading-9 text-mirage-muted">
          The initial investment helps Mirage acquire and complete the first
          neglected enthusiast car without starving the software effort. Every
          repair, update, telemetry session, and listing step becomes product
          feedback for GarageOS and the in-car telemetry hardware concept.
        </p>
      </section>

      <section className="grid gap-4 pt-16 md:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Car, title: "First Car", text: "Capital goes into a real asset: an enthusiast car Mirage can refurbish, document, and sell." },
          { icon: Wrench, title: "Garage Proof", text: "The repair process proves update automation, service workflow, and customer communication." },
          { icon: Cpu, title: "Software Core", text: "GarageOS turns the build into repeatable operating software, not a one-off project." },
          { icon: Layers, title: "Hardware + Products", text: "Telemetry hardware and future consumer/shop software become the main scale opportunity." },
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
          The car creates the first proof point. GarageOS captures the workflow.
          Telemetry hardware opens the product lane. That combination is the
          incentive: an investable business that can become much larger than
          refurbishing one vehicle at a time.
        </p>
      </section>
    </main>
  );
}
