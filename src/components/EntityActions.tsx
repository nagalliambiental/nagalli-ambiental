"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Edit3, Trash2, Loader2, AlertTriangle, X, Save } from "lucide-react";

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

export default function EntityActions({
  entity,
  entityName,
  endpoint,
  redirectTo,
  fields,
  data,
}: EntityActionsProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const f of fields) {
      const val = data[f.name];
      if (f.type === "date" && val) {
        const d = new Date(val as string);
        initial[f.name] = d.toISOString().split("T")[0];
      } else {
        initial[f.name] = val != null ? String(val) : "";
      }
    }
    return initial;
  });

  async function handleSave() {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {};
      for (const f of fields) {
        let val: unknown = form[f.name];
        if (f.type === "number") val = Number(val);
        if (f.type === "date" && val) val = new Date(val as string).toISOString();
        if (val === "" && !f.required) val = null;
        body[f.name] = val;
      }

      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || `Erro ao atualizar ${entity}`);
        return;
      }

      setEditing(false);
      router.refresh();
    } catch {
      alert(`Erro ao atualizar ${entity}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(endpoint, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || `Erro ao excluir ${entity}`);
        setDeleting(false);
        return;
      }
      router.push(redirectTo);
      router.refresh();
    } catch {
      alert(`Erro ao excluir ${entity}`);
      setDeleting(false);
    }
  }

  return (
    <div className="border-t border-[var(--color-paper-200)] pt-4 mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[var(--color-ink-900)]">Ações</h3>
        {!editing && (
          <div className="flex gap-2">
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 rounded-lg bg-[var(--color-brand-500)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--color-brand-600)]"
            >
              <Edit3 size={14} /> Editar
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
            >
              <Trash2 size={14} /> Excluir
            </button>
          </div>
        )}
      </div>

      {editing && (
        <div className="space-y-3 rounded-lg border border-[var(--color-paper-200)] bg-[var(--color-paper-50)] p-4">
          <p className="text-xs font-medium text-[var(--color-ink-500)]">Editando {entityName}</p>
          <div className="grid grid-cols-2 gap-3">
            {fields.map((f) => (
              <div key={f.name} className={f.type === "textarea" ? "col-span-2" : ""}>
                <label className="block text-xs font-medium text-[var(--color-ink-700)] mb-1">{f.label}</label>
                {f.type === "select" ? (
                  <select
                    value={form[f.name] || ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, [f.name]: e.target.value }))}
                    className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
                    required={f.required}
                  >
                    <option value="">Selecione...</option>
                    {(f.options || []).map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                ) : f.type === "textarea" ? (
                  <textarea
                    value={form[f.name] || ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, [f.name]: e.target.value }))}
                    rows={3}
                    className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
                  />
                ) : (
                  <input
                    type={f.type === "date" ? "date" : f.type === "number" ? "number" : "text"}
                    value={form[f.name] || ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, [f.name]: e.target.value }))}
                    className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
                    required={f.required}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-[var(--color-brand-500)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--color-brand-600)] disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? "Salvando..." : "Salvar"}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

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
