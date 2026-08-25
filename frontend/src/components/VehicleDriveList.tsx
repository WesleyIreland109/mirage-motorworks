import { Activity, Gauge } from "lucide-react";

import { Card } from "@/components/ui/card";
import type { FleetVehicle, TelemetrySession } from "@/types/fleet";

function formatSessionTime(startedAt: string): string {
  const date = new Date(startedAt);
  return Number.isNaN(date.getTime()) ? startedAt : date.toLocaleString();
}

export function VehicleDriveList({
  sessions,
  vehicle,
}: {
  sessions: TelemetrySession[];
  vehicle: FleetVehicle;
}) {
  const vehicleSessions = sessions.filter((session) => session.vehicleId === vehicle.id);

  return (
    <div className="border border-white/[.06] bg-white/[.025] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[.16em]">
          <Activity className="text-mirage-cyan" size={17} />
          Associated drives
        </div>
        <p className="text-xs uppercase tracking-[.16em] text-mirage-muted">
          {vehicleSessions.length} attached
        </p>
      </div>

      {vehicleSessions.length ? (
        <div className="mt-4 grid gap-3">
          {vehicleSessions.map((session) => (
            <Card key={session.id} className="bg-black/10 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h4 className="font-semibold">{session.label}</h4>
                  <p className="mt-1 text-xs text-mirage-muted">
                    {formatSessionTime(session.startedAt)} · {session.source} ·{" "}
                    {session.metrics.length} metrics
                  </p>
                </div>
                {session.recordedMileage != null && (
                  <div className="flex items-center gap-2 text-sm text-mirage-cyan">
                    <Gauge size={15} />
                    {session.recordedMileage.toLocaleString()} mi
                  </div>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {session.metrics.slice(0, 5).map((metric) => (
                  <span
                    key={metric.key}
                    className="border border-white/[.06] bg-white/[.03] px-2 py-1 text-xs text-mirage-muted"
                  >
                    {metric.label}
                  </span>
                ))}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-mirage-muted">
          No telemetry drives are attached to this vehicle yet.
        </p>
      )}
    </div>
  );
}
