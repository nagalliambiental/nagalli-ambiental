"use client";

import { useState, useDeferredValue, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { Search, X } from "lucide-react";

export interface PropostaLinha {
  id: number;
  numero: number;
  ano: number;
  revisao: number;
  modeloSlug: string;
  dados: Record<string, unknown>;
  criadoEm: string;
}

interface Props {
  propostas: PropostaLinha[];
  modeloNomes: Record<string, string>;
}

export default function PropostasServicoList({ propostas, modeloNomes }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const q = deferredQuery.trim().toLowerCase();

  const filtradas = useMemo(() => {
    if (!q) return propostas;
    const tokens = q.split(/\s+/);
    return propostas.filter((p) => {
      const ident = `${p.numero} ${p.ano} REV ${String(p.revisao).padStart(2, "0")}`;
      const modelo = modeloNomes[p.modeloSlug] ?? p.modeloSlug;
      const h = `${ident} ${modelo}`.toLowerCase();
      return tokens.every((t) => h.includes(t));
    });
  }, [propostas, modeloNomes, q]);

  const handleGerar = async (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const res = await fetch(`/api/propostas-servico/${id}/gerar`, { method: "POST" });
      if (!res.ok) throw new Error("Erro ao gerar documento");

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="(.+)"/);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = match?.[1] ?? `proposta_${id}.docx`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast("Documento gerado!", "success");
    } catch {
      toast("Erro ao gerar documento", "error");
    }
  };

  const handleExcluir = async (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm("Tem certeza que deseja excluir esta proposta?")) return;

    try {
      const res = await fetch(`/api/propostas-servico/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir");

      toast("Proposta excluída", "success");
      router.refresh();
    } catch {
      toast("Erro ao excluir proposta", "error");
    }
  };

  if (propostas.length === 0) {
    return (
      <div className="text-center py-12 text-[var(--color-ink-500)]">
        <p>Nenhuma proposta encontrada.</p>
        <Link href="/propostas/nova" className="text-[var(--color-brand-600)] hover:underline mt-4 inline-block">
          Criar primeira proposta
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="relative border-b border-[var(--color-paper-200)]">
        <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-ink-500)]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por modelo, número..."
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
    <div className="overflow-x-auto rounded-lg border border-[var(--color-paper-200)]">
      <table className="w-full text-sm">
        <thead className="bg-[var(--color-paper-50)]">
          <tr>
            <th className="p-3 text-left font-medium text-[var(--color-ink-700)]">Identificação</th>
            <th className="p-3 text-left font-medium text-[var(--color-ink-700)]">Modelo</th>
            <th className="p-3 text-left font-medium text-[var(--color-ink-700)]">Data</th>
            <th className="p-3 text-center font-medium text-[var(--color-ink-700)]">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-paper-200)]">
          {filtradas.map((p) => (
            <tr key={p.id} className="hover:bg-[var(--color-paper-50)] cursor-pointer">
              <td className="p-3 font-mono text-[var(--color-brand-700)]">
                {p.numero} / {p.ano} – REV. {String(p.revisao).padStart(2, "0")}
              </td>
              <td className="p-3 text-[var(--color-ink-900)]">{modeloNomes[p.modeloSlug] ?? p.modeloSlug}</td>
              <td className="p-3 text-[var(--color-ink-500)]">
                {new Date(p.criadoEm).toLocaleDateString("pt-BR")}
              </td>
              <td className="p-3 text-center space-x-2">
                <Link
                  href={`/propostas/${p.id}`}
                  className="px-3 py-1 text-xs border border-[var(--color-paper-200)] text-[var(--color-ink-700)] rounded hover:bg-[var(--color-paper-50)] transition"
                >
                  Detalhe
                </Link>
                <button
                  onClick={(e) => handleGerar(p.id, e)}
                  className="px-3 py-1 text-xs bg-[var(--color-brand-100)] text-[var(--color-brand-700)] rounded hover:bg-[var(--color-brand-200)] transition"
                >
                  Gerar DOCX
                </button>
                <Link
                  href={`/propostas/${p.id}/editar`}
                  className="px-3 py-1 text-xs border border-[var(--color-paper-200)] text-[var(--color-ink-700)] rounded hover:bg-[var(--color-paper-50)] transition"
                >
                  Editar
                </Link>
                <button
                  onClick={(e) => handleExcluir(p.id, e)}
                  className="px-3 py-1 text-xs border border-red-300 text-red-700 rounded hover:bg-red-50 transition"
                >
                  Excluir
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
