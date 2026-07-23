import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";

export function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mirage-muted">
            {label}
          </p>
          <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
          <p className="mt-2 text-sm text-mirage-muted">{detail}</p>
        </div>
        <div className="border border-mirage-border bg-white/5 p-2 text-mirage-cyan">
          <Icon size={18} />
        </div>
      </div>
    </Card>
  );
}
