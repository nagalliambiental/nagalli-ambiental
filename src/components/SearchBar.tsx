"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

export function SearchBar({
  placeholder = "Buscar...",
  paramName = "q",
  debounceMs = 400,
}: {
  placeholder?: string;
  paramName?: string;
  debounceMs?: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentUrlValue = searchParams.get(paramName) || "";
  const [value, setValue] = useState(currentUrlValue);
  const [lastUrlValue, setLastUrlValue] = useState(currentUrlValue);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (lastUrlValue !== currentUrlValue) {
    setLastUrlValue(currentUrlValue);
    setValue(currentUrlValue);
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function navigate(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next) params.set(paramName, next);
    else params.delete(paramName);
    router.replace(`?${params.toString()}`);
  }

  function handleChange(next: string) {
    setValue(next);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => navigate(next), debounceMs);
  }

  function clear() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setValue("");
    navigate("");
  }

  return (
    <div className="relative">
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-500)]" />
      <input
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className="focus-ring w-72 rounded-lg border border-[var(--color-paper-200)] bg-white px-9 py-2 text-sm text-[var(--color-ink-900)] placeholder:text-[var(--color-ink-500)]"
      />
      {value && (
        <button
          type="button"
          onClick={clear}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-[var(--color-ink-500)] hover:text-[var(--color-ink-900)]"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}