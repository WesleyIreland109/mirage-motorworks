import {
  ArrowDown,
  ArrowRight,
  Car,
  ClipboardCheck,
  Cpu,
  Database,
  Gauge,
  PiggyBank,
  RadioTower,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wrench,
} from "lucide-react";
import { Link } from "react-router-dom";

import { GradientProgress } from "@/components/GradientProgress";
import { Button } from "@/components/ui/button";
import { assetPath } from "@/lib/assets";
import { formatCurrency } from "@/lib/utils";

const capitalTarget = 10000;

const allocations = [
  {
    label: "Vehicle Acquisition",
    capital: 4000,
    percent: 40,
    text: "Primary acquisition capital for the first enthusiast vehicle. This is the target purchase budget, not a requirement to spend exactly $4,000. Buying below budget improves the economics of the first cycle and leaves additional capital available for subsequent inventory.",
  },
  {
    label: "Mechanical Repairs",
    capital: 1500,
    percent: 15,
    text: "Budget for known repairs, preventative maintenance, fluids, tires, brakes, and other work required to make the vehicle mechanically sound.",
  },
  {
    label: "Contingency Reserve",
    capital: 1500,
    percent: 15,
    text: "Reserved capital for problems discovered after acquisition. This protects the business from having to sell an unfinished vehicle or seek additional funding because of one unexpected repair.",
  },
  {
    label: "Operating Capital",
    capital: 2000,
    percent: 20,
    text: "Working capital retained by Mirage Motorworks for detailing, parts, listing preparation, registration-related expenses, and maintaining liquidity between purchase and sale.",
  },
  {
    label: "Insurance",
    capital: 500,
    percent: 5,
    text: "Initial insurance reserve associated with holding and operating inventory.",
  },
  {
    label: "Transportation",
    capital: 500,
    percent: 5,
    text: "Vehicle pickup, towing, fuel, transport, or other acquisition-related logistics.",
  },
];

const allocationTotal = allocations.reduce((sum, item) => sum + item.capital, 0);
const allocationPercentTotal = allocations.reduce((sum, item) => sum + item.percent, 0);

const cycle = {
  acquisition: 4000,
  repairs: 850,
  fees: 450,
  targetSale: 7200,
};

const deployedCapital = cycle.acquisition + cycle.repairs + cycle.fees;
const grossProfit = cycle.targetSale - deployedCapital;
const returnOnDeployedCapital = (grossProfit / deployedCapital) * 100;
const investorSharePercent = 50;
const investorExampleReturn = grossProfit * (investorSharePercent / 100);
const investorExampleReturnPercent = (investorExampleReturn / capitalTarget) * 100;

const processSteps = ["Invest", "Acquire", "Restore", "Market", "Sell", "Reinvest"];

const softwareProofCards = [
  {
    title: "GarageOS Proof",
    icon: Cpu,
    text: "Every funded vehicle becomes a real workflow for intake, approvals, parts decisions, checklist completion, status changes, and customer-facing updates.",
  },
  {
    title: "Telemetry Data",
    icon: RadioTower,
    text: "Road tests and diagnostic sessions create vehicle data that can shape future dashboards, automated alerts, and in-car monitoring concepts.",
  },
  {
    title: "Software Dataset",
    icon: Database,
    text: "The work creates a practical dataset around repairs, prep timelines, costs, communication events, and sale readiness instead of guessing from theory.",
  },
];

const productShowcases = [
  {
    title: "GarageOS Service Updates",
    eyebrow: "Workflow Demo",
    text: "A mechanic-facing process can become a customer or team update automatically: current stage, completed work, notes, next steps, and a clean link that can be sent by text.",
    to: "/garage-os#instant-updates",
  },
  {
    title: "Telemetry Dashboard",
    eyebrow: "Live Data Preview",
    text: "Recorded drives become readable sessions with RPM, speed, voltage, load, fuel, and diagnostic context that can be shaped by vehicle and customer taste.",
    to: "/telemetry-dashboard",
    image: assetPath("telemetry/live-dashboard.png"),
    alt: "Live Mirage telemetry dashboard with green performance metrics",
  },
  {
    title: "In-Car Device Concept",
    eyebrow: "Hardware Direction",
    text: "The in-car display concept turns backend telemetry into a driver-facing experience while still feeding the data layer that can catch obvious vehicle issues.",
    to: "/telemetry-dashboard",
    image: assetPath("telemetry/type-r-concept.png"),
    alt: "Type R interior concept with auxiliary Mirage telemetry display",
  },
];

