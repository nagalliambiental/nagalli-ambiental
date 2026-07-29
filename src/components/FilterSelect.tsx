"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function FilterSelect({
  paramName,
  options,
}: {
  paramName: string;
  options: { value: string; label: string }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentValue = searchParams.get(paramName) || "";

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(paramName, value);
    else params.delete(paramName);
    router.push(`?${params.toString()}`);
  }

  return (
    <select
      value={currentValue}
      onChange={(e) => handleChange(e.target.value)}
      className="focus-ring rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)]"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
