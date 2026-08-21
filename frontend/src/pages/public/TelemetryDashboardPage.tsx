import { Activity, Bot, ExternalLink, FileText, Gauge, RadioTower, Share2 } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";

const telemetryCards = [
  ["Import", "Upload recorded drive files and attach them to the right car record."],
  ["Analyze", "Summarize OBD ranges, session health, detected vehicle data, and observations."],
  ["Report", "Draft readable drive reports that support the mechanical inspection."],
  ["Share", "Publish owner, team, or public links with the right visibility."],
];

const sampleReportUrl = "https://miragemw.com/drive-reports/d8efd4f5b02d48cb85ac221af3967252";

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

      <section className="mt-16 grid gap-8 border-y border-mirage-border py-16 lg:grid-cols-[0.95fr_1.05fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-mirage-cyan">
            Sample Pages
          </p>
          <h2 className="mt-3 text-4xl font-bold text-white">
            From raw drive to shareable report.
          </h2>
          <p className="mt-5 text-sm leading-7 text-mirage-muted">
            The telemetry workflow should create two useful surfaces: an
            internal dashboard for the shop and a polished report link for
            customers, owners, buyers, or the Mirage team.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild>
              <a href={sampleReportUrl} target="_blank" rel="noreferrer">
                Open sample report <ExternalLink size={16} />
              </a>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/garage-os#instant-updates">See GarageOS update sample</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-5">
          <article className="border border-white/[0.06] bg-mirage-panel p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-mirage-muted">
                  Internal Telemetry View
                </p>
                <h3 className="mt-2 text-2xl font-semibold">Dacoit drive summary</h3>
              </div>
              <RadioTower className="text-mirage-cyan" />
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {[
                ["Samples", "12,480"],
                ["Metrics", "14"],
                ["Report", "Published"],
              ].map(([label, value]) => (
                <div key={label} className="bg-mirage-bg/60 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-mirage-muted">{label}</p>
                  <p className="mt-2 text-xl font-semibold">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 space-y-3">
              {[
                "Vehicle identity confirmed and attached to the garage record.",
                "OBD data summarized into human-readable ranges and observations.",
                "Report visibility set to link-accessible for concept review.",
              ].map((item) => (
                <p key={item} className="border-l border-mirage-cyan/50 pl-3 text-sm leading-6 text-mirage-muted">
                  {item}
                </p>
              ))}
            </div>
          </article>

          <article className="border border-mirage-cyan/20 bg-[#071016]/85 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-mirage-cyan">
              Published Report Preview
            </p>
            <h3 className="mt-3 text-2xl font-semibold">Readable proof from a road test.</h3>
            <p className="mt-3 text-sm leading-6 text-mirage-muted">
              A report page takes shop telemetry and turns it into a clean,
              shareable record. It should make sense to a mechanic, an owner,
              and a future buyer without exposing raw diagnostic clutter.
            </p>
            <a
              href={sampleReportUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-mirage-cyan hover:text-white"
            >
              View live report <ExternalLink size={15} />
            </a>
          </article>
        </div>
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
