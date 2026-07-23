import { Edit3, Plus, Save, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createVehicle,
  deleteVehicle,
  listVehicles,
  updateVehicle,
} from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/ui/badge";
import { formatCurrency, formatMileage } from "@/lib/utils";
import type { Vehicle, VehicleInput, VehicleStatus } from "@/types/vehicle";

const schema = z.object({
  slug: z.string().min(3),
  year: z.coerce.number().int().min(1950).max(2050),
  make: z.string().min(1),
  model: z.string().min(1),
  trim: z.string().min(1),
  status: z.enum(["available", "coming_soon", "reserved", "sold", "in_prep"]),
  mileage: z.coerce.number().int().min(0),
  exteriorColor: z.string().min(1),
  interiorColor: z.string().min(1),
  transmission: z.string().min(1),
  drivetrain: z.string().min(1),
  engine: z.string().min(1),
  askingPrice: z.coerce.number().min(0),
  investedAmount: z.coerce.number().min(0),
  projectedProfit: z.coerce.number(),
  daysInInventory: z.coerce.number().int().min(0),
  heroImage: z.string().url(),
  gallery: z.string().min(1),
  highlights: z.string().min(1),
  story: z.string().min(12),
  inspectionNotes: z.string().min(12),
});

type FormValues = z.infer<typeof schema>;

const emptyValues: FormValues = {
  slug: "",
  year: new Date().getFullYear(),
  make: "",
  model: "",
  trim: "",
  status: "in_prep",
  mileage: 0,
  exteriorColor: "",
  interiorColor: "",
  transmission: "",
  drivetrain: "",
  engine: "",
  askingPrice: 0,
  investedAmount: 0,
  projectedProfit: 0,
  daysInInventory: 0,
  heroImage: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1800&q=85",
  gallery: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1800&q=85",
  highlights: "",
  story: "",
  inspectionNotes: "",
};

function vehicleToValues(vehicle: Vehicle): FormValues {
  return {
    ...vehicle,
    gallery: vehicle.gallery.join("\n"),
    highlights: vehicle.highlights.join("\n"),
  };
}

function valuesToInput(values: FormValues): VehicleInput {
  return {
    ...values,
    status: values.status as VehicleStatus,
    gallery: values.gallery.split("\n").map((item) => item.trim()).filter(Boolean),
    highlights: values.highlights.split("\n").map((item) => item.trim()).filter(Boolean),
  };
}

