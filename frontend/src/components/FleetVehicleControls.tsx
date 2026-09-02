import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Edit3, Save, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
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

function FieldBlock({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[.14em] text-mirage-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

export function FleetVehicleControls({ vehicle }: { vehicle: FleetVehicle }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(updateFromVehicle(vehicle));
  const [acquisitionPrice, setAcquisitionPrice] = useState(centsToDollars(vehicle.acquisitionPriceCents));
  const [targetPrice, setTargetPrice] = useState(centsToDollars(vehicle.targetSalePriceCents));
  const [error, setError] = useState("");
  const canManageVehicle = ["owner", "admin"].includes(vehicle.accessRole ?? "owner");

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

  if (!canManageVehicle) {
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
            <FieldBlock label="Year">
              <Input inputMode="numeric" placeholder="2021" value={form.year} onChange={(event) => field("year", Number(event.target.value))} />
            </FieldBlock>
            <FieldBlock label="Make">
              <Input placeholder="Honda" value={form.make} onChange={(event) => field("make", event.target.value)} />
            </FieldBlock>
            <FieldBlock label="Model">
              <Input placeholder="Civic Type R" value={form.model} onChange={(event) => field("model", event.target.value)} />
            </FieldBlock>
            <FieldBlock label="Nickname">
              <Input placeholder="The R" value={form.nickname ?? ""} onChange={(event) => field("nickname", event.target.value)} />
            </FieldBlock>
            <FieldBlock label="Trim">
              <Input placeholder="FK8 Touring Edition" value={form.trim} onChange={(event) => field("trim", event.target.value)} />
            </FieldBlock>
            <FieldBlock label="Mileage">
              <Input type="number" placeholder="42500" value={form.mileage || ""} onChange={(event) => field("mileage", Number(event.target.value))} />
            </FieldBlock>
            <FieldBlock label="VIN">
              <Input placeholder="17-character VIN" value={form.vin ?? ""} onChange={(event) => field("vin", event.target.value)} />
            </FieldBlock>
            <FieldBlock label="Primary use">
              <Input placeholder="diagnostic, resale, daily" value={form.primaryUse} onChange={(event) => field("primaryUse", event.target.value)} />
            </FieldBlock>
            <FieldBlock label="Annual miles">
              <Input
                type="number"
                placeholder="8000"
                value={form.annualMileage ?? ""}
                onChange={(event) => field("annualMileage", event.target.value ? Number(event.target.value) : undefined)}
              />
            </FieldBlock>
            <FieldBlock label="GarageOS tab">
              <select
                className="h-11 w-full border border-mirage-border bg-mirage-secondary px-3 text-sm"
                value={form.purpose}
                onChange={(event) => field("purpose", event.target.value as VehiclePurpose)}
              >
                {Object.entries(purposeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </FieldBlock>
            <FieldBlock label="Owner / customer">
              <Input placeholder="Customer or co-owner name" value={form.ownerName ?? ""} onChange={(event) => field("ownerName", event.target.value)} />
            </FieldBlock>
            <FieldBlock label="Purchase price">
              <Input placeholder="50000" value={acquisitionPrice} onChange={(event) => setAcquisitionPrice(event.target.value)} />
            </FieldBlock>
            <FieldBlock label="Target sale price">
              <Input placeholder="65000" value={targetPrice} onChange={(event) => setTargetPrice(event.target.value)} />
            </FieldBlock>
          </div>
          <FieldBlock label="Private notes">
            <Textarea
              className="mt-3"
              placeholder="Work history, concerns, customer requests, and internal notes"
              value={form.notes}
              onChange={(event) => field("notes", event.target.value)}
            />
          </FieldBlock>
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
