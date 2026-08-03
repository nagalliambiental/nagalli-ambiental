"use client";

import { useState, type ReactNode } from "react";

export interface TabItem {
  key: string;
  label: string;
  count?: number;
  content: ReactNode;
}

export function Tabs({ tabs, initialTab }: { tabs: TabItem[]; initialTab?: string }) {
  const [active, setActive] = useState(
    initialTab && tabs.some((t) => t.key === initialTab) ? initialTab : tabs[0]?.key ?? ""
  );
  const current = tabs.find((t) => t.key === active) ?? tabs[0];

  return (
    <div>
      <div className="mb-6 border-b border-[var(--color-paper-200)]">
        <nav className="flex gap-6">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActive(t.key)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                active === t.key
                  ? "border-[var(--color-brand-500)] text-[var(--color-brand-600)]"
                  : "border-transparent text-[var(--color-ink-500)] hover:text-[var(--color-ink-700)]"
              }`}
            >
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className={`ml-1.5 rounded px-1.5 py-0.5 text-xs ${
                  active === t.key ? "bg-[var(--color-brand-50)] text-[var(--color-brand-600)]" : "bg-[var(--color-paper-100)] text-[var(--color-ink-500)]"
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>
      {current?.content}
    </div>
  );
}
