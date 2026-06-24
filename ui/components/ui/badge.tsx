import { type HTMLAttributes, forwardRef } from "react";
import { cn } from "@/utils";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "outline";
}

const variants = {
  default: "rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white",
  secondary: "rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700",
  outline: "rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700",
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <span ref={ref} className={cn(variants[variant], className)} {...props} />
  ),
);

Badge.displayName = "Badge";
