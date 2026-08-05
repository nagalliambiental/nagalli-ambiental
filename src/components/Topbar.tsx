import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function Topbar({
  icon: Icon,
  title,
  subtitle,
  actions,
}: {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        {Icon && (
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[var(--color-paper-200)] bg-white text-[var(--color-brand-600)] shadow-card">
            <Icon size={22} />
          </span>
        )}
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--color-ink-900)]">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm leading-relaxed text-[var(--color-ink-500)]">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}
