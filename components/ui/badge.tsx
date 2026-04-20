import { cn } from "@/lib/utils/cn";

type BadgeVariant = "default" | "brand" | "success" | "error" | "warning";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  default:
    "bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]",
  brand:
    "bg-[var(--color-brand-light)] text-[var(--color-brand-dark)]",
  success:
    "bg-[var(--color-success-bg)] text-[var(--color-success)]",
  error:
    "bg-[var(--color-error-bg)] text-[var(--color-error)]",
  warning:
    "bg-[var(--color-warning-bg)] text-[var(--color-warning)]",
};

/**
 * Small inline status indicator / tag.
 */
export function Badge({ variant = "default", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-[var(--radius-full)] text-xs font-medium",
        VARIANT_STYLES[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
