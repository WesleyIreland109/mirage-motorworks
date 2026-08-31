import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle, HelpCircle } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { getDriveReport } from "@/api/client";
import { Card } from "@/components/ui/card";
import { dacoitDriveReport } from "@/data/demoDriveReports";
import type { MetricAssessment, MetricSummary } from "@/types/fleet";

const metricDescriptions: Record<string, string> = {
  rpm: "Engine speed in revolutions per minute. Idle, warmup, shifting, and rev limit vary by vehicle.",
  vehicle_speed_mph: "Vehicle road speed during the recorded session. Useful context, not a health signal by itself.",
  coolant_temp_f: "Engine coolant temperature. Helpful for spotting warmup behavior or obvious overheating, but it does not replace inspection.",
  oil_temp_f: "Engine oil temperature. Useful when available, especially under load, but normal range varies by engine and oil system.",
  intake_air_temp_f: "Temperature of air entering the engine. Mostly context for weather, heat soak, and boost behavior.",
  ambient_temp_f: "Outside air temperature. Context for interpreting coolant, intake temperature, and HVAC-related behavior.",
  throttle_percent: "How far the throttle was requested or opened. This explains driver demand more than vehicle health.",
  engine_load_percent: "An ECU-calculated estimate of engine load. Useful context for temperature, boost, and fueling readings.",
  battery_voltage: "Voltage reported by the control module. Can show charging behavior or low-voltage clues, depending on vehicle strategy.",
  boost_psi: "Pressure above or below atmospheric pressure in the intake manifold. Negative values usually indicate vacuum.",
  afr: "Air/fuel ratio. For gasoline, around 14.7:1 is stoichiometric, but commanded values change during warmup, load, and acceleration.",
  lambda: "Fueling ratio relative to stoichiometric. 1.00 is stoich; below 1.00 is richer and above 1.00 is leaner.",
  fuel_level_percent: "Fuel tank level reported by the vehicle. Context only unless the reading is implausible.",
  fuel_pressure_psi: "Fuel pressure reported by the vehicle. Expected values depend heavily on fuel-system design.",
  ignition_timing: "Spark timing commanded by the ECU. It changes with load, rpm, temperature, fuel, and knock control.",
  provider_latency_ms: "How long diagnostic requests took to return. This describes adapter/session quality, not vehicle health.",
};

function MetricGauge({ metric, assessment }: { metric: MetricSummary; assessment: MetricAssessment }) {
  const domainLow = Math.min(metric.min, assessment.referenceLow);
  const domainHigh = Math.max(metric.max, assessment.referenceHigh);
  const width = Math.max(domainHigh - domainLow, 0.001);
  const position = (value: number) => Math.max(0, Math.min(100, ((value - domainLow) / width) * 100));
  const color = assessment.status === "within" ? "text-emerald-300" : assessment.status === "mixed" ? "text-amber-200" : "text-red-300";
  return <div className="mt-4">
    <div className="relative h-3 bg-white/10">
      <div className="absolute inset-y-0 bg-emerald-400/30" style={{ left: `${position(assessment.referenceLow)}%`, width: `${position(assessment.referenceHigh) - position(assessment.referenceLow)}%` }}/>
      <div className="absolute inset-y-[-3px] w-0.5 bg-white" style={{ left: `${position(metric.average)}%` }}/>
    </div>
    <div className="mt-2 flex justify-between text-[10px] text-mirage-muted"><span>{assessment.referenceLow} {metric.unit}</span><span>{assessment.referenceHigh} {metric.unit}</span></div>
    <p className={`mt-2 text-xs font-semibold uppercase tracking-[.12em] ${color}`}>{assessment.status === "within" ? "Observed within guidance" : assessment.status === "mixed" ? "Observed range crossed guidance" : "Observed outside guidance"}</p>
    <p className="mt-1 text-[11px] leading-4 text-mirage-muted">{assessment.description}</p>
  </div>;
}

function MetricHelp({ metric }: { metric: MetricSummary }) {
  const description = metricDescriptions[metric.key] ?? "Recorded telemetry value. Interpretation depends on vehicle, sensor support, and driving conditions.";
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-label={`What is ${metric.label}?`}
        className="inline-grid size-5 place-items-center text-mirage-muted transition hover:text-mirage-cyan focus:text-mirage-cyan"
      >
        <HelpCircle size={15} />
      </button>
      <span className="pointer-events-none absolute left-1/2 top-7 z-20 hidden w-64 -translate-x-1/2 border border-mirage-border bg-[#101116] p-3 text-xs leading-5 text-mirage-muted shadow-xl group-hover:block group-focus-within:block">
        {description}
      </span>
    </span>
  );
}

function MetricCard({ metric, assessment }: { metric: MetricSummary; assessment?: MetricAssessment }) {
  return (
    <Card key={metric.key} className="p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs uppercase tracking-[.16em] text-mirage-muted">
          {metric.label}
        </p>
        <MetricHelp metric={metric} />
      </div>
      <p className="mt-3 text-2xl font-semibold">
        {metric.average.toFixed(1)}{" "}
        <span className="text-sm text-mirage-muted">{metric.unit}</span>
      </p>
      <p className="mt-2 text-xs text-mirage-muted">
        Observed {metric.min.toFixed(1)}–{metric.max.toFixed(1)} ·{" "}
        {metric.samples} samples
      </p>
      {assessment && <MetricGauge metric={metric} assessment={assessment}/>}
    </Card>
  );
}

