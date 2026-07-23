import { Link } from "react-router-dom";
import { motion } from "framer-motion";

import { StatusBadge } from "@/components/ui/badge";
import { formatCurrency, formatMileage } from "@/lib/utils";
import type { Vehicle } from "@/types/vehicle";

export function VehicleCard({ vehicle }: { vehicle: Vehicle }) {
  return (
    <motion.article
      whileHover={{ y: -6 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="group overflow-hidden border border-white/[0.04] bg-mirage-panel transition duration-200 hover:border-white/10 hover:shadow-lift"
    >
      <Link to={`/inventory/${vehicle.slug}`} className="block">
        <div className="relative aspect-[16/10] overflow-hidden">
          <img
            src={vehicle.heroImage}
            alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
            className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <div className="absolute left-4 top-4">
            <StatusBadge status={vehicle.status} />
          </div>
        </div>
        <div className="space-y-4 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-mirage-muted">
              {formatMileage(vehicle.mileage)} miles
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-white">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </h3>
            <p className="text-sm text-mirage-muted">{vehicle.trim}</p>
          </div>
          <div className="flex items-end justify-between border-t border-white/[0.05] pt-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-mirage-muted">
                Guide
              </p>
              <p className="text-lg font-semibold text-white">
                {formatCurrency(vehicle.askingPrice)}
              </p>
            </div>
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-mirage-cyan">
              View dossier
            </span>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
