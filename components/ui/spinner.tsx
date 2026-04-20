import { cn } from "@/lib/utils/cn";

type SpinnerSize = "sm" | "md" | "lg";

const SIZE_CLASSES: Record<SpinnerSize, string> = {
  sm: "w-3.5 h-3.5 border-[1.5px]",
  md: "w-4 h-4 border-2",
  lg: "w-5 h-5 border-2",
};

interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
}

/**
 * Accessible loading spinner.
 * Uses CSS border animation ΓÇô no external assets required.
 */
export function Spinner({ size = "md", className }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        "inline-block rounded-full border-current border-t-transparent animate-spin",
        SIZE_CLASSES[size],
        className
      )}
    />
  );
}
