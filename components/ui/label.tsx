import { forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

export interface LabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement> {
  /** Appends a red asterisk to indicate a required field */
  required?: boolean;
}

/**
 * Form field label. Pairs with Input or other form controls via htmlFor.
 */
export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ required, children, className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        "block text-sm font-medium text-[var(--color-text-primary)] mb-1.5",
        className
      )}
      {...props}
    >
      {children}
      {required && (
        <span className="text-[var(--color-error)] ml-1" aria-hidden="true">
          *
        </span>
      )}
    </label>
  )
);

Label.displayName = "Label";
