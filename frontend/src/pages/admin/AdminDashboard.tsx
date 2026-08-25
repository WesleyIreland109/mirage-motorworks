import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Car,
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Gauge,
  Plus,
  Share2,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import {
  createFleetVehicle,
  listTelemetrySessions,
  listFleet,
  removeFleetVehicleShare,
  shareFleetVehicle,
  updateMaintenanceTask,
} from "@/api/client";
import { FleetVehicleControls } from "@/components/FleetVehicleControls";
import { VehicleDriveList } from "@/components/VehicleDriveList";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type {
  Condition,
  FleetVehicle,
  FleetVehicleInput,
  MaintenanceTask,
  TaskStatus,
} from "@/types/fleet";

const questions = [
  ["Engine", "Engine oil and filter"],
  ["Filters", "Engine air filter"],
  ["Filters", "Cabin air filter"],
  ["Tires", "Tires and rotation"],
  ["Brakes", "Brake pads and rotors"],
  ["Fluids", "Brake fluid"],
  ["Fluids", "Coolant"],
  ["Fluids", "Transmission fluid"],
  ["Electrical", "Battery"],
  ["Visibility", "Wipers and washer fluid"],
  ["Safety", "Exterior lights"],
  ["Chassis", "Alignment and suspension"],
] as const;

const initial: FleetVehicleInput = {
  year: new Date().getFullYear(),
  make: "",
  model: "",
  trim: "",
  mileage: 0,
  vin: "",
  primaryUse: "daily",
  annualMileage: undefined,
  notes: "",
  purpose: "personal",
  answers: questions.map(([category, label]) => ({
    category,
    label,
    condition: "unknown" as Condition,
  })),
  customItems: [],
};

function AddVehicle({ close }: { close: () => void }) {
  const client = useQueryClient();
  const [form, setForm] = useState(initial);
  const [custom, setCustom] = useState("");
  const [error, setError] = useState("");
  const save = useMutation({
    mutationFn: createFleetVehicle,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["fleet"] });
      close();
    },
    onError: () =>
      setError("Check the required vehicle details and try again."),
  });
  const field = (
    key: keyof FleetVehicleInput,
    value: string | number | undefined,
  ) => setForm((old) => ({ ...old, [key]: value }));
  return (
    <Card className="mt-6 p-5 lg:p-7">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-[.2em] text-mirage-cyan">
            Vehicle onboarding
          </p>
          <h2 className="mt-2 text-2xl font-semibold">
            Tell Garage OS about the car
          </h2>
        </div>
        <Button variant="ghost" onClick={close}>
          Close
        </Button>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <Input
          type="number"
          placeholder="Year"
          value={form.year}
          onChange={(e) => field("year", Number(e.target.value))}
        />
        <Input
          placeholder="Make"
          value={form.make}
          onChange={(e) => field("make", e.target.value)}
        />
        <Input
          placeholder="Model"
          value={form.model}
          onChange={(e) => field("model", e.target.value)}
        />
        <Input
          placeholder="Trim (optional)"
          value={form.trim}
          onChange={(e) => field("trim", e.target.value)}
        />
        <Input
          type="number"
          placeholder="Current mileage"
          value={form.mileage || ""}
          onChange={(e) => field("mileage", Number(e.target.value))}
        />
        <Input
          placeholder="VIN (optional)"
          value={form.vin}
          onChange={(e) => field("vin", e.target.value)}
        />
        <select
          className="h-11 border border-mirage-border bg-mirage-secondary px-3 text-sm"
          value={form.primaryUse}
          onChange={(e) => field("primaryUse", e.target.value)}
        >
          <option value="daily">Daily driver</option>
          <option value="family">Family</option>
          <option value="weekend">Weekend</option>
          <option value="track">Track</option>
          <option value="towing">Towing</option>
        </select>
        <Input
          type="number"
          placeholder="Annual miles (optional)"
          onChange={(e) =>
            field(
              "annualMileage",
              e.target.value ? Number(e.target.value) : undefined,
            )
          }
        />
      </div>
      <h3 className="mt-8 text-lg font-semibold">
        What is the current condition?
      </h3>
      <p className="mt-1 text-sm text-mirage-muted">
        Unknown is completely fine. It creates a low-impact verification task.
      </p>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {form.answers.map((answer, index) => (
          <div
            key={answer.label}
            className="grid gap-2 border border-white/[.06] bg-black/10 p-3 sm:grid-cols-[1fr_170px] sm:items-center"
          >
            <div>
              <p className="text-sm font-medium">{answer.label}</p>
              <p className="text-xs text-mirage-muted">{answer.category}</p>
            </div>
            <select
              className="h-10 border border-mirage-border bg-mirage-secondary px-2 text-sm"
              value={answer.condition}
              onChange={(e) =>
                setForm((old) => ({
                  ...old,
                  answers: old.answers.map((item, i) =>
                    i === index
                      ? { ...item, condition: e.target.value as Condition }
                      : item,
                  ),
                }))
              }
            >
              <option value="good">Good</option>
              <option value="monitor">Monitor</option>
              <option value="needs_attention">Needs attention</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>
        ))}
      </div>
      <h3 className="mt-8 text-lg font-semibold">
        Anything missing from this list?
      </h3>
      <p className="mt-1 text-sm text-mirage-muted">
        Add owner-observed items such as streaking wipers, a warning light,
        noise, leak, or cosmetic issue.
      </p>
      <Textarea
        className="mt-3"
        placeholder="One item per line"
        value={custom}
        onChange={(e) => setCustom(e.target.value)}
      />
      <Textarea
        className="mt-3"
        placeholder="General vehicle notes (optional)"
        value={form.notes}
        onChange={(e) => field("notes", e.target.value)}
      />
      {error && <p className="mt-3 text-sm text-mirage-orange">{error}</p>}
      <Button
        className="mt-5"
        disabled={save.isPending}
        onClick={() =>
          save.mutate({
            ...form,
            customItems: custom
              .split("\n")
              .map((x) => x.trim())
              .filter(Boolean),
          })
        }
      >
        <Check size={17} />
        {save.isPending
          ? "Creating checklist…"
          : "Create vehicle and checklist"}
      </Button>
    </Card>
  );
}

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
        <p
          className={
            task.status === "completed"
              ? "text-mirage-muted line-through"
              : "font-medium"
          }
        >
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

