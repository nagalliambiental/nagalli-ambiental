"use client";

import { useState } from "react";

export function AlertaDiasEditor({ processoId, currentValue }: { processoId: number; currentValue: number }) {
  const [dias, setDias] = useState(currentValue);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await fetch(`/api/processos/${processoId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alertaDias: dias }),
    });
    setSaving(false);
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={1}
        value={dias}
        onChange={(e) => setDias(Number(e.target.value))}
        className="w-16 rounded border border-[var(--color-paper-200)] px-2 py-1 text-xs text-center"
      />
      <span className="text-xs text-[var(--color-ink-500)]">dias</span>
      {dias !== currentValue && (
        <button onClick={handleSave} disabled={saving} className="text-xs text-[var(--color-brand-600)] hover:underline font-medium">
          {saving ? "..." : "Salvar"}
        </button>
      )}
    </div>
  );
}
