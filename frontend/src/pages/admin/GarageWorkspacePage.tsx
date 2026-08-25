import { BadgeDollarSign, Plus } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";

import { createFleetVehicle, listFleet, listTelemetrySessions } from "@/api/client";
import { FleetVehicleControls } from "@/components/FleetVehicleControls";
import { VehicleDriveList } from "@/components/VehicleDriveList";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { vehicleDisplayName } from "@/lib/fleetDisplay";
import type { FleetVehicleInput, VehiclePurpose } from "@/types/fleet";

function VehicleForm({ purpose, done }: { purpose: VehiclePurpose; done: () => void }) {
  const client = useQueryClient();
  const [form, setForm] = useState({ year: String(new Date().getFullYear()), make: "", model: "", nickname: "", trim: "", mileage: 0, ownerName: "", acquisitionPrice: "", targetPrice: "", notes: "" });
  const mutation = useMutation({ mutationFn: createFleetVehicle, onSuccess: () => { client.invalidateQueries({ queryKey: ["fleet"] }); done(); } });
  const submit = () => mutation.mutate({
    year: Number(form.year), make: form.make, model: form.model, nickname: form.nickname, trim: form.trim, mileage: form.mileage,
    primaryUse: purpose === "flip" ? "resale" : "diagnostic", notes: form.notes, purpose,
    ownerName: form.ownerName || undefined,
    acquisitionPriceCents: form.acquisitionPrice ? Math.round(Number(form.acquisitionPrice) * 100) : undefined,
    targetSalePriceCents: form.targetPrice ? Math.round(Number(form.targetPrice) * 100) : undefined,
    answers: [] as FleetVehicleInput["answers"], customItems: [],
  });
  return <Card className="mt-5 p-5"><div className="grid gap-3 md:grid-cols-4">
    <Input inputMode="numeric" placeholder="Year" value={form.year} onChange={(e) => setForm({...form,year:e.target.value})}/>
    <Input placeholder="Make" value={form.make} onChange={(e) => setForm({...form,make:e.target.value})}/>
    <Input placeholder="Model" value={form.model} onChange={(e) => setForm({...form,model:e.target.value})}/>
    <Input placeholder="Nickname" value={form.nickname} onChange={(e) => setForm({...form,nickname:e.target.value})}/>
    <Input placeholder="Trim" value={form.trim} onChange={(e) => setForm({...form,trim:e.target.value})}/>
    <Input type="number" placeholder="Mileage" value={form.mileage || ""} onChange={(e) => setForm({...form,mileage:Number(e.target.value)})}/>
    {purpose === "working_on" && <Input placeholder="Owner / customer name" value={form.ownerName} onChange={(e) => setForm({...form,ownerName:e.target.value})}/>}
    {purpose === "flip" && <><Input placeholder="Purchase price" value={form.acquisitionPrice} onChange={(e) => setForm({...form,acquisitionPrice:e.target.value})}/><Input placeholder="Target sale price" value={form.targetPrice} onChange={(e) => setForm({...form,targetPrice:e.target.value})}/></>}
  </div><Textarea className="mt-3" placeholder="Private notes" value={form.notes} onChange={(e) => setForm({...form,notes:e.target.value})}/><Button className="mt-4" disabled={!form.make || !form.model || mutation.isPending} onClick={submit}><Plus size={16}/> Add vehicle</Button></Card>;
}

export function GarageWorkspacePage({ purpose }: { purpose: "working_on" | "flip" }) {
  const [adding, setAdding] = useState(false);
  const { data: fleet = [] } = useQuery({ queryKey: ["fleet"], queryFn: listFleet });
  const { data: sessions = [] } = useQuery({ queryKey: ["telemetry-sessions"], queryFn: () => listTelemetrySessions() });
  const vehicles = fleet.filter((vehicle) => vehicle.purpose === purpose);
  const title = purpose === "flip" ? "Flips" : "Working On";
  const subtitle = purpose === "flip" ? "Temporary inventory from acquisition through repair and sale." : "Friends’ and customer vehicles, diagnostic sessions, and shareable drive summaries.";
  return <section className="px-5 py-8 lg:px-8">
    <div className="flex flex-col justify-between gap-4 border-b border-mirage-border pb-6 md:flex-row md:items-end"><div><p className="text-sm font-semibold uppercase tracking-[.24em] text-mirage-cyan">Garage OS</p><h1 className="mt-2 text-4xl font-semibold">{title}</h1><p className="mt-2 text-sm text-mirage-muted">{subtitle}</p></div><Button onClick={() => setAdding(!adding)}><Plus size={17}/> Add vehicle</Button></div>
    {adding && <VehicleForm purpose={purpose} done={() => setAdding(false)}/>}
    {vehicles.length === 0 && !adding && <Card className="mt-8 p-8 text-center"><p className="text-mirage-muted">No vehicles here yet. Add one manually or route a recorded drive from Telemetry Inbox.</p></Card>}
    <div className="mt-8 grid gap-5 lg:grid-cols-2">{vehicles.map((vehicle) => <Card key={vehicle.id} className="p-5"><div className="flex justify-between gap-4"><div><p className="text-xs uppercase tracking-[.18em] text-mirage-muted">{vehicle.ownerName || (purpose === "flip" ? "Mirage inventory" : "Guest vehicle")}</p><Link to={`/admin/garage/${vehicle.id}`} className="mt-2 block text-xl font-semibold transition hover:text-mirage-cyan">{vehicleDisplayName(vehicle)}</Link><p className="text-sm text-mirage-muted">{vehicle.trim ? `${vehicle.trim} · ` : ""}{vehicle.mileage.toLocaleString()} miles</p></div>{purpose === "flip" && <BadgeDollarSign className="text-mirage-cyan"/>}</div>{purpose === "flip" && <div className="mt-5 grid grid-cols-2 gap-3 text-sm"><div className="bg-white/[.03] p-3"><p className="text-mirage-muted">Acquired</p><p className="mt-1 text-lg">${((vehicle.acquisitionPriceCents ?? 0)/100).toLocaleString()}</p></div><div className="bg-white/[.03] p-3"><p className="text-mirage-muted">Target</p><p className="mt-1 text-lg">${((vehicle.targetSalePriceCents ?? 0)/100).toLocaleString()}</p></div></div>}<Button asChild variant="secondary" className="mt-5"><Link to={`/admin/garage/${vehicle.id}`}>Open vehicle</Link></Button><div className="mt-5"><FleetVehicleControls vehicle={vehicle} /></div><div className="mt-5"><VehicleDriveList vehicle={vehicle} sessions={sessions} /></div></Card>)}</div>
  </section>;
}
