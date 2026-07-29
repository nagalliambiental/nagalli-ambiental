"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Topbar } from "@/components/Topbar";
import { Loader2, Save, ArrowLeft } from "lucide-react";

interface FieldConfig {
  name: string;
  label: string;
  type: "text" | "select" | "textarea" | "date" | "number" | "checkbox";
  required?: boolean;
  options?: { value: string; label: string }[];
}

interface EditEntityFormProps {
  entity: string;
  entityName: string;
  endpoint: string;
  redirectTo: string;
  fields: FieldConfig[];
  data: Record<string, unknown>;
}

export default function EditEntityForm({
  entity,
  entityName,
  endpoint,
  redirectTo,
  fields,
  data,
}: EditEntityFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<Record<string, string | boolean>>(() => {
    const initial: Record<string, string | boolean> = {};
    for (const f of fields) {
      const val = data[f.name];
      if (f.type === "checkbox") {
        initial[f.name] = Boolean(val);
      } else if (f.type === "date" && val) {
        const d = new Date(val as string);
        initial[f.name] = d.toISOString().split("T")[0];
      } else {
        initial[f.name] = val != null ? String(val) : "";
      }
    }
    return initial;
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const body: Record<string, unknown> = {};
      for (const f of fields) {
        let val: unknown = form[f.name];
        if (f.type === "checkbox") val = Boolean(val);
        else if (f.type === "number") val = Number(val);
        else if (f.type === "date" && val) val = new Date(val as string).toISOString();
        else if (val === "" && !f.required) val = null;
        body[f.name] = val;
      }

      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error || `Erro ao atualizar ${entityName}`);
        return;
      }

      router.push(redirectTo);
      router.refresh();
    } catch {
      setError(`Erro ao atualizar ${entityName}`);
    } finally {
      setSaving(false);
    }
  }

  function setField(name: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  return (
    <div>
      <Topbar
        title={`Editar ${entityName}`}
        actions={
          <button
            type="button"
            onClick={() => router.push(redirectTo)}
            className="focus-ring transition-brand flex items-center gap-2 rounded-lg border border-[var(--color-paper-200)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]"
          >
            <ArrowLeft size={16} />
            Voltar
          </button>
        }
      />
      <div className="mx-auto max-w-3xl">
        <form onSubmit={handleSubmit} className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-6 space-y-5">
          <div className="grid grid-cols-2 gap-5">
            {fields.map((f) => (
              <div key={f.name} className={f.type === "textarea" ? "col-span-2" : ""}>
                <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1.5">
                  {f.label}
                  {f.required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                {f.type === "checkbox" ? (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(form[f.name])}
                      onChange={(e) => setField(f.name, e.target.checked)}
                      className="accent-[var(--color-brand-500)] w-4 h-4"
                    />
                    <span className="text-sm text-[var(--color-ink-500)]">{form[f.name] ? "Sim" : "Não"}</span>
                  </label>
                ) : f.type === "select" ? (
                  <select
                    value={form[f.name] as string || ""}
                    onChange={(e) => setField(f.name, e.target.value)}
                    className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
                    required={f.required}
                  >
                    <option value="">Selecione...</option>
                    {(f.options || []).map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                ) : f.type === "textarea" ? (
                  <textarea
                    value={form[f.name] as string || ""}
                    onChange={(e) => setField(f.name, e.target.value)}
                    rows={5}
                    className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
                  />
                ) : (
                  <input
                    type={f.type === "date" ? "date" : f.type === "number" ? "number" : "text"}
                    value={form[f.name] as string || ""}
                    onChange={(e) => setField(f.name, e.target.value)}
                    className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
                    required={f.required}
                  />
                )}
              </div>
            ))}
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-[var(--color-paper-200)]">
            <button
              type="submit"
              disabled={saving}
              className="focus-ring transition-brand flex items-center gap-2 rounded-[var(--radius-card)] bg-[var(--color-brand-500)] px-6 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)] disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? "Salvando..." : "Salvar"}
            </button>
            <button
              type="button"
              onClick={() => router.push(redirectTo)}
              className="focus-ring transition-brand rounded-lg border border-[var(--color-paper-200)] bg-white px-6 py-2.5 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
