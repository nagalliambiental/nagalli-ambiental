"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { FileText, Pencil, Trash2, Plus, FileStack } from "lucide-react";

export interface ModeloLinha {
  id: number | null;
  slug: string;
  nome: string;
  descricao: string;
  prefixoArquivo: string;
  campos: Record<string, unknown>[];
  ativo: boolean;
  temTemplate: boolean;
  criadoEm: string | null;
  embutido?: boolean;
}

export default function ModelosList({ modelos }: { modelos: ModeloLinha[] }) {
  const router = useRouter();
  const { toast } = useToast();

  const handleExcluir = async (id: number, nome: string) => {
    if (!confirm(`Excluir o modelo "${nome}"?`)) return;
    try {
      const res = await fetch(`/api/propostas-modelos/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir");
      toast("Modelo excluído", "success");
      router.refresh();
    } catch {
      toast("Erro ao excluir modelo", "error");
    }
  };

  if (modelos.length === 0) {
    return (
      <div className="text-center py-16 text-[var(--color-ink-500)]">
        <FileStack size={32} className="mx-auto mb-3 text-[var(--color-ink-300)]" />
        <p className="font-medium text-[var(--color-ink-700)]">Nenhum modelo cadastrado</p>
        <p className="text-sm mt-1">Cadastre um novo tipo de proposta a partir de um DOCX.</p>
        <Link
          href="/propostas/modelos/novo"
          className="focus-ring transition-brand mt-5 inline-flex items-center gap-2 rounded-[var(--radius-card)] bg-[var(--color-brand-500)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)]"
        >
          <Plus size={16} />
          Novo Modelo
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-[var(--color-paper-50)]">
          <tr>
            <th className="p-3 text-left font-medium text-[var(--color-ink-700)]">Nome</th>
            <th className="p-3 text-left font-medium text-[var(--color-ink-700)]">Slug</th>
            <th className="p-3 text-center font-medium text-[var(--color-ink-700)]">Campos</th>
            <th className="p-3 text-center font-medium text-[var(--color-ink-700)]">Template</th>
            <th className="p-3 text-center font-medium text-[var(--color-ink-700)]">Status</th>
            <th className="p-3 text-center font-medium text-[var(--color-ink-700)]">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-paper-200)]">
          {modelos.map((m) => (
            <tr key={m.embutido ? `emb-${m.slug}` : m.id} className="hover:bg-[var(--color-paper-50)]">
              <td className="p-3">
                <div className="flex items-center gap-2">
                  <FileText size={15} className="shrink-0 text-[var(--color-brand-500)]" />
                  <span className="font-medium text-[var(--color-ink-900)]">{m.nome}</span>
                </div>
                {m.descricao && <p className="mt-0.5 text-xs text-[var(--color-ink-500)]">{m.descricao}</p>}
              </td>
              <td className="p-3 font-mono text-xs text-[var(--color-ink-500)]">{m.slug}</td>
              <td className="p-3 text-center text-[var(--color-ink-700)]">{m.campos.length}</td>
              <td className="p-3 text-center">
                {m.temTemplate ? (
                  <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">DOCX</span>
                ) : (
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">Falta template</span>
                )}
              </td>
              <td className="p-3 text-center">
                {m.embutido ? (
                  <span className="rounded-full bg-[var(--color-brand-50)] px-2.5 py-1 text-xs font-medium text-[var(--color-brand-700)]">Embutido</span>
                ) : m.ativo ? (
                  <span className="rounded-full bg-[var(--color-brand-50)] px-2.5 py-1 text-xs font-medium text-[var(--color-brand-700)]">Ativo</span>
                ) : (
                  <span className="rounded-full bg-[var(--color-paper-100)] px-2.5 py-1 text-xs font-medium text-[var(--color-ink-500)]">Inativo</span>
                )}
              </td>
              <td className="p-3 text-center space-x-2">
                {m.embutido ? (
                  <Link
                    href={`/propostas/nova/${m.slug}`}
                    className="inline-flex items-center gap-1 rounded border border-[var(--color-paper-200)] px-2.5 py-1 text-xs text-[var(--color-ink-700)] hover:bg-[var(--color-paper-50)]"
                  >
                    <Plus size={12} />
                    Usar
                  </Link>
                ) : (
                  <>
                    <Link
                      href={`/propostas/modelos/${m.id}/editar`}
                      className="inline-flex items-center gap-1 rounded border border-[var(--color-paper-200)] px-2.5 py-1 text-xs text-[var(--color-ink-700)] hover:bg-[var(--color-paper-50)]"
                    >
                      <Pencil size={12} />
                      Editar
                    </Link>
                    <button
                      onClick={() => handleExcluir(m.id!, m.nome)}
                      className="inline-flex items-center gap-1 rounded border border-red-300 px-2.5 py-1 text-xs text-red-700 hover:bg-red-50"
                    >
                      <Trash2 size={12} />
                      Excluir
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
