import { cn } from "@/lib/utils/cn";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  accentColor?: string;
  right?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, accentColor, right, className }: PageHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between mb-5", className)}>
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
  );
}
