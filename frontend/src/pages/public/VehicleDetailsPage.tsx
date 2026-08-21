import { ArrowLeft, Check, Mail } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { getVehicle } from "@/api/client";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { formatCurrency, formatMileage } from "@/lib/utils";

export function VehicleDetailsPage() {
  const { slug = "" } = useParams();
  const { data: vehicle, isLoading } = useQuery({
    queryKey: ["vehicle", slug],
    queryFn: () => getVehicle(slug),
  });

  if (isLoading) {
    return <main className="min-h-screen px-5 pt-36 text-mirage-muted">Loading dossier...</main>;
  }

  if (!vehicle) {
    return <main className="min-h-screen px-5 pt-36">Vehicle not found.</main>;
  }

  return (
    <main className="pb-24 pt-20">
      <section className="relative min-h-[72vh] overflow-hidden px-5 py-16">
        <img
          src={vehicle.heroImage}
          alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-mirage-bg via-black/45 to-black/20" />
        <div className="relative z-10 mx-auto flex min-h-[58vh] max-w-7xl flex-col justify-end">
          <Link to="/inventory" className="mb-8 inline-flex items-center gap-2 text-sm text-zinc-300 hover:text-white">
            <ArrowLeft size={16} /> Back to inventory
          </Link>
          <StatusBadge status={vehicle.status} />
          <h1 className="mt-5 max-w-5xl text-5xl font-black leading-none tracking-tight md:text-8xl">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </h1>
          <p className="mt-4 text-2xl text-zinc-300">{vehicle.trim}</p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-5 pt-12 lg:grid-cols-[1fr_380px]">
        <div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Mileage", `${formatMileage(vehicle.mileage)} mi`],
              ["Transmission", vehicle.transmission],
              ["Engine", vehicle.engine],
              ["Guide", formatCurrency(vehicle.askingPrice)],
            ].map(([label, value]) => (
              <div key={label} className="border border-mirage-border bg-mirage-panel p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-mirage-muted">{label}</p>
                <p className="mt-2 text-lg font-semibold">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_0.8fr]">
            <div>
              <h2 className="text-3xl font-semibold">Refurbishment Thesis</h2>
              <p className="mt-4 text-lg leading-9 text-zinc-300">{vehicle.story}</p>
              <h2 className="mt-10 text-3xl font-semibold">GarageOS Notes</h2>
              <p className="mt-4 text-lg leading-9 text-zinc-300">{vehicle.inspectionNotes}</p>
            </div>
            <div>
              <h2 className="text-3xl font-semibold">Highlights</h2>
              <ul className="mt-5 space-y-4">
                {vehicle.highlights.map((highlight) => (
                  <li key={highlight} className="flex gap-3 text-zinc-300">
                    <Check className="mt-1 text-mirage-cyan" size={18} />
                    {highlight}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {vehicle.gallery.map((image) => (
              <img
                key={image}
                src={image}
                alt=""
                className="aspect-[4/3] w-full object-cover"
              />
            ))}
          </div>
        </div>
        <aside className="h-fit border border-mirage-border bg-mirage-panel p-6 lg:sticky lg:top-28">
          <p className="text-xs uppercase tracking-[0.24em] text-mirage-muted">
            Private Inquiry
          </p>
          <p className="mt-4 text-3xl font-semibold">{formatCurrency(vehicle.askingPrice)}</p>
          <p className="mt-4 text-sm leading-7 text-mirage-muted">
            Request the complete dossier, inspection notes, and a conversation
            about fit. This listing is the public output of the prep record,
            not a pressure-sale landing page.
          </p>
          <Button asChild className="mt-6 w-full">
            <Link to="/contact">
              <Mail size={17} /> Start Conversation
            </Link>
          </Button>
        </aside>
      </section>
    </main>
  );
}
