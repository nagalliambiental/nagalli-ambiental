"use client";

import { useMemo, useDeferredValue, useState } from "react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { Search, X, Check, AlertTriangle, Pencil, ArrowUpRight } from "lucide-react";

export interface ExigenciaCardData {
  id: number;
  descricao: string;
  cumprida: boolean;
  prazo: Date;
  processo: {
    id: number;
    numProtocolo: string;
    tipo: string;
    orgao: { sigla: string };
    empreendimento: { apelido: string };
  };
}

export function ExigenciasCards({ data }: { data: ExigenciaCardData[] }) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const q = deferredQuery.trim().toLowerCase();
  const tokens = q ? q.split(/\s+/) : [];

  const filtradas = useMemo(() => {
    if (tokens.length === 0) return data;
    return data.filter((e) => {
      const h = `${e.descricao} ${e.processo.numProtocolo} ${e.processo.tipo} ${e.processo.orgao.sigla} ${e.processo.empreendimento.apelido}`.toLowerCase();
      return tokens.every((t) => h.includes(t));
    });
  }, [data, tokens]);

  return (
    <div>
      <div className="shadow-card mb-4 rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-ink-500)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por descrição, protocolo ou empreendimento..."
            className="w-full bg-white py-3 pl-10 pr-10 text-sm text-[var(--color-ink-900)] placeholder:text-[var(--color-ink-500)] focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-[var(--color-ink-500)] hover:text-[var(--color-ink-900)]"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {filtradas.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <div className="rounded-full bg-[var(--color-paper-100)] p-3"><AlertTriangle size={22} className="text-[var(--color-ink-500)]" /></div>
          <p className="text-sm text-[var(--color-ink-500)]">Nenhuma exigência encontrada</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtradas.map((e) => {
            const dias = differenceInDays(new Date(e.prazo), new Date());
            const vencida = !e.cumprida && dias < 0;
            const proxima = !e.cumprida && dias >= 0 && dias <= 7;
            return (
              <div
                key={e.id}
                className={`shadow-card flex flex-col rounded-[var(--radius-card)] border bg-white p-4 transition-shadow hover:shadow-lg ${
                  vencida ? "border-red-200" : proxima ? "border-amber-200" : e.cumprida ? "border-[var(--color-paper-200)]" : "border-[var(--color-paper-200)]"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/processos/${e.processo.id}`}
                    className="flex items-center gap-1.5 font-mono text-xs font-medium text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)]"
                  >
                    {e.processo.numProtocolo}
                    <ArrowUpRight size={12} />
                  </Link>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      e.cumprida
                        ? "bg-green-50 text-green-700"
                        : vencida
                        ? "bg-red-100 text-red-700"
                        : proxima
                        ? "bg-amber-50 text-amber-700"
                        : "bg-[var(--color-river-100)] text-[var(--color-river-700)]"
                    }`}
                  >
                    {e.cumprida ? <Check size={11} /> : <AlertTriangle size={11} />}
                    {e.cumprida ? "Cumprida" : vencida ? "Vencida" : proxima ? "Proximidade" : "Pendente"}
                  </span>
                </div>

                <Link href={`/exigencias/${e.id}`} title={e.descricao} className="mt-2 line-clamp-3 text-sm font-medium text-[var(--color-ink-900)] hover:text-[var(--color-brand-600)]">
                  {e.descricao}
                </Link>

                <div className="mt-3 flex items-center gap-2 text-xs text-[var(--color-ink-500)]">
                  <span className="rounded bg-[var(--color-paper-100)] px-1.5 py-0.5">{e.processo.tipo}</span>
                  <span>{e.processo.orgao.sigla}</span>
                  <span className="truncate">· {e.processo.empreendimento.apelido}</span>
                </div>

                <div className="mt-4 flex items-end justify-between border-t border-[var(--color-paper-100)] pt-3">
                  <div className={`text-sm ${e.cumprida ? "text-[var(--color-ink-500)]" : vencida ? "text-red-700" : proxima ? "text-amber-700" : "text-[var(--color-ink-700)]"}`}>
                    <span className="block text-[10px] uppercase tracking-wide text-[var(--color-ink-400)]">Prazo</span>
                    {format(new Date(e.prazo), "dd/MM/yyyy", { locale: ptBR })}
                    {!e.cumprida && <span className="block text-xs">{vencida ? `Vencido há ${Math.abs(dias)}d` : `${dias}d restantes`}</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    <Link
                      href={`/exigencias/${e.id}/editar`}
                      title="Editar"
                      className="rounded p-1.5 text-[var(--color-ink-500)] hover:bg-[var(--color-paper-100)] hover:text-[var(--color-ink-900)]"
                    >
                      <Pencil size={14} />
                    </Link>
                    <Link href={`/exigencias/${e.id}`} title="Abrir" className="rounded p-1.5 text-[var(--color-ink-500)] hover:bg-[var(--color-paper-100)] hover:text-[var(--color-ink-900)]">
                      <ArrowUpRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
