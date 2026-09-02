import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BadgeDollarSign,
  ClipboardCheck,
  Gauge,
  Plus,
  Save,
  Wrench,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";

import { createMaintenanceTask, listFleet, listTelemetrySessions, updateMaintenanceTask } from "@/api/client";
import { FleetVehicleControls } from "@/components/FleetVehicleControls";
import { VehicleDriveList } from "@/components/VehicleDriveList";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { vehicleDisplayName, vehicleFullLabel } from "@/lib/fleetDisplay";
import { readinessColorClass, readinessIconClass, readinessTextClass } from "@/lib/readiness";
import { cn } from "@/lib/utils";
import type { MaintenanceTask, MaintenanceTaskInput, TaskStatus, VehiclePurpose } from "@/types/fleet";

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

const taskStatuses: Array<{
  key: TaskStatus;
  label: string;
  helper: string;
}> = [
  { key: "suggested", label: "Backlog", helper: "Ideas, AI suggestions, or work not accepted yet." },
  { key: "accepted", label: "To Do", helper: "Committed jobs that reduce readiness until finished." },
  { key: "in_progress", label: "In Progress", helper: "Active bay work." },
  { key: "completed", label: "Complete", helper: "Finished and logged." },
  { key: "deferred", label: "Deferred", helper: "Parked without affecting readiness." },
];

const priorityLabels: MaintenanceTaskInput["priority"][] = ["verify", "routine", "important", "safety"];

function TaskField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[.14em] text-mirage-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

function TaskCard({
  task,
  mileage,
  canEdit,
}: {
  task: MaintenanceTask;
  mileage: number;
  canEdit: boolean;
}) {
  const client = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<MaintenanceTaskInput>({
    title: task.title,
    category: task.category,
    priority: task.priority as MaintenanceTaskInput["priority"],
    penalty: task.penalty,
    status: task.status,
    notes: task.notes,
  });
  const update = useMutation({
    mutationFn: (payload: { status: TaskStatus } | MaintenanceTaskInput) => {
      const nextStatus = payload.status;
      return updateMaintenanceTask(task.id, {
        ...payload,
        completedMileage: nextStatus === "completed" ? mileage : undefined,
      });
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ["fleet"] }),
  });
  const move = (status: TaskStatus) => update.mutate({ status });

  return (
    <article className="border border-white/[.06] bg-mirage-bg/45 p-3">
      <div className="min-w-0">
        <p className={task.status === "completed" ? "text-sm text-mirage-muted line-through" : "text-sm font-semibold"}>
          {task.title}
        </p>
        <p className="mt-2 text-[11px] uppercase tracking-[.14em] text-mirage-muted">
          {task.category} / {task.priority} / {task.penalty} pts
        </p>
        {task.notes && <p className="mt-3 text-sm leading-6 text-mirage-muted">{task.notes}</p>}
      </div>

      {canEdit && (
        <div className="mt-4 flex flex-wrap gap-2">
          {task.status === "suggested" && <Button size="sm" variant="secondary" disabled={update.isPending} onClick={() => move("accepted")}>Accept</Button>}
          {task.status !== "in_progress" && task.status !== "completed" && <Button size="sm" variant="secondary" disabled={update.isPending} onClick={() => move("in_progress")}>Start</Button>}
          {task.status !== "completed" && <Button size="sm" variant="secondary" disabled={update.isPending} onClick={() => move("completed")}>Complete</Button>}
          {task.status === "completed" && <Button size="sm" variant="secondary" disabled={update.isPending} onClick={() => move("accepted")}>Reopen</Button>}
          {task.status !== "deferred" && task.status !== "completed" && <Button size="sm" variant="ghost" disabled={update.isPending} onClick={() => move("deferred")}>Defer</Button>}
          <Button size="sm" variant="ghost" onClick={() => setEditing((value) => !value)}>{editing ? "Close" : "Edit"}</Button>
        </div>
      )}

      {editing && (
        <div className="mt-4 grid gap-3 border-t border-white/[.06] pt-4">
          <TaskField label="Job title">
            <Input value={form.title} placeholder="Replace rear brake pads" onChange={(event) => setForm({ ...form, title: event.target.value })} />
          </TaskField>
          <div className="grid gap-3 sm:grid-cols-2">
            <TaskField label="Category">
              <Input value={form.category} placeholder="Brakes" onChange={(event) => setForm({ ...form, category: event.target.value })} />
            </TaskField>
            <TaskField label="Priority">
              <select className="h-11 w-full border border-mirage-border bg-mirage-secondary px-3 text-sm" value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as MaintenanceTaskInput["priority"] })}>
                {priorityLabels.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
              </select>
            </TaskField>
            <TaskField label="Readiness impact">
              <Input type="number" min={0} max={100} value={form.penalty} onChange={(event) => setForm({ ...form, penalty: Number(event.target.value) })} />
            </TaskField>
            <TaskField label="Board lane">
              <select className="h-11 w-full border border-mirage-border bg-mirage-secondary px-3 text-sm" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as TaskStatus })}>
                {taskStatuses.map((status) => <option key={status.key} value={status.key}>{status.label}</option>)}
              </select>
            </TaskField>
          </div>
          <TaskField label="Mechanic notes">
            <Textarea value={form.notes} placeholder="Parts, measurements, blockers, or handoff notes" onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          </TaskField>
          <Button
            size="sm"
            disabled={update.isPending || !form.title.trim()}
            onClick={() => update.mutate(form, { onSuccess: () => setEditing(false) })}
          >
            <Save size={15} />
            Save job
          </Button>
        </div>
      )}
    </article>
  );
}

