"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Topbar } from "@/components/Topbar";
import { useToast } from "@/components/Toast";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import {
  FileText, Download, Edit3, Trash2, Loader2, Search,
  FileStack, Building2, Calendar, AlertTriangle, X,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TEMPLATES } from "@/lib/templates";

interface DocGerado {
  id: number;
  templateSlug: string;
  createdAt: string;
  caminho: string | null;
  cliente: { id: number; apelido: string; razaoSocial: string };
  empreendimento: { id: number; apelido: string } | null;
}

const SLUG_LABELS: Record<string, string> = Object.fromEntries(
  TEMPLATES.map((t) => [t.slug, t.nome])
);

export default function DocumentosGeradosPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [docs, setDocs] = useState<DocGerado[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroTemplate, setFiltroTemplate] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const carregarDocs = useCallback(async () => {
    setCarregando(true);
    try {
      const params = new URLSearchParams();
      if (busca) params.set("q", busca);
      if (filtroTemplate) params.set("template", filtroTemplate);
      const res = await fetch(`/api/documentos-gerados?${params}`);
      if (res.ok) {
        setDocs(await res.json());
      } else {
        toast("Falha ao carregar documentos", "error");
      }
    } catch {
      toast("Falha ao carregar documentos", "error");
    } finally {
      setCarregando(false);
    }
  }, [busca, filtroTemplate, toast]);

  useEffect(() => {
    carregarDocs();
  }, [carregarDocs]);

  async function handleDelete() {
    if (!confirmDeleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/documentos-gerados/${confirmDeleteId}`, { method: "DELETE" });
      if (!res.ok) {
        toast("Erro ao excluir documento", "error");
        return;
      }
      toast("Documento excluido com sucesso", "success");
      setConfirmDeleteId(null);
      carregarDocs();
    } catch {
      toast("Erro ao excluir documento", "error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <Breadcrumbs items={[{ label: "Documentos Gerados" }]} />
      <Topbar
        icon={FileStack}
        title="Documentos Gerados"
        subtitle="Documentos gerados a partir de modelos — edite, baixe ou importe dados"
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <label className="mb-1 block text-xs font-medium text-[var(--color-ink-500)]">Buscar</label>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-400)]" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Nome do cliente..."
              className="w-full rounded-lg border border-[var(--color-paper-200)] py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
            />
          </div>
        </div>
        <div className="w-48">
          <label className="mb-1 block text-xs font-medium text-[var(--color-ink-500)]">Modelo</label>
          <select
            value={filtroTemplate}
            onChange={(e) => setFiltroTemplate(e.target.value)}
            className="w-full rounded-lg border border-[var(--color-paper-200)] px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
          >
            <option value="">Todos</option>
            {TEMPLATES.map((t) => (
              <option key={t.slug} value={t.slug}>{t.nome}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="shadow-card overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-paper-50)]">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-[var(--color-ink-500)]">Modelo</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--color-ink-500)]">Cliente</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--color-ink-500)]">Empreendimento</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--color-ink-500)]">Data</th>
              <th className="px-4 py-3 text-right font-medium text-[var(--color-ink-500)]">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {carregando ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-[var(--color-ink-500)]">
                  <Loader2 size={18} className="mr-2 inline animate-spin" /> Carregando...
                </td>
              </tr>
            ) : docs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-[var(--color-ink-500)]">
                  <FileText size={24} className="mx-auto mb-2 text-[var(--color-ink-300)]" />
                  <p>Nenhum documento gerado encontrado.</p>
                </td>
              </tr>
            ) : (
              docs.map((d) => (
                <tr key={d.id} className="border-t border-[var(--color-paper-100)] hover:bg-[var(--color-paper-50)]">
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-brand-50)] px-2.5 py-1 text-xs font-medium text-[var(--color-brand-700)]">
                      <FileStack size={12} />
                      {SLUG_LABELS[d.templateSlug] || d.templateSlug}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/clientes/${d.cliente.id}`} className="font-medium text-[var(--color-ink-900)] hover:text-[var(--color-brand-600)]">
                      {d.cliente.apelido}
                    </Link>
                    <p className="text-xs text-[var(--color-ink-500)] truncate max-w-[200px]">{d.cliente.razaoSocial}</p>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-ink-700)]">
                    {d.empreendimento?.apelido || <span className="text-[var(--color-ink-400)]">—</span>}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-ink-500)]">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={13} />
                      {format(new Date(d.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/documentos-gerados/${d.id}/editar`}
                        title="Editar"
                        className="rounded p-1.5 text-[var(--color-ink-400)] hover:bg-[var(--color-brand-50)] hover:text-[var(--color-brand-600)]"
                      >
                        <Edit3 size={15} />
                      </Link>
                      <a
                        href={`/api/documentos-gerados/${d.id}`}
                        title="Baixar"
                        className="rounded p-1.5 text-[var(--color-ink-400)] hover:bg-[var(--color-brand-50)] hover:text-[var(--color-brand-600)]"
                      >
                        <Download size={15} />
                      </a>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(d.id)}
                        title="Excluir"
                        className="rounded p-1.5 text-[var(--color-ink-400)] hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {confirmDeleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-[var(--color-ink-900)]">Excluir documento gerado</h3>
                <p className="mt-1 text-sm text-[var(--color-ink-500)]">
                  Tem certeza? O arquivo sera removido permanentemente.
                </p>
              </div>
              <button onClick={() => setConfirmDeleteId(null)} className="shrink-0 text-[var(--color-ink-400)] hover:text-[var(--color-ink-600)]">
                <X size={18} />
              </button>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="rounded-lg border border-[var(--color-paper-200)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]"
                disabled={deleting}
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting && <Loader2 size={14} className="animate-spin" />}
                {deleting ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
