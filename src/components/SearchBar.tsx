"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

export function SearchBar({
  placeholder = "Buscar...",
  paramName = "q",
}: {
  placeholder?: string;
  paramName?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentValue = searchParams.get(paramName) || "";

  function navigate(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(paramName, value);
    else params.delete(paramName);
    router.replace(`?${params.toString()}`);
  }

  return (
    <div className="relative">
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-500)]" />
      <input
        value={currentValue}
        onChange={(e) => navigate(e.target.value)}
        placeholder={placeholder}
        className="focus-ring w-72 rounded-lg border border-[var(--color-paper-200)] bg-white px-9 py-2 text-sm text-[var(--color-ink-900)] placeholder:text-[var(--color-ink-500)]"
      />
      {currentValue && (
        <button
          type="button"
          onClick={() => navigate("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-[var(--color-ink-500)] hover:text-[var(--color-ink-900)]"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
