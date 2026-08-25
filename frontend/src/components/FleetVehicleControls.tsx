import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Edit3, Save, Trash2 } from "lucide-react";
import { useState } from "react";

import { deleteFleetVehicle, updateFleetVehicle } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { vehicleDisplayName } from "@/lib/fleetDisplay";
import type { FleetVehicle, FleetVehicleUpdate, VehiclePurpose } from "@/types/fleet";

const purposeLabels: Record<VehiclePurpose, string> = {
  personal: "My Garage",
  working_on: "Working On",
  flip: "Flips",
};

function dollarsToCents(value: string): number | undefined {
  if (!value.trim()) return undefined;
  return Math.round(Number(value) * 100);
}

function centsToDollars(value?: number): string {
  if (value == null) return "";
  return String(value / 100);
}

function updateFromVehicle(vehicle: FleetVehicle): FleetVehicleUpdate {
  return {
    year: vehicle.year,
    make: vehicle.make,
    model: vehicle.model,
    nickname: vehicle.nickname ?? "",
    trim: vehicle.trim,
    mileage: vehicle.mileage,
    vin: vehicle.vin ?? "",
    primaryUse: vehicle.primaryUse,
    annualMileage: vehicle.annualMileage,
    notes: vehicle.notes,
    purpose: vehicle.purpose,
    ownerName: vehicle.ownerName ?? "",
    acquisitionPriceCents: vehicle.acquisitionPriceCents,
    targetSalePriceCents: vehicle.targetSalePriceCents,
  };
}

export function FleetVehicleControls({ vehicle }: { vehicle: FleetVehicle }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(updateFromVehicle(vehicle));
  const [acquisitionPrice, setAcquisitionPrice] = useState(centsToDollars(vehicle.acquisitionPriceCents));
  const [targetPrice, setTargetPrice] = useState(centsToDollars(vehicle.targetSalePriceCents));
  const [error, setError] = useState("");
  const isOwner = (vehicle.accessRole ?? "owner") === "owner";

  const save = useMutation({
    mutationFn: () =>
      updateFleetVehicle(vehicle.id, {
        ...form,
        acquisitionPriceCents: dollarsToCents(acquisitionPrice),
        targetSalePriceCents: dollarsToCents(targetPrice),
      }),
    onSuccess: () => {
      setEditing(false);
      setError("");
      queryClient.invalidateQueries({ queryKey: ["fleet"] });
    },
    onError: () => setError("Check the vehicle details and try again."),
  });

  const remove = useMutation({
    mutationFn: () => deleteFleetVehicle(vehicle.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["fleet"] }),
    onError: () => setError("Unable to delete this vehicle."),
  });

  const field = <Key extends keyof FleetVehicleUpdate>(
    key: Key,
    value: FleetVehicleUpdate[Key],
  ) => setForm((current) => ({ ...current, [key]: value }));

  if (!isOwner) {
    return (
      <p className="border border-white/[.06] bg-white/[.025] p-4 text-sm text-mirage-muted">
        This vehicle is shared with you. Only the owner can edit, move, or
        delete the vehicle record.
      </p>
    );
  }

  return (
    <div className="border border-white/[.06] bg-white/[.025] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[.16em]">
            Vehicle controls
          </p>
          <p className="mt-1 text-sm text-mirage-muted">
            Edit details, move this car between GarageOS tabs, or remove the
            record.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setForm(updateFromVehicle(vehicle));
              setAcquisitionPrice(centsToDollars(vehicle.acquisitionPriceCents));
              setTargetPrice(centsToDollars(vehicle.targetSalePriceCents));
              setEditing((current) => !current);
            }}
          >
            <Edit3 size={15} />
            {editing ? "Close" : "Edit"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={remove.isPending}
            onClick={() => {
              if (window.confirm(`Delete ${vehicleDisplayName(vehicle)} from GarageOS?`)) {
                remove.mutate();
              }
            }}
          >
            <Trash2 size={15} />
            Delete
          </Button>
        </div>
      </div>

      {editing && (
        <div className="mt-5">
          <div className="grid gap-3 md:grid-cols-4">
            <Input inputMode="numeric" placeholder="Year" value={form.year} onChange={(event) => field("year", Number(event.target.value))} />
            <Input placeholder="Make" value={form.make} onChange={(event) => field("make", event.target.value)} />
            <Input placeholder="Model" value={form.model} onChange={(event) => field("model", event.target.value)} />
            <Input placeholder="Nickname" value={form.nickname ?? ""} onChange={(event) => field("nickname", event.target.value)} />
            <Input placeholder="Trim" value={form.trim} onChange={(event) => field("trim", event.target.value)} />
            <Input type="number" placeholder="Mileage" value={form.mileage || ""} onChange={(event) => field("mileage", Number(event.target.value))} />
            <Input placeholder="VIN" value={form.vin ?? ""} onChange={(event) => field("vin", event.target.value)} />
            <Input placeholder="Primary use" value={form.primaryUse} onChange={(event) => field("primaryUse", event.target.value)} />
            <Input
              type="number"
              placeholder="Annual miles"
              value={form.annualMileage ?? ""}
              onChange={(event) => field("annualMileage", event.target.value ? Number(event.target.value) : undefined)}
            />
            <select
              className="h-11 border border-mirage-border bg-mirage-secondary px-3 text-sm"
              value={form.purpose}
              onChange={(event) => field("purpose", event.target.value as VehiclePurpose)}
            >
              {Object.entries(purposeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <Input placeholder="Owner / customer" value={form.ownerName ?? ""} onChange={(event) => field("ownerName", event.target.value)} />
            <Input placeholder="Purchase price" value={acquisitionPrice} onChange={(event) => setAcquisitionPrice(event.target.value)} />
            <Input placeholder="Target sale price" value={targetPrice} onChange={(event) => setTargetPrice(event.target.value)} />
          </div>
          <Textarea
            className="mt-3"
            placeholder="Private notes"
            value={form.notes}
            onChange={(event) => field("notes", event.target.value)}
          />
          {error && <p className="mt-3 text-sm text-mirage-orange">{error}</p>}
          <Button
            className="mt-4"
            disabled={save.isPending || !form.make.trim() || !form.model.trim()}
            onClick={() => save.mutate()}
          >
            <Save size={16} />
            {save.isPending ? "Saving..." : "Save vehicle"}
          </Button>
        </div>
      )}
    </div>
  );
}
