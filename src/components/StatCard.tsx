import type { LucideIcon } from "lucide-react";

const TONES = {
  brand: "bg-[var(--color-brand-50)] text-[var(--color-brand-600)]",
  river: "bg-[var(--color-river-100)] text-[var(--color-river-700)]",
  success: "bg-green-50 text-green-600",
  warning: "bg-amber-50 text-amber-600",
  danger: "bg-red-50 text-red-600",
} as const;

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = "brand",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  accent?: keyof typeof TONES;
}) {
  return (
    <div className="shadow-card h-full rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-[var(--color-ink-500)]">{label}</p>
          <p className="font-display mt-1.5 text-2xl font-bold tabular-nums text-[var(--color-ink-900)]">
            {value}
          </p>
          {hint && <p className="mt-1 truncate text-xs text-[var(--color-ink-500)]">{hint}</p>}
        </div>
        <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${TONES[accent]}`}>
          <Icon size={15} strokeWidth={2} />
        </span>
      </div>
    </div>
  );
}