export function DriveReportPage() {
  const { token = "" } = useParams();
  const preview =
    token === dacoitDriveReport.publicToken ? dacoitDriveReport : undefined;
  const {
    data: remoteReport,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["drive-report", token],
    queryFn: () => getDriveReport(token),
    enabled: !preview,
    retry: false,
  });
  const report = preview ?? remoteReport;
  if (!preview && isLoading)
    return (
      <main className="min-h-screen bg-mirage-bg p-8 text-white">
        Loading drive summary…
      </main>
    );
  if ((!preview && isError) || !report)
    return (
      <main className="grid min-h-screen place-items-center bg-mirage-bg p-8 text-white">
        <div className="text-center">
          <AlertTriangle className="mx-auto text-mirage-orange" />
          <h1 className="mt-4 text-2xl font-semibold">
            Drive summary unavailable
          </h1>
          <p className="mt-2 text-sm text-mirage-muted">Sign in with the customer account assigned to this report.</p>
          <Link className="mt-5 inline-flex h-11 items-center border border-mirage-cyan px-5 text-sm font-semibold text-mirage-cyan" to="/login" state={{ from: `/drive-reports/${token}` }}>Sign in to view</Link>
        </div>
      </main>
    );
  const metricsWithAssessments = report.metrics
    .map((metric) => ({ metric, assessment: report.assessments.find((item) => item.key === metric.key) }));
  const healthMetrics = metricsWithAssessments.filter((item) => item.assessment);
  const contextMetrics = metricsWithAssessments.filter((item) => !item.assessment);
  return (
    <main className="min-h-screen bg-mirage-bg px-5 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold uppercase tracking-[.24em] text-mirage-cyan">
          Mirage Motorworks
        </p>
        <h1 className="mt-3 text-4xl font-semibold">{report.title}</h1>
        <p className="mt-3 text-mirage-muted">
          {report.vehicleLabel} · {new Date(report.startedAt).toLocaleString()}
        </p>
        {preview && (
          <div className="mt-6 border border-mirage-cyan/40 bg-mirage-cyan/10 p-4 text-sm text-cyan-50">
            Private mock report for layout and wording review. It has not been
            published as a final diagnostic report.
          </div>
        )}
        {report.source === "simulator" && (
          <div className="mt-6 border border-amber-300/40 bg-amber-300/10 p-4 text-amber-100">
            Simulator-backed session—this report does not describe a real
            vehicle.
          </div>
        )}
        <Card className="mt-8 p-6">
          <div className="flex items-center gap-3">
            <Activity className="text-mirage-cyan" />
            <h2 className="text-xl font-semibold">Drive overview</h2>
          </div>
          <p className="mt-4 leading-7 text-mirage-muted">{report.overview}</p>
          <ul className="mt-5 space-y-3">
            {report.observations.map((item) => {
              const [kind, detail] = item.includes(" — ")
                ? item.split(/ — (.*)/s)
                : ["OBSERVED", item];
              return (
                <li
                  key={item}
                  className="grid gap-2 border-l border-mirage-cyan pl-4 text-sm leading-6 sm:grid-cols-[120px_1fr]"
                >
                  <span className="font-semibold uppercase tracking-[.12em] text-mirage-cyan">
                    {kind}
                  </span>
                  <span>{detail}</span>
                </li>
              );
            })}
          </ul>
        </Card>
        {healthMetrics.length > 0 && (
          <section className="mt-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[.2em] text-mirage-cyan">Reference Checked</p>
                <h2 className="mt-2 text-2xl font-semibold">Health Signals</h2>
              </div>
              <p className="max-w-md text-xs leading-5 text-mirage-muted md:text-right">
                These available values were compared with Mirage guidance. Vehicle-specific ranges can become more precise as GarageOS learns the model.
              </p>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {healthMetrics.map(({ metric, assessment }) => (
                <MetricCard key={metric.key} metric={metric} assessment={assessment} />
              ))}
            </div>
          </section>
        )}
        {contextMetrics.length > 0 && (
          <section className="mt-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[.2em] text-mirage-muted">Context Only</p>
                <h2 className="mt-2 text-2xl font-semibold">Drive Context</h2>
              </div>
              <p className="max-w-md text-xs leading-5 text-mirage-muted md:text-right">
                These values help explain conditions during the drive but should not be treated as standalone health checks.
              </p>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {contextMetrics.map(({ metric }) => (
                <MetricCard key={metric.key} metric={metric} />
              ))}
            </div>
          </section>
        )}
        <p className="mt-8 border-t border-mirage-border pt-5 text-xs leading-5 text-mirage-muted">
          This summary reflects only data reported through the vehicle’s
          diagnostic interface during the recorded session or sessions. It is
          not a safety inspection, mechanical diagnosis, warranty determination,
          or substitute for evaluation by a qualified technician.
        </p>
      </div>
    </main>
  );
}
