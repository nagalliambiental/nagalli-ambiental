"use client";

import { useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { useToast } from "@/components/Toast";

interface ProcessoStatusSelectorProps {
  processoId: number;
  status: string;
  statusLabel: string;
  statusColor: string;
  labels: Record<string, string>;
  colors: Record<string, string>;
}

export default function ProcessoStatusSelector({
  processoId,
  status,
  statusLabel,
  statusColor,
  labels,
  colors,
}: ProcessoStatusSelectorProps) {
  const { toast } = useToast();
  const [current, setCurrent] = useState(status);
  const [saving, setSaving] = useState(false);

  const label = current === status ? statusLabel : labels[current] || current;
  const color = current === status ? statusColor : colors[current] || "";

  async function changeStatus(value: string) {
    if (value === current || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/processos/${processoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: value }),
      });
      if (!res.ok) throw new Error("Falha ao atualizar status");
      setCurrent(value);
      toast("Status atualizado com sucesso", "success");
    } catch {
      toast("Erro ao atualizar status", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span
        className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${color}`}
      >
        {label}
      </span>
      <span className="relative inline-flex items-center">
        <select
          aria-label="Alterar status"
          disabled={saving}
          value={current}
          onChange={(e) => changeStatus(e.target.value)}
          className="focus-ring appearance-none rounded-lg border border-[var(--color-paper-200)] bg-white py-1.5 pl-2.5 pr-8 text-xs font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)] disabled:opacity-60"
        >
          {Object.entries(labels).map(([value, text]) => (
            <option key={value} value={value}>
              {text}
            </option>
          ))}
        </select>
        {saving ? (
          <Loader2 size={14} className="ml-1 h-3.5 w-3.5 animate-spin text-[var(--color-ink-400)]" />
        ) : (
          <ChevronDown
            size={14}
            className="pointer-events-none ml-1 absolute right-2.5 text-[var(--color-ink-400)]"
          />
        )}
      </span>
    </span>
  );
}