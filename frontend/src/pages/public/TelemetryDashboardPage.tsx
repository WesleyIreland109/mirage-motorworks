import { Activity, Bot, FileText, Gauge, RadioTower, Share2 } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";

const telemetryCards = [
  ["Import", "Upload recorded drive files and attach them to the right car record."],
  ["Analyze", "Summarize OBD ranges, session health, detected vehicle data, and observations."],
  ["Report", "Draft readable drive reports that support the mechanical inspection."],
  ["Share", "Publish owner, team, or public links with the right visibility."],
];

export function TelemetryDashboardPage() {
  return (
    <main className="mx-auto max-w-7xl px-5 pb-24 pt-36">
      <section className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-mirage-orange">
            Telemetry Dashboard
          </p>
          <h1 className="mt-4 text-5xl font-black leading-none tracking-tight md:text-7xl">
            Road-test data, translated into shop decisions.
          </h1>
          <p className="mt-7 text-lg leading-8 text-mirage-muted">
            The telemetry dashboard turns recorded drives into usable context:
            vehicle matching, OBD metrics, MirageAI summaries, report drafts,
            and shareable links. It gives the shop another layer of proof before
            a car becomes Mirage-ready inventory.
          </p>
          <div className="mt-9 flex flex-wrap gap-4">
            <Button asChild>
              <Link to="/admin/telemetry">Open Telemetry Inbox</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/garage-os">GarageOS Overview</Link>
            </Button>
          </div>
        </div>
        <div className="border border-mirage-cyan/20 bg-[#071016]/80 p-6 shadow-[0_0_70px_rgba(34,211,238,.12)]">
          <div className="flex items-center gap-3 text-mirage-cyan">
            <RadioTower />
            <span className="text-xs font-semibold uppercase tracking-[0.24em]">
              Live Session Model
            </span>
          </div>
          <div className="mt-8 grid gap-3">
            {[
              ["RPM", "820-6,400", "clean pull"],
              ["Coolant", "181-198 F", "stable"],
              ["Throttle", "0-87%", "responsive"],
              ["OBD Errors", "0.8%", "reviewed"],
            ].map(([label, value, status]) => (
              <div key={label} className="grid grid-cols-[1fr_auto] gap-4 border-b border-white/[0.06] py-3 last:border-0">
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-mirage-muted">{status}</p>
                </div>
                <p className="font-display text-xl text-white">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-20 grid gap-4 md:grid-cols-4">
        {telemetryCards.map(([title, text]) => (
          <article key={title} className="border border-mirage-border bg-mirage-panel p-6">
            <Activity className="text-mirage-cyan" size={22} />
            <h2 className="mt-7 text-xl font-semibold">{title}</h2>
            <p className="mt-3 text-sm leading-6 text-mirage-muted">{text}</p>
          </article>
        ))}
      </section>

      <section className="mt-16 grid gap-6 lg:grid-cols-3">
        {[
          { icon: Bot, title: "MirageAI", text: "Drafts summaries and flags fields that need human confirmation." },
          { icon: Gauge, title: "Diagnostic Context", text: "Telemetry supports inspection notes without pretending to replace a mechanic." },
          { icon: Share2, title: "Instant Report Links", text: "Send a polished update or drive report as soon as the session is reviewed." },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="bg-mirage-secondary p-6">
              <Icon className="text-mirage-pink" size={22} />
              <h2 className="mt-6 text-2xl font-semibold">{item.title}</h2>
              <p className="mt-3 text-sm leading-7 text-mirage-muted">{item.text}</p>
            </div>
          );
        })}
      </section>

      <section className="mt-16 border-y border-mirage-border py-12">
        <div className="flex items-center gap-3 text-mirage-cyan">
          <FileText size={22} />
          <p className="text-xs font-semibold uppercase tracking-[0.22em]">Output</p>
        </div>
        <p className="mt-5 max-w-4xl text-3xl font-semibold leading-tight">
          Better reports create better trust: for the shop, for owners, for
          future buyers, and eventually for software customers.
        </p>
      </section>
    </main>
  );
}
