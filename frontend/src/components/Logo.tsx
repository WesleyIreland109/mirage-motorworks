import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export function Logo({ to = "/", className }: { to?: string; className?: string }) {
  return (
    <Link
      to={to}
      className={cn("inline-flex h-14 w-56 items-center overflow-hidden", className)}
    >
      <img
        src="/brand/mirage-wordmark-cropped.png"
        alt="Mirage Motorworks"
        className="h-full w-full object-contain object-left"
      />
    </Link>
  );
}
