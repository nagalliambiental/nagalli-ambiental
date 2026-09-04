"use client";

import { useState, useRef, useEffect } from "react";
import { FileText, ChevronDown as ChevronDownIcon, Loader2, Search, Building2 } from "lucide-react";
import { TEMPLATES } from "@/lib/templates";

interface ClienteOption {
  id: number;
  apelido: string;
  razaoSocial: string;
}

interface EmpreendimentoOption {
  id: number;
  apelido: string;
  clienteId: number;
  cliente: { apelido: string };
}

interface Props {
  /** When true, the modal searches/selects from empreendimentos instead of clientes */
  empreendimentoMode?: boolean;
}

export function GerarDocumentosButton({ empreendimentoMode = false }: Props) {
  const [open, setOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<ClienteOption[] | EmpreendimentoOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function openSelector(slug: string) {
    setSelectedTemplate(slug);
    setOpen(false);
    setShowModal(true);
    setSearch("");
    setSelectedId(null);
    setLoadingOptions(true);
    try {
      if (empreendimentoMode) {
        const res = await fetch("/api/empreendimentos");
        const data = await res.json();
        setOptions(data);
      } else {
        const res = await fetch("/api/clientes");
        const data = await res.json();
        setOptions(data);
      }
    } catch {
      setOptions([]);
    } finally {
      setLoadingOptions(false);
    }
  }

  function handleConfirm() {
    if (!selectedTemplate || !selectedId) return;
    if (empreendimentoMode) {
      const emp = (options as EmpreendimentoOption[]).find((o) => o.id === selectedId);
      if (emp) {
        window.open(`/clientes/${emp.clienteId}/gerar/${selectedTemplate}`, "_blank");
      }
    } else {
      window.open(`/clientes/${selectedId}/gerar/${selectedTemplate}`, "_blank");
    }
    setShowModal(false);
    setSelectedId(null);
    setSelectedTemplate(null);
  }

  const templateName = selectedTemplate
    ? TEMPLATES.find((t) => t.slug === selectedTemplate)?.nome ?? ""
    : "";

  const filteredOptions = options.filter((o) => {
    const q = search.toLowerCase().trim();
    const tokens = q ? q.split(/\s+/) : [];
    const busca = (s: string) => {
      const h = s.toLowerCase();
      return tokens.every((t) => h.includes(t));
    };
    if (empreendimentoMode) {
      const e = o as EmpreendimentoOption;
      return busca(`${e.apelido} ${e.cliente.apelido}`);
    }
    const c = o as ClienteOption;
    return busca(`${c.apelido} ${c.razaoSocial}`);
  });

  return (
    <>
      <div ref={dropdownRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="focus-ring transition-brand flex items-center gap-2 rounded-[var(--radius-card)] bg-white border border-[var(--color-paper-200)] px-4 py-2.5 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]"
        >
          <FileText size={16} />
          Gerar Documentos
          <ChevronDownIcon size={14} />
        </button>
        {open && (
          <div className="absolute right-0 top-full z-50 mt-1 w-64 rounded-lg border border-[var(--color-paper-200)] bg-white py-1 shadow-lg">
            {TEMPLATES.map((t) => (
              <button
                key={t.slug}
                type="button"
                onClick={() => openSelector(t.slug)}
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]"
              >
                <FileText size={14} className="text-[var(--color-brand-500)]" />
                <span>{t.nome}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-lg rounded-xl bg-white p-6 shadow-lg">
            <h3 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-1">Gerar Documento</h3>
            <p className="text-sm text-[var(--color-ink-500)] mb-4">
              Template: <span className="font-medium text-[var(--color-ink-700)]">{templateName}</span>
            </p>

            <div className="relative mb-4">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-400)]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={empreendimentoMode ? "Buscar empreendimento..." : "Buscar cliente..."}
                className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
                autoFocus
              />
            </div>

            <div className="max-h-64 overflow-y-auto space-y-1">
              {loadingOptions ? (
                <div className="flex justify-center py-6"><Loader2 size={20} className="animate-spin text-[var(--color-brand-500)]" /></div>
              ) : filteredOptions.length === 0 ? (
                <p className="text-center text-sm text-[var(--color-ink-500)] py-6">Nenhum resultado encontrado.</p>
              ) : (
                filteredOptions.map((o) => {
                  const isSelected = selectedId === o.id;
                  const label = empreendimentoMode
                    ? `${(o as EmpreendimentoOption).apelido} — ${(o as EmpreendimentoOption).cliente.apelido}`
                    : `${(o as ClienteOption).apelido}${(o as ClienteOption).razaoSocial ? ` (${(o as ClienteOption).razaoSocial})` : ""}`;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => setSelectedId(o.id)}
                      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        isSelected
                          ? "bg-[var(--color-brand-50)] text-[var(--color-brand-700)] ring-1 ring-[var(--color-brand-500)]"
                          : "text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]"
                      }`}
                    >
                      <Building2 size={14} className={isSelected ? "text-[var(--color-brand-500)]" : "text-[var(--color-ink-400)]"} />
                      {label}
                    </button>
                  );
                })
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setShowModal(false); setSelectedId(null); }}
                className="rounded-lg border border-[var(--color-paper-200)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!selectedId}
                className="flex items-center gap-2 rounded-lg bg-[var(--color-brand-500)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-600)] disabled:opacity-50"
              >
                <FileText size={14} />
                Gerar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
