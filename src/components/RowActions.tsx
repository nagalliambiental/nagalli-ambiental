"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, Edit3, Trash2, Loader2, AlertTriangle, X } from "lucide-react";
import { useToast } from "@/components/Toast";

interface RowActionsProps {
  detailUrl: string;
  entity: string;
  entityName: string;
  endpoint: string;
  editUrl?: string;
}

export default function RowActions({ detailUrl, entity, entityName, endpoint, editUrl }: RowActionsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(endpoint, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast(err.error || `Erro ao excluir ${entity}`, "error");
        setDeleting(false);
        setConfirmDelete(false);
        return;
      }
      toast(`${entityName} excluído(a) com sucesso`, "success");
      router.refresh();
    } catch {
      toast(`Erro ao excluir ${entity}`, "error");
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-1">
        <Link href={detailUrl} className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-[var(--color-brand-600)] hover:bg-[var(--color-brand-50)] transition-colors" title="Detalhes">
          <Eye size={14} />
          <span className="hidden sm:inline">Detalhes</span>
        </Link>
        {editUrl !== undefined ? (
          <Link href={editUrl} className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-[var(--color-ink-600)] hover:bg-[var(--color-paper-100)] transition-colors" title="Editar">
            <Edit3 size={14} />
            <span className="hidden sm:inline">Editar</span>
          </Link>
        ) : <span className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-[var(--color-ink-300)] pointer-events-none">
          <Edit3 size={14} />
          <span className="hidden sm:inline">Editar</span>
        </span>}
        <button onClick={() => setConfirmDelete(true)} className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors" title="Excluir">
          <Trash2 size={14} />
          <span className="hidden sm:inline">Excluir</span>
        </button>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-[var(--color-ink-900)]">Excluir {entityName}</h3>
                <p className="mt-1 text-sm text-[var(--color-ink-500)]">Tem certeza? Esta ação não pode ser desfeita.</p>
              </div>
              <button onClick={() => setConfirmDelete(false)} className="shrink-0 text-[var(--color-ink-400)] hover:text-[var(--color-ink-600)]">
                <X size={18} />
              </button>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(false)} className="rounded-lg border border-[var(--color-paper-200)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]" disabled={deleting}>
                Cancelar
              </button>
              <button onClick={handleDelete} disabled={deleting} className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                {deleting && <Loader2 size={14} className="animate-spin" />}
                {deleting ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
