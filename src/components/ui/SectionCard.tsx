import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function SectionCard({
  icon: Icon,
  title,
  subtitle,
  children,
  accent = "paper",
  className = "",
}: {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  children: ReactNode;
  accent?: "paper" | "brand";
  className?: string;
}) {
  return (
    <section
      className={`shadow-card overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white ${className}`}
    >
      <header
        className={`flex items-center gap-3 border-b border-[var(--color-paper-200)] px-5 py-4 ${
          accent === "brand" ? "bg-[var(--color-brand-50)]" : "bg-[var(--color-paper-50)]"
        }`}
      >
        {Icon && (
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--color-paper-200)] bg-white text-[var(--color-brand-600)]">
            <Icon size={18} />
          </span>
        )}
        <div>
          <h3 className="font-display text-base font-semibold text-[var(--color-ink-900)]">
            {title}
          </h3>
          {subtitle && <p className="text-xs text-[var(--color-ink-500)]">{subtitle}</p>}
        </div>
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}
