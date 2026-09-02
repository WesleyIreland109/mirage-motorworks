export function readinessColorClass(value: number) {
  if (value >= 100) return "border-emerald-400 text-emerald-200";
  if (value >= 50) return "border-yellow-300 text-yellow-100";
  if (value >= 25) return "border-mirage-orange text-orange-100";
  return "border-red-400 text-red-100";
}

export function readinessIconClass(value: number) {
  if (value >= 100) return "text-emerald-300";
  if (value >= 50) return "text-yellow-200";
  if (value >= 25) return "text-mirage-orange";
  return "text-red-300";
}

export function readinessTextClass(value: number) {
  if (value >= 100) return "text-emerald-200";
  if (value >= 50) return "text-yellow-100";
  if (value >= 25) return "text-orange-100";
  return "text-red-100";
}
