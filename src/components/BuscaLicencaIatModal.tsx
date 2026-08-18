"use client";

import { useState } from "react";
import { Search, Loader2, X, FileText } from "lucide-react";
import type { DadosLicenca } from "@/lib/iat";

interface Props {
  open: boolean;
  onClose: () => void;
  onSelecionar: (dados: DadosLicenca) => void;
}

const FONTES = [
  {
    id: "iat",
    nome: "IAT — Paraná (SGA)",
    descricao: "Sistema de Gestão Ambiental do Instituto Água e Terra (Paraná).",
  },
  {
    id: "ima",
    nome: "IMA — Santa Catarina",
    descricao: "Consulta de licenciamento ambiental do Instituto do Meio Ambiente (SC).",
  },
] as const;

type FonteId = (typeof FONTES)[number]["id"];

export function BuscaLicencaIatModal({ open, onClose, onSelecionar }: Props) {
  const [termo, setTermo] = useState("");
  const [tipo, setTipo] = useState<"licenca" | "cnpj" | "nome">("licenca");
  const [fonte, setFonte] = useState<FonteId>("iat");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [resultados, setResultados] = useState<DadosLicenca[]>([]);

  if (!open) return null;

  async function buscar(e: React.FormEvent) {
    e.preventDefault();
    const termoLimpo = termo.trim();
    if (!termoLimpo) return;
    setCarregando(true);
    setErro("");
    setResultados([]);
    try {
      const res = await fetch(
        `/api/${fonte}/consulta?${tipo}=${encodeURIComponent(termoLimpo)}`
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErro(String(data.error || "Nenhuma licença encontrada"));
        return;
      }
      setResultados(Array.isArray(data) ? data : []);
      if (!Array.isArray(data) || data.length === 0) {
        setErro("Nenhuma licença encontrada");
      }
    } catch {
      setErro("Falha ao consultar o órgão ambiental. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-[var(--color-ink-900)]">Buscar licença ambiental</h3>
            <p className="mt-1 text-sm text-[var(--color-ink-500)]">
              Consulte licenças de transporte de resíduos no IAT (Paraná) ou IMA (Santa Catarina).
            </p>
          </div>
          <button onClick={onClose} className="shrink-0 text-[var(--color-ink-400)] hover:text-[var(--color-ink-600)]">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={buscar} className="mb-4 flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="sm:w-52">
              <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1.5">Órgão</label>
              <select
                value={fonte}
                onChange={(e) => setFonte(e.target.value as FonteId)}
                className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
              >
                {FONTES.map((f) => (
                  <option key={f.id} value={f.id}>{f.nome}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1.5">Buscar por</label>
              <div className="flex gap-2">
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as typeof tipo)}
                  className="w-36 rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
                >
                  <option value="licenca">Nº da licença</option>
                  <option value="cnpj">CNPJ</option>
                  <option value="nome">Nome</option>
                </select>
                <input
                  type="text"
                  value={termo}
                  onChange={(e) => setTermo(e.target.value)}
                  placeholder={tipo === "licenca" ? fonte === "ima" ? "Ex: 1334/2020" : "Ex: 358.887" : tipo === "cnpj" ? "Ex: 22.888.669/0001-02" : "Ex: HB Ambiental"}
                  className="flex-1 rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={carregando}
              className="focus-ring transition-brand flex items-center gap-2 rounded-lg bg-[var(--color-brand-500)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-600)] disabled:opacity-50"
            >
              {carregando ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              Buscar
            </button>
          </div>
          <p className="text-xs text-[var(--color-ink-500)]">
            {FONTES.find((f) => f.id === fonte)?.descricao}
          </p>
        </form>

        {erro && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{erro}</div>
        )}

        {resultados.length > 0 && (
          <div className="space-y-3">
            {resultados.map((r, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onSelecionar(r)}
                className="block w-full rounded-lg border border-[var(--color-paper-200)] bg-[var(--color-paper-50)] p-4 text-left hover:border-[var(--color-brand-300)] hover:bg-[var(--color-brand-50)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--color-ink-900)]">{r.razaoSocial || "—"}</p>
                    <p className="mt-0.5 text-xs text-[var(--color-ink-500)]">
                      {r.modalidade && <span className="inline-block">{r.modalidade} · </span>}
                      {r.licenca && <span className="font-mono">{r.licenca}</span>}
                      {r.municipio && <span> · {r.municipio}/{r.uf}</span>}
                    </p>
                    {r.atividade && <p className="mt-1 text-xs text-[var(--color-ink-500)]">{r.atividade}</p>}
                    {(r.validade || r.cnpj || r.endereco) && (
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-ink-500)]">
                        {r.validade && <span>Validade: <span className="font-medium text-[var(--color-ink-700)]">{r.validade}</span></span>}
                        {r.cnpj && <span>CNPJ: <span className="font-mono text-[var(--color-ink-700)]">{r.cnpj}</span></span>}
                        {r.endereco && <span>Endereço: <span className="font-medium text-[var(--color-ink-700)]">{r.endereco}</span></span>}
                      </div>
                    )}
                  </div>
                  <span className="shrink-0 rounded bg-[var(--color-brand-500)] px-2 py-1 text-xs font-medium text-white">
                    <FileText size={12} className="mr-1 inline" />
                    Usar
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}