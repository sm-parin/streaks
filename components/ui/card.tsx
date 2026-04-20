import { cn } from "@/lib/utils/cn";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  /** Adds a subtle hover lift effect for clickable cards */
  interactive?: boolean;
  as?: React.ElementType;
  onClick?: () => void;
}

/**
 * Surface container card that uses design tokens for background, border, and shadow.
 */
export function Card({
  children,
  className,
  interactive = false,
  as: Tag = "div",
  onClick,
}: CardProps) {
  return (
    <Tag
      onClick={onClick}
      className={cn(
        "bg-[var(--color-surface-raised)] border border-[var(--color-border)]",
        "rounded-[var(--radius-xl)] shadow-[var(--shadow-sm)]",
        interactive &&
          "cursor-pointer transition-shadow hover:shadow-[var(--shadow-md)] active:scale-[0.99]",
        className
      )}
    >
      {children}
    </Tag>
  );
}

/** Padded content area inside a Card */
export function CardContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("p-4", className)}>{children}</div>;
}