function ShareVehiclePanel({ vehicle }: { vehicle: FleetVehicle }) {
  const client = useQueryClient();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const accessRole = vehicle.accessRole ?? "owner";
  const shares = vehicle.shares ?? [];
  const share = useMutation({
    mutationFn: () => shareFleetVehicle(vehicle.id, email, "editor"),
    onSuccess: () => {
      setEmail("");
      setError("");
      client.invalidateQueries({ queryKey: ["fleet"] });
    },
    onError: () =>
      setError("That person needs a GarageOS account before you can share this vehicle."),
  });
  const remove = useMutation({
    mutationFn: (shareId: string) => removeFleetVehicleShare(vehicle.id, shareId),
    onSuccess: () => client.invalidateQueries({ queryKey: ["fleet"] }),
  });
  const isOwner = accessRole === "owner";

  return (
    <div className="mb-5 border border-white/[.06] bg-white/[.025] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[.16em]">
            <Users className="text-mirage-cyan" size={17} />
            Shared garage access
          </div>
          <p className="mt-2 text-sm leading-6 text-mirage-muted">
            {isOwner
              ? "Invite another owner so they can see the questionnaire, workflow, notes, and checklist updates on this vehicle."
              : "This vehicle is shared with you. Updates happen on the same live maintenance record."}
          </p>
        </div>
        <div className="flex items-center gap-2 border border-mirage-cyan/25 bg-mirage-cyan/10 px-3 py-2 text-xs font-semibold uppercase tracking-[.14em] text-mirage-cyan">
          <Share2 size={14} />
          {accessRole}
        </div>
      </div>

      {isOwner && (
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
          <Input
            type="email"
            placeholder="Co-owner email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Button
            disabled={share.isPending || !email.trim()}
            onClick={() => share.mutate()}
          >
            <Share2 size={16} />
            Share
          </Button>
        </div>
      )}
      {error && <p className="mt-3 text-sm text-mirage-orange">{error}</p>}

      <div className="mt-4 grid gap-2">
        {shares.length ? (
          shares.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 border border-white/[.06] bg-black/10 p-3"
            >
              <div>
                <p className="text-sm font-medium">{item.displayName}</p>
                <p className="text-xs text-mirage-muted">
                  {item.email} · {item.permission}
                </p>
              </div>
              {isOwner && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(item.id)}
                >
                  <X size={15} />
                  Remove
                </Button>
              )}
            </div>
          ))
        ) : (
          <p className="text-sm text-mirage-muted">
            This vehicle has not been shared yet.
          </p>
        )}
      </div>
    </div>
  );
}

