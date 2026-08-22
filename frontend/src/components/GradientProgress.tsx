import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

type GradientProgressProps = {
  value: number;
  max?: number;
  heightClassName?: string;
  className?: string;
  ariaLabel: string;
  animate?: boolean;
};

export function GradientProgress({
  value,
  max = 100,
  heightClassName = "h-4",
  className,
  ariaLabel,
  animate = true,
}: GradientProgressProps) {
  const safePercent = Math.max(0, Math.min(100, (value / max) * 100));

  return (
    <div
      className={cn(
        "overflow-hidden border border-white/[0.08] bg-mirage-bg",
        heightClassName,
        className,
      )}
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
    >
      <motion.div
        className="h-full bg-mirage-gradient"
        initial={animate ? { width: "0%" } : false}
        animate={{ width: `${safePercent}%` }}
        transition={{ duration: animate ? 1 : 0, ease: "easeOut" }}
      />
    </div>
  );
}
