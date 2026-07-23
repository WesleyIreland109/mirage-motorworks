import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex h-11 items-center justify-center gap-2 border px-5 font-display text-sm font-bold uppercase transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mirage-cyan disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "border-transparent bg-mirage-cyan text-mirage-bg hover:bg-[#52E9FF]",
        secondary:
          "border-white/10 bg-transparent text-white hover:border-white/20 hover:bg-white/[0.08]",
        ghost:
          "border-transparent bg-transparent text-mirage-muted hover:text-white",
        danger:
          "border-red-500/40 bg-red-500/10 text-red-100 hover:bg-red-500/20",
      },
      size: {
        sm: "h-9 px-3 text-xs",
        md: "h-11 px-5",
        icon: "h-10 w-10 px-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button };
