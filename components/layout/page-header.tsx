import { cn } from "@/lib/utils/cn";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  accentColor?: string;
  right?: React.ReactNode;
  className?: string;
  progressBar?: { total: number; done: number };
}

export function PageHeader({ title, subtitle, accentColor, right, className, progressBar }: PageHeaderProps) {
  const pct = progressBar && progressBar.total > 0
    ? (progressBar.done / progressBar.total) * 100
    : 0;

  return (
    <div className={cn("mb-5", className)}>
      <div className="flex items-start justify-between">
        <div>
          <h1
            className="text-xl font-bold text-[var(--color-text-primary)]"
            style={accentColor ? { color: accentColor } : undefined}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{subtitle}</p>
          )}
        </div>
        {right && <div className="flex items-center gap-2">{right}</div>}
      </div>
      {progressBar && (
        <div className="mt-2 h-[3px] rounded-full bg-[var(--color-surface-raised)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--color-brand)]"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}
