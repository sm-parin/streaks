import { Flame } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type SpinnerSize = "sm" | "md" | "lg";

const SIZE_CLASSES: Record<SpinnerSize, string> = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
};

interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
}

export function Spinner({ size = "md", className }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn("inline-flex items-center justify-center", className)}
    >
      <Flame
        className={cn(
          SIZE_CLASSES[size],
          "text-[var(--color-brand)] animate-[flame-pulse_1.2s_ease-in-out_infinite]"
        )}
      />
    </span>
  );
}
