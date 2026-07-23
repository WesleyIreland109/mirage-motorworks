import * as React from "react";

import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "min-h-28 w-full border border-mirage-border bg-mirage-secondary px-3 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-mirage-cyan",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
