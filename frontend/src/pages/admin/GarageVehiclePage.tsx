import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BadgeDollarSign,
  ClipboardCheck,
  Gauge,
  Wrench,
} from "lucide-react";
import { Link, Navigate, useParams } from "react-router-dom";

import { listFleet, listTelemetrySessions, updateMaintenanceTask } from "@/api/client";
import { FleetVehicleControls } from "@/components/FleetVehicleControls";
import { VehicleDriveList } from "@/components/VehicleDriveList";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { vehicleDisplayName, vehicleFullLabel } from "@/lib/fleetDisplay";
import type { MaintenanceTask, TaskStatus, VehiclePurpose } from "@/types/fleet";

const destinationNames: Record<VehiclePurpose, string> = {
  personal: "My Garage",
  working_on: "Working On",
  flip: "Flips",
};

const destinationRoutes: Record<VehiclePurpose, string> = {
  personal: "/admin",
  working_on: "/admin/working-on",
  flip: "/admin/flips",
};

function TaskRow({
  task,
  mileage,
}: {
  task: MaintenanceTask;
  mileage: number;
}) {
  const client = useQueryClient();
  const update = useMutation({
    mutationFn: ({ status }: { status: TaskStatus }) =>
      updateMaintenanceTask(
        task.id,
        status,
        status === "completed" ? mileage : undefined,
      ),
    onSuccess: () => client.invalidateQueries({ queryKey: ["fleet"] }),
  });
  const action =
    task.status === "suggested"
      ? ["Accept", "accepted"]
      : task.status === "accepted"
        ? ["Start", "in_progress"]
        : task.status === "in_progress"
          ? ["Complete", "completed"]
          : task.status === "deferred"
            ? ["Reopen", "accepted"]
            : null;

  return (
    <div className="flex flex-col gap-3 border-b border-white/[.06] py-4 last:border-0 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className={task.status === "completed" ? "text-mirage-muted line-through" : "font-medium"}>
          {task.title}
        </p>
        <p className="mt-1 text-xs uppercase tracking-[.15em] text-mirage-muted">
          {task.category} · {task.priority} · {task.status.replace("_", " ")}
          {task.status === "suggested" ? " · no score impact yet" : ""}
        </p>
      </div>
      {action && (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            disabled={update.isPending}
            onClick={() => update.mutate({ status: action[1] as TaskStatus })}
          >
            {action[0]}
          </Button>
          {task.status !== "deferred" && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => update.mutate({ status: "deferred" })}
            >
              Defer
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function GarageVehiclePage() {
  const { vehicleId } = useParams();
  const { data: fleet = [], isLoading } = useQuery({
    queryKey: ["fleet"],
    queryFn: listFleet,
  });
  const { data: sessions = [] } = useQuery({
    queryKey: ["telemetry-sessions"],
    queryFn: () => listTelemetrySessions(),
  });
  const vehicle = fleet.find((item) => item.id === vehicleId);

  if (isLoading) {
    return <p className="px-5 py-12 text-mirage-muted lg:px-8">Opening vehicle...</p>;
  }

  if (!vehicle) {
    return <Navigate to="/admin" replace />;
  }

  const open = vehicle.tasks.filter((task) =>
    ["accepted", "in_progress"].includes(task.status),
  );
  const suggested = vehicle.tasks.filter((task) => task.status === "suggested");
  const done = vehicle.tasks.filter((task) => task.status === "completed");

  return (
    <section className="px-5 py-8 lg:px-8">
      <div className="flex flex-col justify-between gap-4 border-b border-mirage-border pb-6 md:flex-row md:items-end">
        <div>
          <Button asChild variant="ghost" className="mb-4 px-0">
            <Link to={destinationRoutes[vehicle.purpose]}>
              <ArrowLeft size={17} />
              Back to {destinationNames[vehicle.purpose]}
            </Link>
          </Button>
          <p className="text-sm font-semibold uppercase tracking-[.24em] text-mirage-cyan">
            {destinationNames[vehicle.purpose]} Vehicle
          </p>
          <h1 className="mt-2 text-4xl font-semibold">
            {vehicleDisplayName(vehicle)}
          </h1>
          <p className="mt-2 text-sm text-mirage-muted">
            {vehicleFullLabel(vehicle)}
            {vehicle.trim ? ` · ${vehicle.trim}` : ""} ·{" "}
            {vehicle.mileage.toLocaleString()} miles
            {vehicle.vin ? ` · VIN ${vehicle.vin}` : ""}
          </p>
        </div>
        {vehicle.purpose === "flip" ? (
          <BadgeDollarSign className="text-mirage-cyan" size={34} />
        ) : (
          <Activity className="text-mirage-cyan" size={34} />
        )}
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        <Card className="p-5">
          <Gauge className="text-mirage-cyan" size={20} />
          <p className="mt-3 text-3xl font-semibold">{vehicle.readiness}%</p>
          <p className="text-sm text-mirage-muted">Maintenance readiness</p>
        </Card>
        <Card className="p-5">
          <AlertTriangle className="text-mirage-orange" size={20} />
          <p className="mt-3 text-3xl font-semibold">{open.length}</p>
          <p className="text-sm text-mirage-muted">Accepted or in progress</p>
        </Card>
        <Card className="p-5">
          <ClipboardCheck className="text-emerald-300" size={20} />
          <p className="mt-3 text-3xl font-semibold">{done.length}</p>
          <p className="text-sm text-mirage-muted">Completed service items</p>
        </Card>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_420px]">
        <div className="space-y-5">
          <FleetVehicleControls vehicle={vehicle} />
          <Card className="p-5">
            <div className="flex items-center gap-2 border-b border-white/[.08] pb-3 text-sm font-semibold uppercase tracking-[.16em]">
              <Wrench size={17} />
              Maintenance checklist
            </div>
            {vehicle.tasks.length ? (
              vehicle.tasks.map((task) => (
                <TaskRow key={task.id} task={task} mileage={vehicle.mileage} />
              ))
            ) : (
              <p className="py-6 text-sm text-mirage-muted">
                No maintenance items were identified. Update the vehicle when
                something changes.
              </p>
            )}
          </Card>
        </div>
        <div className="space-y-5">
          <VehicleDriveList vehicle={vehicle} sessions={sessions} />
          <Card className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[.18em] text-mirage-muted">
              Suggested
            </p>
            <p className="mt-3 text-3xl font-semibold">{suggested.length}</p>
            <p className="mt-2 text-sm text-mirage-muted">
              Suggested checklist items waiting for acceptance.
            </p>
          </Card>
        </div>
      </div>
    </section>
  );
}
