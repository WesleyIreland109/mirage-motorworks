import { cn } from "@/lib/utils";

const labels = {
  available: "Available",
  coming_soon: "Coming Soon",
  reserved: "Reserved",
  sold: "Sold",
  in_prep: "In Prep",
};

export function StatusBadge({
  status,
  className,
}: {
  status: keyof typeof labels;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center border border-mirage-border bg-white/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-mirage-muted",
        status === "available" && "border-mirage-cyan/40 text-mirage-cyan",
        status === "coming_soon" && "border-mirage-pink/40 text-mirage-pink",
        status === "in_prep" && "border-mirage-orange/40 text-mirage-orange",
        className,
      )}
    >
      {labels[status]}
    </span>
  );
}
