import { cn } from "@/lib/utils/cn";

interface SkeletonProps {
  className?: string;
}

/**
 * Placeholder loading skeleton.
 * Use in place of content while data is being fetched to prevent CLS.
 * Size the skeleton to match the expected content dimensions exactly.
 */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn(
        "rounded-[var(--radius-md)] bg-[var(--color-bg-secondary)] animate-pulse",
        className
      )}
    />
  );
}
