import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { getDriveReport } from "@/api/client";
import { Card } from "@/components/ui/card";
import { dacoitDriveReport } from "@/data/demoDriveReports";
import type { MetricAssessment, MetricSummary } from "@/types/fleet";

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
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {report.metrics.map((metric) => {
            const assessment = report.assessments.find((item) => item.key === metric.key);
            return (
            <Card key={metric.key} className="p-5">
              <p className="text-xs uppercase tracking-[.16em] text-mirage-muted">
                {metric.label}
              </p>
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
          );})}
        </div>
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
