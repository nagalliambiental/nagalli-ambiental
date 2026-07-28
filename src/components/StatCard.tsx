import type { LucideIcon } from "lucide-react";

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
  accent?: "brand" | "river";
}) {
  const accentBg =
    accent === "river" ? "bg-[var(--color-river-100)]" : "bg-[var(--color-brand-50)]";
  const accentText =
    accent === "river" ? "text-[var(--color-river-700)]" : "text-[var(--color-brand-600)]";

  return (
    <div className="shadow-card h-full rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-[var(--color-ink-500)]">{label}</p>
          <p className="font-display mt-2 text-3xl font-semibold text-[var(--color-ink-900)]">
            {value}
          </p>
          {hint && <p className="mt-1 text-xs text-[var(--color-ink-500)]">{hint}</p>}
        </div>
        <div className={`rounded-lg p-2.5 ${accentBg}`}>
          <Icon size={20} className={accentText} strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}
