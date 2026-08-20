import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { listVehicles } from "@/api/client";
import { VehicleCard } from "@/components/VehicleCard";
import { Input } from "@/components/ui/input";

export function InventoryPage() {
  const [query, setQuery] = useState("");
  const { data: vehicles = [], isLoading, isError } = useQuery({
    queryKey: ["vehicles"],
    queryFn: listVehicles,
  });

  const filtered = useMemo(() => {
    const term = query.toLowerCase();
    return vehicles.filter((vehicle) =>
      `${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim}`
        .toLowerCase()
        .includes(term),
    );
  }, [query, vehicles]);

  return (
    <main className="mx-auto max-w-7xl px-5 pb-24 pt-36">
      <div className="grid gap-8 border-b border-mirage-border pb-10 md:grid-cols-[1fr_360px] md:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-mirage-cyan">
            Inventory
          </p>
          <h1 className="mt-4 text-5xl font-black tracking-tight md:text-7xl">
            The Collection
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-mirage-muted">
            Cars with a point of view. Each listing is treated like a dossier,
            not a commodity tile.
          </p>
        </div>
        <label className="relative block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-mirage-muted" size={18} />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="pl-10"
            placeholder="Search collection"
          />
        </label>
      </div>
      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        {isLoading
          ? Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-96 animate-pulse bg-mirage-panel" />
            ))
          : filtered.map((vehicle) => (
              <VehicleCard key={vehicle.id} vehicle={vehicle} />
            ))}
      </div>
      {!isLoading && !isError && filtered.length === 0 && (
        <div className="mt-10 border border-mirage-border bg-mirage-panel p-8 text-center text-mirage-muted">
          No vehicles currently match this collection.
        </div>
      )}
      {isError && (
        <div className="mt-10 border border-mirage-orange/30 bg-mirage-orange/10 p-8 text-center text-mirage-orange">
          Inventory is temporarily unavailable. Please try again shortly.
        </div>
      )}
    </main>
  );
}
