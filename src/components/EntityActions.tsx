"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Edit3, Trash2, Loader2, AlertTriangle, X } from "lucide-react";
import { useToast } from "@/components/Toast";

interface FieldConfig {
  name: string;
  label: string;
  type: "text" | "select" | "textarea" | "date" | "number";
  required?: boolean;
  options?: { value: string; label: string }[];
}

interface EntityActionsProps {
  entity: string;
  entityName: string;
  endpoint: string;
  redirectTo: string;
  fields: FieldConfig[];
  data: Record<string, unknown>;
}

function editUrlFromEndpoint(endpoint: string): string {
  const match = endpoint.match(/\/api\/(.+?)\/(\d+)/);
  if (match) {
    const base = match[1];
    const id = match[2];
    return `/${base}/${id}/editar`;
  }
  return "#";
}

export default function EntityActions({
  entity,
  entityName,
  endpoint,
  redirectTo,
}: EntityActionsProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { toast } = useToast();

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(endpoint, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast(err.error || `Erro ao excluir ${entity}`, "error");
        setDeleting(false);
        return;
      }
      toast(`${entityName} excluído(a) com sucesso`, "success");
      router.push(redirectTo);
      router.refresh();
    } catch {
      toast(`Erro ao excluir ${entity}`, "error");
      setDeleting(false);
    }
  }

  return (
    <div className="border-t border-[var(--color-paper-200)] pt-4 mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[var(--color-ink-900)]">Ações</h3>
        <div className="flex gap-2">
          <Link
            href={editUrlFromEndpoint(endpoint)}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--color-brand-500)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--color-brand-600)]"
          >
            <Edit3 size={14} /> Editar
          </Link>
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
          >
            <Trash2 size={14} /> Excluir
          </button>
        </div>
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
    </div>
  );
}
