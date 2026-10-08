"use client";

import { Fragment, useState, type ReactNode } from "react";
import { Search, X } from "lucide-react";

export function normalizar(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function combina(texto: string, busca: string): boolean {
  const tokens = normalizar(busca).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const alvo = normalizar(texto);
  return tokens.every((t) => alvo.includes(t));
}

export interface ItemBusca {
  id: string | number;
  texto: string;
  conteudo: ReactNode;
}

export function CampoBusca({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (valor: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-500)]" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="focus-ring w-72 rounded-lg border border-[var(--color-paper-200)] bg-white px-9 py-2 text-sm text-[var(--color-ink-900)] placeholder:text-[var(--color-ink-500)]"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Limpar busca"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-[var(--color-ink-500)] hover:text-[var(--color-ink-900)]"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

function BarraBusca({
  busca,
  setBusca,
  placeholder,
  visiveis,
  total,
  rotulo,
  emCard = true,
}: {
  busca: string;
  setBusca: (valor: string) => void;
  placeholder: string;
  visiveis: number;
  total: number;
  rotulo: string;
  emCard?: boolean;
}) {
  return (
    <div
      className={
        emCard
          ? "flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-paper-200)] px-4 py-3"
          : "mb-4 flex flex-wrap items-center justify-between gap-3"
      }
    >
      <CampoBusca value={busca} onChange={setBusca} placeholder={placeholder} />
      <span className="text-xs text-[var(--color-ink-500)]">
        {visiveis} de {total} {rotulo}
      </span>
    </div>
  );
}

function ResultadoVazio({ busca }: { busca: string }) {
  if (!busca) {
    return (
      <div className="px-5 py-10 text-center text-sm text-[var(--color-ink-500)]">
        Nenhum registro encontrado
      </div>
    );
  }
  return (
    <div className="px-5 py-10 text-center text-sm text-[var(--color-ink-500)]">
      Nenhum resultado para{" "}
      <span className="font-medium text-[var(--color-ink-700)]">&ldquo;{busca}&rdquo;</span>
    </div>
  );
}

export function TabelaComBusca({
  linhas,
  cabecalho,
  placeholder = "Buscar...",
  rotulo = "registro(s)",
}: {
  linhas: ItemBusca[];
  cabecalho: ReactNode;
  placeholder?: string;
  rotulo?: string;
}) {
  const [busca, setBusca] = useState("");
  const filtrados = linhas.filter((l) => combina(l.texto, busca));

  return (
    <div>
      <BarraBusca
        busca={busca}
        setBusca={setBusca}
        placeholder={placeholder}
        visiveis={filtrados.length}
        total={linhas.length}
        rotulo={rotulo}
      />
      {filtrados.length === 0 ? (
        <ResultadoVazio busca={busca} />
      ) : (
        <table className="w-full text-sm">
          <thead>{cabecalho}</thead>
          <tbody>
            {filtrados.map((l) => (
              <Fragment key={l.id}>{l.conteudo}</Fragment>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function GridComBusca({
  itens,
  rodape,
  placeholder = "Buscar...",
  rotulo = "item(ns)",
  className = "grid grid-cols-1 gap-4 sm:grid-cols-2",
}: {
  itens: ItemBusca[];
  rodape?: ReactNode;
  placeholder?: string;
  rotulo?: string;
  className?: string;
}) {
  const [busca, setBusca] = useState("");
  const filtrados = itens.filter((i) => combina(i.texto, busca));

  return (
    <div>
      <BarraBusca
        busca={busca}
        setBusca={setBusca}
        placeholder={placeholder}
        visiveis={filtrados.length}
        total={itens.length}
        rotulo={rotulo}
        emCard={false}
      />
      {filtrados.length === 0 ? (
        <ResultadoVazio busca={busca} />
      ) : (
        <div className={className}>
          {filtrados.map((i) => (
            <Fragment key={i.id}>{i.conteudo}</Fragment>
          ))}
          {rodape}
        </div>
      )}
    </div>
  );
}
