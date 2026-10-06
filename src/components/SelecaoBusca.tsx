"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

export type OpcaoBusca = { value: string; label: string };

function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

type SelecaoBuscaProps = {
  valor: string;
  onChange: (valor: string) => void;
  opcoes: OpcaoBusca[];
  placeholder?: string;
  className?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  permitirLimpar?: boolean;
  "aria-label"?: string;
};

export function SelecaoBusca({
  valor,
  onChange,
  opcoes,
  placeholder = "Selecione...",
  className = "",
  id,
  required = false,
  disabled = false,
  permitirLimpar = true,
  "aria-label": ariaLabel,
}: SelecaoBuscaProps) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selecionada = opcoes.find((o) => o.value === valor);

  const filtradas = useMemo(() => {
    const termo = normalizar(busca.trim());
    if (!termo) return opcoes;
    const tokens = termo.split(/\s+/).filter(Boolean);
    return opcoes.filter((o) => {
      const alvo = normalizar(o.label);
      return tokens.every((t) => alvo.includes(t));
    });
  }, [opcoes, busca]);

  useEffect(() => {
    if (!aberto) return;
    const aoClicarFora = (ev: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(ev.target as Node)) {
        setAberto(false);
        setBusca("");
      }
    };
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, [aberto]);

  function fechar() {
    setAberto(false);
    setBusca("");
  }

  function alternar() {
    if (disabled) return;
    if (aberto) {
      fechar();
    } else {
      setAberto(true);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }

  function escolher(value: string) {
    onChange(value);
    fechar();
  }

  const baseInput =
    "w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]";

  return (
    <div className="relative" ref={containerRef}>
      <div className={`relative flex items-center gap-1 ${className || baseInput} ${disabled ? "opacity-60" : ""}`}>
        <button
          type="button"
          id={id}
          onClick={alternar}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={aberto}
          aria-label={ariaLabel}
          className="flex min-w-0 flex-1 items-center justify-between gap-2 bg-transparent text-left text-sm outline-none"
        >
          <span className={`truncate ${selecionada ? "text-[var(--color-ink-900)]" : "text-[var(--color-ink-400)]"}`}>
            {selecionada ? selecionada.label : placeholder}
          </span>
          <ChevronDown
            size={14}
            className={`shrink-0 text-[var(--color-ink-400)] transition-transform ${aberto ? "rotate-180" : ""}`}
          />
        </button>
        {permitirLimpar && selecionada && !disabled && (
          <button
            type="button"
            aria-label="Limpar seleção"
            onClick={() => onChange("")}
            className="shrink-0 rounded p-0.5 text-[var(--color-ink-400)] hover:bg-[var(--color-paper-100)] hover:text-[var(--color-ink-600)]"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {required && (
        <input
          type="text"
          readOnly
          required
          value={valor}
          tabIndex={-1}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
        />
      )}

      {aberto && (
        <div className="absolute left-0 right-0 z-50 mt-1 overflow-hidden rounded-lg border border-[var(--color-paper-200)] bg-white shadow-lg">
          <div className="border-b border-[var(--color-paper-200)] p-2">
            <div className="flex items-center gap-2 rounded-md border border-[var(--color-paper-200)] px-2 py-1.5">
              <Search size={13} className="shrink-0 text-[var(--color-ink-400)]" />
              <input
                ref={inputRef}
                value={busca}
                onChange={(ev) => setBusca(ev.target.value)}
                onKeyDown={(ev) => {
                  if (ev.key === "Escape") {
                    ev.preventDefault();
                    fechar();
                  }
                  if (ev.key === "Enter") {
                    ev.preventDefault();
                    if (filtradas.length > 0) escolher(filtradas[0].value);
                  }
                }}
                placeholder="Digite para filtrar..."
                className="w-full bg-transparent text-sm text-[var(--color-ink-900)] outline-none placeholder:text-[var(--color-ink-400)]"
              />
            </div>
          </div>
          <ul role="listbox" className="max-h-56 overflow-y-auto py-1">
            {filtradas.length === 0 && (
              <li className="px-3 py-2 text-sm text-[var(--color-ink-400)]">Nenhuma opção encontrada</li>
            )}
            {filtradas.map((o) => (
              <li key={o.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={o.value === valor}
                  onClick={() => escolher(o.value)}
                  className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--color-paper-100)] ${
                    o.value === valor
                      ? "bg-[var(--color-brand-50)] font-medium text-[var(--color-brand-600)]"
                      : "text-[var(--color-ink-700)]"
                  }`}
                >
                  <span className="truncate">{o.label}</span>
                  {o.value === valor && <Check size={13} className="shrink-0" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
