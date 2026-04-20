import { forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Displays a red error border and aria-invalid */
  hasError?: boolean;
}

/**
 * Styled text input field that follows the design token system.
 * Forwards its ref to the underlying <input> for integration with form libraries.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ hasError, className, ...props }, ref) => (
    <input
      ref={ref}
      aria-invalid={hasError ?? undefined}
      className={cn(
        "w-full h-10 px-3 rounded-[var(--radius-md)] text-sm",
        "bg-[var(--color-bg)] text-[var(--color-text-primary)]",
        "border border-[var(--color-border)] placeholder:text-[var(--color-text-disabled)]",
        "transition-colors duration-[var(--transition-fast)]",
        "focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)] focus:ring-offset-0 focus:border-[var(--color-brand)]",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[var(--color-bg-secondary)]",
        hasError && "border-[var(--color-error)] focus:ring-[var(--color-error)]",
        className
      )}
      {...props}
    />
  )
);

Input.displayName = "Input";
