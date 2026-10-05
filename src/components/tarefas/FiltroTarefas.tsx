"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { Search } from "lucide-react";

type Resp = { id: number; nome: string };

export function FiltroTarefas({ responsaveis, responsavelAtual }: { responsaveis: Resp[]; responsavelAtual: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");

  const navegar = useCallback(
    (mudancas: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(mudancas)) {
        if (v) next.set(k, v);
        else next.delete(k);
      }
      const qs = next.toString();
      router.push(`/tarefas${qs ? `?${qs}` : ""}`);
    },
    [params, router]
  );

  return (
    <div className="flex flex-1 flex-wrap items-center gap-2">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          navegar({ q: q.trim() || null });
        }}
        className="relative"
      >
        <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-ink-400)]" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por título, descrição..."
          className="w-56 rounded-lg border border-[var(--color-paper-200)] bg-white py-2 pl-8 pr-3 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
        />
      </form>
      <select
        value={responsavelAtual}
        onChange={(e) => navegar({ responsavelId: e.target.value || null })}
        aria-label="Filtrar por responsável"
        className="rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-700)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
      >
        <option value="">Todos os responsáveis</option>
        {responsaveis.map((r) => (
          <option key={r.id} value={String(r.id)}>
            {r.nome}
          </option>
        ))}
      </select>
    </div>
  );
}
