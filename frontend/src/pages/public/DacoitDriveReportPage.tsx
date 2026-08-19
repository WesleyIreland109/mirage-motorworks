import { Activity } from "lucide-react";

import { Card } from "@/components/ui/card";

const observations = [
  [
    "Observed",
    "Vehicle identity: 2026 Honda Civic, with the captured configuration indicating Sport or Sport Touring. The exact powertrain was not returned directly by OBD.",
  ],
  [
    "Observed",
    "Vehicle speed ranged from 0 to 57.2 mph. The vehicle was moving in approximately 71% of distinct speed samples.",
  ],
  [
    "Observed",
    "Engine speed ranged from 0 to 4,562 RPM. Non-zero RPM appeared in approximately 25% of distinct engine-speed samples.",
  ],
  [
    "Observed",
    "Calculated engine load ranged from 0% to 100%; throttle position ranged from 12.2% to 47.1%.",
  ],
  [
    "Observed",
    "Control-module voltage ranged from 12.47 to 14.55 V and changed between lower and charging-voltage bands during the recordings.",
  ],
  [
    "Inference",
    "Engine-off movement and intermittent charging-voltage behavior are consistent with a hybrid vehicle switching between electric propulsion, gasoline-engine operation, and DC-DC charging. This is an interpretation, not confirmation of powertrain condition.",
  ],
  [
    "Inference",
    "No abrupt loss of the diagnostic connection was recorded; request latency was typically 44 ms and 95% of samples were at or below 51 ms.",
  ],
  [
    "Not measured",
    "Coolant temperature, oil temperature, fuel level, intake temperature, fuel pressure, manifold pressure, emissions trouble codes, tire pressure, braking performance, and hybrid-battery state of health were not available in these sessions.",
  ],
  [
    "Needs inspection",
    "No conclusion should be made about brakes, tires, fluids, leaks, noises, warning lights, service life, or long-term battery health without inspection and broader diagnostic coverage.",
  ],
] as const;

const metrics = [
  ["Vehicle speed", "14.7", "mph", "Observed 0.0–57.2 · 4,698 samples"],
  ["Engine speed", "458.7", "RPM", "Observed 0–4,562 · 4,697 samples"],
  ["Throttle position", "15.8", "%", "Observed 12.2–47.1 · 4,698 samples"],
  ["Calculated engine load", "16.2", "%", "Observed 0–100 · 4,696 samples"],
  [
    "Control-module voltage",
    "12.9",
    "V",
    "Observed 12.47–14.55 · 4,697 samples",
  ],
  [
    "Diagnostic response latency",
    "43.6",
    "ms",
    "Observed 33–65 · 23,482 requests",
  ],
] as const;

export function DacoitDriveReportPage() {
  return (
    <main className="min-h-screen bg-mirage-bg px-5 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold uppercase tracking-[.24em] text-mirage-cyan">
          Mirage Motorworks
        </p>
        <h1 className="mt-3 text-4xl font-semibold sm:text-5xl">
          Mirage Drive Summary — Dacoit&apos;s Civic
        </h1>
        <p className="mt-3 text-mirage-muted">
          2026 Honda Civic Sport / Sport Touring · August 19, 2026
        </p>
        <Card className="mt-8 p-6">
          <div className="flex items-center gap-3">
            <Activity className="text-mirage-cyan" />
            <h2 className="text-xl font-semibold">Drive overview</h2>
          </div>
          <p className="mt-4 leading-7 text-mirage-muted">
            Three genuine OBD-II recordings were reviewed across 19 minutes and
            34 seconds. The adapter completed 23,482 requests without a recorded
            communication error. The available channels show normal-looking
            hybrid driving behavior, but this limited data set cannot establish
            overall mechanical health.
          </p>
          <ul className="mt-6 space-y-4">
            {observations.map(([kind, detail]) => (
              <li
                key={detail}
                className="grid gap-2 border-l border-mirage-cyan pl-4 text-sm leading-6 sm:grid-cols-[130px_1fr]"
              >
                <span className="font-semibold uppercase tracking-[.12em] text-mirage-cyan">
                  {kind}
                </span>
                <span>{detail}</span>
              </li>
            ))}
          </ul>
        </Card>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {metrics.map(([label, value, unit, range]) => (
            <Card key={label} className="p-5">
              <p className="text-xs uppercase tracking-[.16em] text-mirage-muted">
                {label}
              </p>
              <p className="mt-3 text-2xl font-semibold">
                {value}{" "}
                <span className="text-sm text-mirage-muted">{unit}</span>
              </p>
              <p className="mt-2 text-xs text-mirage-muted">{range}</p>
            </Card>
          ))}
        </div>
        <p className="mt-8 border-t border-mirage-border pt-5 text-xs leading-5 text-mirage-muted">
          This summary reflects only data reported through the vehicle&apos;s
          diagnostic interface during the recorded sessions. It is not a safety
          inspection, mechanical diagnosis, warranty determination, or
          substitute for evaluation by a qualified technician.
        </p>
      </div>
    </main>
  );
}