export function AdminDashboard() {
  const [adding, setAdding] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const { data: fleet = [], isLoading } = useQuery({
    queryKey: ["fleet"],
    queryFn: listFleet,
  });
  const { data: sessions = [] } = useQuery({
    queryKey: ["telemetry-sessions"],
    queryFn: () => listTelemetrySessions(),
  });
  return (
    <section className="px-5 py-8 lg:px-8">
      <div className="flex flex-col justify-between gap-4 border-b border-mirage-border pb-6 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[.24em] text-mirage-cyan">
            Garage OS
          </p>
          <h1 className="mt-2 text-4xl font-semibold">My Garage</h1>
          <p className="mt-2 text-sm text-mirage-muted">
            Real maintenance readiness for the vehicles you own.
          </p>
        </div>
        <Button onClick={() => setAdding(true)}>
          <Plus size={17} /> Add vehicle
        </Button>
      </div>
      {adding && <AddVehicle close={() => setAdding(false)} />}{" "}
      {isLoading && (
        <p className="py-12 text-mirage-muted">Opening the garage…</p>
      )}
      {!isLoading &&
        fleet.filter((vehicle) => vehicle.purpose === "personal").length ===
          0 &&
        !adding && (
          <Card className="mt-8 grid min-h-80 place-items-center p-8 text-center">
            <div>
              <Car className="mx-auto text-mirage-cyan" size={38} />
              <h2 className="mt-5 text-2xl font-semibold">
                Your garage is empty
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-mirage-muted">
                Add your first vehicle. A short questionnaire will generate the
                first maintenance checklist.
              </p>
              <Button className="mt-6" onClick={() => setAdding(true)}>
                <Plus size={17} /> Add your first vehicle
              </Button>
            </div>
          </Card>
        )}
      <div className="mt-8 grid gap-5">
        {fleet
          .filter((vehicle) => vehicle.purpose === "personal")
          .map((vehicle) => {
            const open = vehicle.tasks.filter((t) =>
              ["accepted", "in_progress"].includes(t.status),
            );
            const suggested = vehicle.tasks.filter(
              (t) => t.status === "suggested",
            );
            const done = vehicle.tasks.filter((t) => t.status === "completed");
            const isOpen = expanded === vehicle.id;
            return (
              <Card key={vehicle.id} className="overflow-hidden">
                <button
                  className="grid w-full gap-5 p-5 text-left md:grid-cols-[1fr_auto_auto] md:items-center lg:p-6"
                  onClick={() => setExpanded(isOpen ? null : vehicle.id)}
                >
                  <div>
                    <p className="text-xs uppercase tracking-[.18em] text-mirage-muted">
                      {vehicle.primaryUse} · {vehicle.mileage.toLocaleString()}{" "}
                      miles
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold">
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </h2>
                    <p className="text-sm text-mirage-muted">{vehicle.trim}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="relative grid h-20 w-20 place-items-center rounded-full border-4 border-mirage-cyan">
                      <span className="text-xl font-bold">
                        {vehicle.readiness}%
                      </span>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[.15em] text-mirage-muted">
                        Readiness
                      </p>
                      <p className="mt-1 text-sm">
                        {open.length} active · {suggested.length} suggested
                      </p>
                    </div>
                  </div>
                  {isOpen ? <ChevronUp /> : <ChevronDown />}
                </button>
                {isOpen && (
                  <div className="border-t border-mirage-border p-5 lg:p-6">
                    <div className="mb-5 grid gap-3 sm:grid-cols-3">
                      <div className="bg-white/[.03] p-3">
                        <Gauge className="text-mirage-cyan" size={18} />
                        <p className="mt-2 text-2xl font-semibold">
                          {vehicle.readiness}%
                        </p>
                        <p className="text-xs text-mirage-muted">
                          Maintenance readiness
                        </p>
                      </div>
                      <div className="bg-white/[.03] p-3">
                        <AlertTriangle
                          className="text-mirage-orange"
                          size={18}
                        />
                        <p className="mt-2 text-2xl font-semibold">
                          {open.length}
                        </p>
                        <p className="text-xs text-mirage-muted">
                          Accepted or in progress
                        </p>
                      </div>
                      <div className="bg-white/[.03] p-3">
                        <ClipboardCheck
                          className="text-emerald-300"
                          size={18}
                        />
                        <p className="mt-2 text-2xl font-semibold">
                          {done.length}
                        </p>
                        <p className="text-xs text-mirage-muted">
                          Completed service items
                        </p>
                      </div>
                    </div>
                    <ShareVehiclePanel vehicle={vehicle} />
                    <div className="mb-5">
                      <FleetVehicleControls vehicle={vehicle} />
                    </div>
                    <div className="mb-5">
                      <VehicleDriveList vehicle={vehicle} sessions={sessions} />
                    </div>
                    <Button asChild variant="secondary" className="mb-5">
                      <Link to={`/admin/garage/${vehicle.id}`}>Open vehicle</Link>
                    </Button>
                    <div className="flex items-center gap-2 border-b border-white/[.08] pb-3 text-sm font-semibold uppercase tracking-[.16em]">
                      <Wrench size={17} /> Maintenance checklist
                    </div>
                    {vehicle.tasks.length ? (
                      vehicle.tasks.map((t) => (
                        <TaskRow
                          key={t.id}
                          task={t}
                          mileage={vehicle.mileage}
                        />
                      ))
                    ) : (
                      <p className="py-6 text-sm text-mirage-muted">
                        No maintenance items were identified. Update the vehicle
                        when something changes.
                      </p>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
      </div>
    </section>
  );
}
