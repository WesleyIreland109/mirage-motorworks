import * as React from "react";

import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-11 w-full border border-mirage-border bg-mirage-secondary px-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-mirage-cyan",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";