const selectionCards = [
  {
    title: "Enthusiast Appeal",
    icon: Sparkles,
    text: "Cars with identity, community, nostalgia, or an interesting ownership experience.",
  },
  {
    title: "Value Opportunity",
    icon: Gauge,
    text: "Vehicles where condition, presentation, deferred maintenance, or seller circumstances create a meaningful gap between acquisition cost and potential resale value.",
  },
  {
    title: "Controlled Downside",
    icon: ShieldCheck,
    text: "Preference for vehicles where the purchase price itself provides margin for error.",
  },
  {
    title: "OEM+ Restoration",
    icon: Wrench,
    text: "Improve safety, reliability, presentation, and driving experience without destroying what makes the vehicle desirable.",
  },
];

export function InvestorProspectusPage() {
  return (
    <main className="mx-auto max-w-7xl px-5 pb-24 pt-36">
      <section className="relative overflow-hidden border-b border-mirage-border pb-16">
        <div className="star-field absolute inset-0 opacity-25" />
        <div className="atmospheric-grain absolute inset-0 opacity-[0.05]" />
        <div className="relative grid gap-10 lg:grid-cols-[1fr_380px] lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-mirage-pink">
              Mirage Motorworks // Investor Prospectus
            </p>
            <h1 className="mt-4 max-w-5xl text-6xl font-black leading-none tracking-tight md:text-8xl">
              $10,000 Seed Round
            </h1>
            <p className="mt-7 max-w-3xl text-lg leading-8 text-mirage-muted">
              Building a repeatable enthusiast-car acquisition, restoration,
              and resale operation - one carefully selected car at a time.
            </p>
            <div className="mt-9 flex flex-wrap gap-4">
              <Button asChild>
                <a href="#capital-allocation">
                  View the Numbers <ArrowDown size={17} />
                </a>
              </Button>
              <Button asChild variant="secondary">
                <Link to="/contact">Discuss Investment</Link>
              </Button>
            </div>
          </div>
          <aside className="border border-white/[0.06] bg-mirage-panel/90 p-6 shadow-glass backdrop-blur-md">
            <div className="h-px bg-mirage-gradient" />
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.22em] text-mirage-muted">
              Capital Sought
            </p>
            <p className="mt-4 font-display text-6xl font-bold text-white">
              {formatCurrency(capitalTarget)}
            </p>
            <p className="mt-4 text-sm leading-6 text-mirage-muted">
              One operating pool for the first acquisition cycle, repair
              reserve, presentation work, and the software-backed process that
              makes each car easier to understand.
            </p>
          </aside>
        </div>
      </section>

      <section id="capital-allocation" className="scroll-mt-28 py-16">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-mirage-cyan">
              The $10,000 Capital Pool
            </p>
            <h2 className="mt-3 text-4xl font-bold text-white md:text-5xl">
              Where the $10,000 goes.
            </h2>
            <p className="mt-5 text-sm leading-7 text-mirage-muted">
              The raise is a working capital pool. It gives Mirage room to buy
              carefully, repair correctly, handle surprises, and keep liquidity
              available for the next acquisition.
            </p>
            <div className="mt-8 border border-white/[0.06] bg-mirage-panel p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-mirage-muted">
                Allocation Total
              </p>
              <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
                <p className="font-display text-5xl font-bold">
                  {formatCurrency(allocationTotal)}
                </p>
                <p className="font-display text-4xl font-bold text-mirage-cyan">
                  {allocationPercentTotal}%
                </p>
              </div>
              <GradientProgress
                value={allocationPercentTotal}
                ariaLabel="Total raise allocation percentage"
                className="mt-6"
              />
            </div>
          </div>

          <div className="grid gap-4">
            {allocations.map((item) => (
              <article key={item.label} className="border border-mirage-border bg-mirage-panel p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-2xl">
                    <h3 className="text-xl font-semibold">{item.label}</h3>
                    <p className="mt-2 text-sm leading-6 text-mirage-muted">{item.text}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-3xl font-bold">{formatCurrency(item.capital)}</p>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mirage-cyan">
                      {item.percent}%
                    </p>
                  </div>
                </div>
                <GradientProgress
                  value={item.percent}
                  heightClassName="h-2"
                  className="mt-5"
                  ariaLabel={`${item.label} allocation percentage`}
                />
              </article>
            ))}
            <article className="border border-dashed border-white/15 bg-mirage-bg/50 p-5">
              <h3 className="text-xl font-semibold">Tools & Equipment</h3>
              <p className="mt-2 text-sm leading-6 text-mirage-muted">
                Existing Infrastructure - $0 from Raise. Core tools, diagnostic
                equipment, workspace, software development capability, and much
                of the required equipment are already available to Mirage
                Motorworks.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="border-y border-mirage-border py-16">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-mirage-orange">
              Capital Allocation Summary
            </p>
            <h2 className="mt-3 text-4xl font-bold text-white">
              The raise balances purchase power with repair discipline.
            </h2>
          </div>
          <div className="bg-mirage-gradient p-px">
            <div className="bg-mirage-bg px-5 py-3">
              <p className="font-display text-3xl font-bold">
                {formatCurrency(allocationTotal)} / {allocationPercentTotal}%
              </p>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto border border-mirage-border bg-mirage-panel">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-mirage-border text-xs uppercase tracking-[0.2em] text-mirage-muted">
              <tr>
                <th className="px-5 py-4 font-semibold">Allocation</th>
                <th className="px-5 py-4 text-right font-semibold">Capital</th>
                <th className="px-5 py-4 text-right font-semibold">%</th>
              </tr>
            </thead>
            <tbody>
              {allocations.map((item) => (
                <tr key={item.label} className="border-b border-white/[0.04]">
                  <td className="px-5 py-4 text-zinc-200">{item.label}</td>
                  <td className="px-5 py-4 text-right font-medium">{formatCurrency(item.capital)}</td>
                  <td className="px-5 py-4 text-right text-mirage-cyan">{item.percent}%</td>
                </tr>
              ))}
              <tr className="bg-mirage-secondary text-lg font-bold">
                <td className="px-5 py-5">Total</td>
                <td className="px-5 py-5 text-right">{formatCurrency(allocationTotal)}</td>
                <td className="px-5 py-5 text-right text-mirage-cyan">{allocationPercentTotal}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="py-16">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-mirage-cyan">
              Software Proof Loop
            </p>
            <h2 className="mt-3 text-4xl font-bold text-white md:text-5xl">
              The first car proves more than resale economics.
            </h2>
            <p className="mt-5 text-lg leading-9 text-mirage-muted">
              This raise is also a chance to prove that the Mirage software
              stack works under real shop pressure. Each acquisition,
              inspection, repair, telemetry session, update, and sale creates
              operational data that can compound into the eventual growth of
              GarageOS, telemetry hardware, customer apps, and future Mirage
              software products.
            </p>
            <p className="mt-6 border-l border-mirage-pink pl-5 text-2xl font-semibold">
              The car is the visible asset. The repeatable data loop is the
              long-term advantage.
            </p>
          </div>
          <div className="grid gap-4">
            {softwareProofCards.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="border border-mirage-border bg-mirage-panel p-6">
                  <Icon className="text-mirage-cyan" size={24} />
                  <h3 className="mt-7 text-xl font-semibold">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-mirage-muted">{item.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-y border-mirage-border py-16">
        <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-mirage-orange">
              Product Demonstration Surface
            </p>
            <h2 className="mt-3 max-w-4xl text-4xl font-bold text-white md:text-5xl">
              The software should be seen, not just described.
            </h2>
            <p className="mt-5 max-w-3xl text-sm leading-7 text-mirage-muted">
              Mirage can use the same product-marketing motion that great
              software companies use: polished previews, believable workflows,
              live sample links, and visible proof that the garage is becoming a
              product engine.
            </p>
          </div>
          <Button asChild variant="secondary">
            <Link to="/garage-os">
              View GarageOS <ArrowRight size={17} />
            </Link>
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {productShowcases.map((item) => (
            <Link
              key={item.title}
              to={item.to}
              className="group overflow-hidden border border-white/[0.06] bg-mirage-panel transition hover:-translate-y-1 hover:border-mirage-cyan/40 hover:bg-mirage-secondary"
            >
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.alt}
                  className="aspect-[16/10] w-full object-cover object-top"
                />
              ) : (
                <div className="bg-[#071016] p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-mirage-cyan">
                        2013 Chevrolet Camaro 2SS
                      </p>
                      <h3 className="mt-2 text-2xl font-semibold text-white">
                        Prep update
                      </h3>
                    </div>
                    <p className="font-display text-4xl font-bold text-white">60%</p>
                  </div>
                  <GradientProgress
                    value={60}
                    heightClassName="h-3"
                    className="mt-5"
                    ariaLabel="Sample Camaro prep update progress"
                    animate={false}
                  />
                  <div className="mt-5 space-y-3">
                    {[
                      "Cooling refresh started and documented.",
                      "Parts staged with OEM+ preference noted.",
                      "Road test and telemetry capture queued.",
                    ].map((note) => (
                      <p key={note} className="border-l border-mirage-cyan/60 pl-3 text-sm leading-6 text-zinc-300">
                        {note}
                      </p>
                    ))}
                  </div>
                </div>
              )}
              <div className="p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-mirage-pink">
                  {item.eyebrow}
                </p>
                <h3 className="mt-3 flex items-center justify-between gap-4 text-2xl font-semibold">
                  {item.title}
                  <ArrowRight size={17} className="shrink-0 text-mirage-muted transition group-hover:translate-x-1 group-hover:text-mirage-cyan" />
                </h3>
                <p className="mt-3 text-sm leading-7 text-mirage-muted">{item.text}</p>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ["Demoable", "Investors can click through the garage workflow instead of reading only abstract claims."],
            ["Automated", "Each repair step can create internal status, external updates, and cleaner operating records."],
            ["Expandable", "The same surfaces can become customer portals, technician tools, buyer reports, and hardware companion apps."],
          ].map(([title, text]) => (
            <article key={title} className="bg-mirage-secondary p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-mirage-cyan">{title}</p>
              <p className="mt-4 text-sm leading-7 text-mirage-muted">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="py-16">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-mirage-pink">
          How the Capital Works
        </p>
        <div className="mt-8 flex flex-col gap-3 md:flex-row md:items-center">
          {processSteps.map((step, index) => (
            <div key={step} className="flex flex-col gap-3 md:flex-1 md:flex-row md:items-center">
              <div className="flex min-h-24 items-center justify-center border border-white/[0.06] bg-mirage-panel p-4 text-center font-display text-sm font-bold uppercase tracking-[0.18em] md:flex-1">
                {step}
              </div>
              {index < processSteps.length - 1 && (
                <div className="grid place-items-center text-mirage-muted md:w-8">
                  <ArrowDown className="md:hidden" size={18} />
                  <ArrowRight className="hidden md:block" size={18} />
                </div>
              )}
            </div>
          ))}
        </div>
        <p className="mt-8 max-w-4xl text-lg leading-9 text-mirage-muted">
          The $10,000 raise establishes a working capital pool rather than
          funding a single disposable purchase. Mirage Motorworks deploys a
          portion of that capital into carefully selected inventory, performs
          the work necessary to improve the vehicle, sells it, and returns the
          resulting capital to the operating pool for the next acquisition.
          That same loop also validates GarageOS and collects the operating data
          needed to build the broader Mirage software business.
        </p>
        <p className="mt-7 border-l border-mirage-cyan pl-5 text-2xl font-semibold">
          The objective is capital velocity - not simply profit on one car.
        </p>
      </section>

      <section className="grid gap-8 border-y border-mirage-border py-16 lg:grid-cols-[1fr_420px]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-mirage-cyan">
            What One Cycle Can Look Like
          </p>
          <h2 className="mt-3 text-4xl font-bold text-white md:text-5xl">
            A disciplined purchase can create a strong deployed-capital return.
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              ["Acquisition", cycle.acquisition],
              ["Repairs & Maintenance", cycle.repairs],
              ["Fees / Miscellaneous", cycle.fees],
            ].map(([label, value]) => (
              <div key={label} className="border border-white/[0.06] bg-mirage-panel p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mirage-muted">{label}</p>
                <p className="mt-4 font-display text-4xl font-bold">{formatCurrency(Number(value))}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {[
              ["Total Capital Deployed", deployedCapital],
              ["Target Sale", cycle.targetSale],
              ["Gross Profit", grossProfit],
            ].map(([label, value]) => (
              <div key={label} className="bg-mirage-secondary p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mirage-muted">{label}</p>
                <p className="mt-4 font-display text-4xl font-bold">{formatCurrency(Number(value))}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-xs leading-6 text-mirage-muted">
            This example illustrates the economics of a potential transaction
            and is not a guarantee of future returns. Actual acquisition costs,
            repair requirements, holding periods, and sale prices will vary by
            vehicle.
          </p>
        </div>
        <aside className="h-fit border border-white/[0.06] bg-mirage-panel p-6 lg:sticky lg:top-28">
          <PiggyBank className="text-mirage-cyan" size={26} />
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.22em] text-mirage-muted">
            Return on Deployed Capital
          </p>
          <p className="mt-3 font-display text-6xl font-bold">
            {returnOnDeployedCapital.toFixed(1)}%
          </p>
          <GradientProgress
            value={returnOnDeployedCapital}
            ariaLabel="Example return on deployed capital"
            className="mt-6"
          />
          <p className="mt-5 text-sm leading-6 text-mirage-muted">
            {formatCurrency(grossProfit)} gross profit divided by{" "}
            {formatCurrency(deployedCapital)} deployed capital.
          </p>
        </aside>
      </section>

      <section className="border-b border-mirage-border py-16">
        <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-mirage-pink">
              Investor Return Example
            </p>
            <h2 className="mt-3 text-4xl font-bold text-white md:text-5xl">
              What that could mean for a $10,000 investor.
            </h2>
            <p className="mt-5 text-sm leading-7 text-mirage-muted">
              Using the same sample vehicle cycle above, if a written agreement
              allocated {investorSharePercent}% of gross profit to the investor,
              the investor&apos;s example payout would be{" "}
              {formatCurrency(investorExampleReturn)}. Against a{" "}
              {formatCurrency(capitalTarget)} capital contribution, that equals
              an illustrative {investorExampleReturnPercent.toFixed(1)}% return
              for that cycle.
            </p>
            <p className="mt-5 border-l border-mirage-orange pl-5 text-xs leading-6 text-mirage-muted">
              This is example math only. It is not a guaranteed return, not a
              final investment term, and not a promise that every vehicle cycle
              will produce the same result. Actual investor economics would need
              to be documented in a written agreement.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <article className="border border-white/[0.06] bg-mirage-panel p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mirage-muted">
                Example Capital
              </p>
              <p className="mt-4 font-display text-4xl font-bold">
                {formatCurrency(capitalTarget)}
              </p>
            </article>
            <article className="border border-white/[0.06] bg-mirage-panel p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mirage-muted">
                Example Gross Profit
              </p>
              <p className="mt-4 font-display text-4xl font-bold">
                {formatCurrency(grossProfit)}
              </p>
            </article>
            <article className="border border-white/[0.06] bg-mirage-panel p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mirage-muted">
                Example Investor Share
              </p>
              <p className="mt-4 font-display text-4xl font-bold">
                {investorSharePercent}%
              </p>
            </article>
            <article className="border border-mirage-cyan/25 bg-mirage-secondary p-5">
              <div className="flex items-center gap-3 text-mirage-cyan">
                <TrendingUp size={22} />
                <p className="text-xs font-semibold uppercase tracking-[0.18em]">
                  Example Return
                </p>
              </div>
              <p className="mt-4 font-display text-5xl font-bold">
                {investorExampleReturnPercent.toFixed(1)}%
              </p>
              <GradientProgress
                value={investorExampleReturnPercent}
                heightClassName="h-2"
                className="mt-5"
                ariaLabel="Illustrative investor return percentage"
              />
              <p className="mt-4 text-sm leading-6 text-mirage-muted">
                {formatCurrency(investorExampleReturn)} example payout on{" "}
                {formatCurrency(capitalTarget)}.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="py-16">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-mirage-orange">
          Why the Reserve Matters
        </p>
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <article className="border border-white/[0.06] bg-mirage-panel p-6">
            <p className="font-display text-4xl font-bold">{formatCurrency(4000)} Available</p>
            <div className="mt-6 space-y-4 text-sm leading-7 text-mirage-muted">
              <p>Buy the car.</p>
              <p>
                Then immediately become dependent on the sale or additional
                personal capital when the vehicle needs repairs.
              </p>
            </div>
          </article>
          <article className="border border-mirage-cyan/25 bg-mirage-secondary p-6">
            <p className="font-display text-4xl font-bold">{formatCurrency(10000)} Available</p>
            <div className="mt-6 grid gap-3 text-sm leading-7 text-zinc-300">
              {[
                "Buy the car.",
                "Repair it correctly.",
                "Absorb unexpected problems.",
                "Prepare and market it properly.",
                "Maintain enough liquidity to avoid being forced into a bad sale.",
              ].map((line) => (
                <p key={line} className="flex gap-3">
                  <ClipboardCheck className="mt-1 shrink-0 text-mirage-cyan" size={16} />
                  {line}
                </p>
              ))}
            </div>
          </article>
        </div>
        <p className="mt-8 border-l border-mirage-orange pl-5 text-2xl font-semibold">
          The reserve allows Mirage Motorworks to make decisions based on the
          car - not desperation for cash flow.
        </p>
      </section>

      <section className="grid gap-8 border-y border-mirage-border py-16 lg:grid-cols-[380px_1fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-mirage-pink">
            Capital Efficiency Example
          </p>
          <h2 className="mt-3 text-4xl font-bold text-white">
            Buying below budget keeps the pool working.
          </h2>
        </div>
        <div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["Target Acquisition Budget", 4000],
              ["Actual Acquisition", 1000],
              ["Acquisition Capital Preserved", 3000],
            ].map(([label, value]) => (
              <div key={label} className="bg-mirage-panel p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mirage-muted">{label}</p>
                <p className="mt-4 font-display text-4xl font-bold">{formatCurrency(Number(value))}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-lg leading-9 text-mirage-muted">
            Finding a viable vehicle substantially below the target acquisition
            budget does not mean the remaining capital must be spent on that
            vehicle. It remains available within the operating pool for repairs,
            contingency, and future acquisitions.
          </p>
          <p className="mt-5 text-sm leading-7 text-mirage-muted">
            Mirage Motorworks should optimize for return on capital deployed,
            not simply chase higher-dollar cars because capital is available.
          </p>
        </div>
      </section>

      <section className="py-16">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-mirage-cyan">
          Vehicle Selection Philosophy
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {selectionCards.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="border border-mirage-border bg-mirage-panel p-6">
                <Icon className="text-mirage-cyan" size={24} />
                <h2 className="mt-7 text-xl font-semibold">{item.title}</h2>
                <p className="mt-3 text-sm leading-6 text-mirage-muted">{item.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="border-y border-mirage-border py-16">
        <div className="mx-auto max-w-5xl text-center">
          <p className="mirage-wordmark text-sm font-semibold uppercase tracking-[0.28em]">
            The Mirage Standard
          </p>
          <blockquote className="mt-6 text-4xl font-black leading-tight md:text-6xl">
            A car we&apos;d let our family drive with our baby in the back.
          </blockquote>
          <p className="mt-8 text-lg leading-9 text-mirage-muted">
            Mirage Motorworks is not built around hiding problems and passing
            them to the next buyer. Before a vehicle is offered for sale, the
            goal is to understand it, address meaningful safety and reliability
            concerns, document the work performed, and present the buyer with an
            enthusiast vehicle we are comfortable putting our name behind.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="border border-white/[0.06] bg-mirage-panel p-6 md:p-8">
          <RotateCcw className="text-mirage-pink" size={28} />
          <p className="mt-6 max-w-4xl font-display text-5xl font-bold leading-none md:text-7xl">
            Buy Right.
            <br />
            Fix Right.
            <br />
            Sell Right.
            <br />
            Repeat.
          </p>
          <p className="mt-8 max-w-3xl text-lg leading-9 text-mirage-muted">
            Mirage Motorworks is designed to grow through disciplined
            acquisition and repeated reinvestment rather than maximizing the
            amount spent on any individual vehicle.
          </p>
        </div>
      </section>

      <section className="border-y border-mirage-border py-16">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-mirage-muted">
          Investment Risk
        </p>
        <div className="mt-6 max-w-4xl space-y-5 text-sm leading-7 text-mirage-muted">
          <p>
            Automotive resale involves meaningful financial risk. Vehicles may
            require repairs that were not identifiable before purchase. Market
            values can change. Vehicles may take longer than expected to sell,
            and actual sale prices may differ materially from estimates.
          </p>
          <p>
            The financial examples presented in this prospectus are planning
            scenarios rather than guaranteed returns. Investment terms,
            repayment structure, profit participation, ownership rights, and
            other investor obligations should be defined in a separate written
            investment agreement.
          </p>
        </div>
      </section>

      <section className="pt-16">
        <div className="grid gap-8 border border-mirage-cyan/20 bg-mirage-secondary p-6 md:p-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <Car className="text-mirage-cyan" size={28} />
            <p className="mt-6 text-sm font-semibold uppercase tracking-[0.28em] text-mirage-pink">
              Mirage Motorworks
            </p>
            <h2 className="mt-3 text-5xl font-black leading-none md:text-7xl">
              $10,000 Seed Capital
            </h2>
            <p className="mt-5 text-lg leading-8 text-mirage-muted">
              One pool of capital. Carefully selected cars. Repeated cycles.
            </p>
          </div>
          <Button asChild>
            <Link to="/contact">
              Discuss the Investment <ArrowRight size={17} />
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
