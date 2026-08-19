import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle } from "lucide-react";
import { useParams } from "react-router-dom";
import { getDriveReport } from "@/api/client";
import { Card } from "@/components/ui/card";

export function DriveReportPage() {
  const { token = "" } = useParams();
  const {
    data: report,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["drive-report", token],
    queryFn: () => getDriveReport(token),
    retry: false,
  });
  if (isLoading)
    return (
      <main className="min-h-screen bg-mirage-bg p-8 text-white">
        Loading drive summary…
      </main>
    );
  if (isError || !report)
    return (
      <main className="grid min-h-screen place-items-center bg-mirage-bg p-8 text-white">
        <div className="text-center">
          <AlertTriangle className="mx-auto text-mirage-orange" />
          <h1 className="mt-4 text-2xl font-semibold">
            Drive summary unavailable
          </h1>
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
            {report.observations.map((item) => (
              <li
                key={item}
                className="border-l border-mirage-cyan pl-4 text-sm leading-6"
              >
                {item}
              </li>
            ))}
          </ul>
        </Card>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {report.metrics.map((metric) => (
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
            </Card>
          ))}
        </div>
        <p className="mt-8 border-t border-mirage-border pt-5 text-xs leading-5 text-mirage-muted">
          This summary reflects only data reported through the vehicle’s
          diagnostic interface during one session. It is not a safety
          inspection, mechanical diagnosis, warranty determination, or
          substitute for evaluation by a qualified technician.
        </p>
      </div>
    </main>
  );
}