function AddTaskCard({ vehicleId }: { vehicleId: string }) {
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<MaintenanceTaskInput>({
    title: "",
    category: "General",
    priority: "routine",
    penalty: 10,
    status: "accepted",
    notes: "",
  });
  const create = useMutation({
    mutationFn: () => createMaintenanceTask(vehicleId, form),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["fleet"] });
      setForm({ title: "", category: "General", priority: "routine", penalty: 10, status: "accepted", notes: "" });
      setOpen(false);
    },
  });

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus size={17} />
        Add job
      </Button>
    );
  }

  return (
    <Card className="p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.18em] text-mirage-cyan">New job</p>
          <h2 className="mt-1 text-xl font-semibold">Add work to this vehicle</h2>
        </div>
        <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <TaskField label="Job title">
          <Input value={form.title} placeholder="Inspect FK8 cooling system" onChange={(event) => setForm({ ...form, title: event.target.value })} />
        </TaskField>
        <TaskField label="Category">
          <Input value={form.category} placeholder="Cooling" onChange={(event) => setForm({ ...form, category: event.target.value })} />
        </TaskField>
        <TaskField label="Priority">
          <select className="h-11 w-full border border-mirage-border bg-mirage-secondary px-3 text-sm" value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as MaintenanceTaskInput["priority"] })}>
            {priorityLabels.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
          </select>
        </TaskField>
        <TaskField label="Readiness impact">
          <Input type="number" min={0} max={100} value={form.penalty} onChange={(event) => setForm({ ...form, penalty: Number(event.target.value) })} />
        </TaskField>
        <TaskField label="Starting lane">
          <select className="h-11 w-full border border-mirage-border bg-mirage-secondary px-3 text-sm" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as TaskStatus })}>
            {taskStatuses.map((status) => <option key={status.key} value={status.key}>{status.label}</option>)}
          </select>
        </TaskField>
        <TaskField label="Mechanic notes">
          <Textarea value={form.notes} placeholder="Parts, symptoms, customer request, or inspection notes" onChange={(event) => setForm({ ...form, notes: event.target.value })} />
        </TaskField>
      </div>
      <Button className="mt-5" disabled={create.isPending || !form.title.trim()} onClick={() => create.mutate()}>
        <Plus size={16} />
        {create.isPending ? "Adding..." : "Add job"}
      </Button>
    </Card>
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
  const canEditTasks = ["owner", "admin", "editor"].includes(vehicle.accessRole ?? "owner");
  const tasksByStatus = taskStatuses.map((status) => ({
    ...status,
    tasks: vehicle.tasks.filter((task) => task.status === status.key),
  }));

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
          <Gauge className={readinessIconClass(vehicle.readiness)} size={20} />
          <p className={cn("mt-3 text-3xl font-semibold", readinessTextClass(vehicle.readiness))}>
            {vehicle.readiness}%
          </p>
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
          {canEditTasks && <AddTaskCard vehicleId={vehicle.id} />}
          <Card className="p-5">
            <div className="flex flex-col justify-between gap-3 border-b border-white/[.08] pb-4 md:flex-row md:items-center">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[.16em]">
                <Wrench size={17} />
                Job board
              </div>
              <p className="text-sm text-mirage-muted">
                Move work across lanes. To Do and In Progress reduce readiness until complete.
              </p>
            </div>
            {vehicle.tasks.length ? (
              <div className="mt-5 grid gap-4 xl:grid-cols-5">
                {tasksByStatus.map((lane) => (
                  <section key={lane.key} className="min-h-52 border border-white/[.06] bg-white/[.02] p-3">
                    <div className="mb-3 border-b border-white/[.06] pb-3">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold">{lane.label}</h3>
                        <span className="text-xs text-mirage-muted">{lane.tasks.length}</span>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-mirage-muted">{lane.helper}</p>
                    </div>
                    <div className="space-y-3">
                      {lane.tasks.map((task) => (
                        <TaskCard key={task.id} task={task} mileage={vehicle.mileage} canEdit={canEditTasks} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <p className="py-6 text-sm text-mirage-muted">
                No jobs yet. Add one to start tracking the prep workflow.
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