export function AdminInventory() {
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const queryClient = useQueryClient();
  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles"],
    queryFn: listVehicles,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyValues,
  });

  const selected = useMemo(() => editing ?? null, [editing]);

  const saveMutation = useMutation({
    mutationFn: (values: FormValues) =>
      selected
        ? updateVehicle(selected.id, valuesToInput(values))
        : createVehicle(valuesToInput(values)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      form.reset(emptyValues);
      setEditing(null);
      setIsCreating(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteVehicle,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vehicles"] }),
  });

  const startEdit = (vehicle: Vehicle) => {
    setEditing(vehicle);
    setIsCreating(false);
    form.reset(vehicleToValues(vehicle));
  };

  const startCreate = () => {
    setEditing(null);
    setIsCreating(true);
    form.reset(emptyValues);
  };

  const showForm = isCreating || editing;

  return (
    <section className="px-5 py-8 lg:px-8">
      <div className="flex flex-col justify-between gap-4 border-b border-mirage-border pb-6 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-mirage-cyan">
            Garage OS
          </p>
          <h1 className="mt-2 text-4xl font-semibold">Inventory</h1>
        </div>
        <Button onClick={startCreate}>
          <Plus size={17} /> Add Vehicle
        </Button>
      </div>

      {showForm && (
        <Card className="mt-8 p-5">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">
              {editing ? "Edit Vehicle" : "Create Vehicle"}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close form"
              onClick={() => {
                setEditing(null);
                setIsCreating(false);
              }}
            >
              <X size={18} />
            </Button>
          </div>
          <form
            className="grid gap-4"
            onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}
          >
            <div className="grid gap-4 md:grid-cols-4">
              <Input placeholder="Year" type="number" {...form.register("year")} />
              <Input placeholder="Make" {...form.register("make")} />
              <Input placeholder="Model" {...form.register("model")} />
              <Input placeholder="Trim" {...form.register("trim")} />
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              <Input placeholder="Slug" {...form.register("slug")} />
              <select
                className="h-11 border border-mirage-border bg-mirage-secondary px-3 text-sm text-white outline-none focus:border-mirage-cyan"
                {...form.register("status")}
              >
                <option value="available">Available</option>
                <option value="coming_soon">Coming Soon</option>
                <option value="reserved">Reserved</option>
                <option value="sold">Sold</option>
                <option value="in_prep">In Prep</option>
              </select>
              <Input placeholder="Mileage" type="number" {...form.register("mileage")} />
              <Input placeholder="Asking Price" type="number" {...form.register("askingPrice")} />
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              <Input placeholder="Exterior Color" {...form.register("exteriorColor")} />
              <Input placeholder="Interior Color" {...form.register("interiorColor")} />
              <Input placeholder="Transmission" {...form.register("transmission")} />
              <Input placeholder="Drivetrain" {...form.register("drivetrain")} />
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              <Input placeholder="Engine" {...form.register("engine")} />
              <Input placeholder="Invested Amount" type="number" {...form.register("investedAmount")} />
              <Input placeholder="Projected Profit" type="number" {...form.register("projectedProfit")} />
              <Input placeholder="Days in Inventory" type="number" {...form.register("daysInInventory")} />
            </div>
            <Input placeholder="Hero Image URL" {...form.register("heroImage")} />
            <div className="grid gap-4 md:grid-cols-2">
              <Textarea placeholder="Gallery URLs, one per line" {...form.register("gallery")} />
              <Textarea placeholder="Highlights, one per line" {...form.register("highlights")} />
            </div>
            <Textarea placeholder="Vehicle story" {...form.register("story")} />
            <Textarea placeholder="Inspection notes" {...form.register("inspectionNotes")} />
            {Object.keys(form.formState.errors).length > 0 && (
              <p className="text-sm text-mirage-orange">
                Check required fields and URL formatting before saving.
              </p>
            )}
            <Button type="submit" className="w-fit" disabled={saveMutation.isPending}>
              <Save size={17} /> Save Vehicle
            </Button>
          </form>
        </Card>
      )}

      <Card className="mt-8 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-mirage-border bg-mirage-secondary text-xs uppercase tracking-[0.18em] text-mirage-muted">
              <tr>
                <th className="px-5 py-4">Vehicle</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Mileage</th>
                <th className="px-5 py-4">Ask</th>
                <th className="px-5 py-4">Projected</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((vehicle) => (
                <tr key={vehicle.id} className="border-b border-mirage-border last:border-b-0">
                  <td className="px-5 py-4">
                    <p className="font-medium text-white">
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </p>
                    <p className="text-mirage-muted">{vehicle.trim}</p>
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={vehicle.status} />
                  </td>
                  <td className="px-5 py-4 text-mirage-muted">{formatMileage(vehicle.mileage)}</td>
                  <td className="px-5 py-4 text-mirage-muted">{formatCurrency(vehicle.askingPrice)}</td>
                  <td className="px-5 py-4 text-mirage-muted">{formatCurrency(vehicle.projectedProfit)}</td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <Button variant="secondary" size="icon" aria-label="Edit vehicle" onClick={() => startEdit(vehicle)}>
                        <Edit3 size={16} />
                      </Button>
                      <Button
                        variant="danger"
                        size="icon"
                        aria-label="Delete vehicle"
                        onClick={() => deleteMutation.mutate(vehicle.id)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  );
}
